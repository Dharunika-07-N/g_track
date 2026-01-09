from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from database import SessionLocal, Student, ActivityLog, init_db
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio
from typing import List, Optional
import pandas as pd
import io

# Import the service
from services.tracker import tracker_service

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting up...")
    scheduler.start()
    # Trigger initial update immediately
    await scheduled_update_all()
    yield
    # Shutdown
    print("Application shutting down...")
    scheduler.shutdown()

app = FastAPI(title="Github Activity Tracker", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

init_db()

class StudentCreate(BaseModel):
    github_username: str
    name: str = "Unknown"

class StudentRead(BaseModel):
    id: int
    name: Optional[str]
    github_username: str
    profile_url: Optional[str]
    avatar_url: Optional[str]
    total_commits: int
    pull_requests: int
    issues: int
    reviews: int
    repo_count: int
    total_events: int
    activity_score: int
    active_days: int = 0
    last_updated: datetime

    class Config:
        from_attributes = True

# --- background tasks ---
async def update_student_data(student_id: int):
    # Create a new session for the background task
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return
            
        print(f"Updating data for student: {student.github_username}")
        data = await tracker_service.analyze_user(student.github_username)
        if data:
            s_stats = data["stats"]
            print(f"Stats found for {student.github_username}: {s_stats}")
            student.name = data["name"]
            student.avatar_url = data["avatar_url"]
            student.profile_url = data["profile_url"]
            
            # Update daily logs
            daily_stats = data.get("daily_stats", {})
            for day_str, d_data in daily_stats.items():
                log = db.query(ActivityLog).filter(
                    ActivityLog.student_id == student.id,
                    ActivityLog.date_str == day_str
                ).first()
                if not log:
                    log = ActivityLog(student_id=student.id, date_str=day_str)
                    db.add(log)
                
                log.commits_count = d_data["commits"]
                log.pr_count = d_data["prs"]
                log.issue_count = d_data["issues"]
                log.review_count = d_data["reviews"]
            
            db.commit() # Save logs
            
            # Recalculate student aggregates (Last 30 days by default for profile view)
            # but we'll keep the student object stats as a "Recent Activity" cache
            student.total_commits = s_stats["commits"]
            student.pull_requests = s_stats["pull_requests"]
            student.issues = s_stats["issues"]
            student.reviews = s_stats["reviews"]
            student.repo_count = s_stats["repo_count"]
            student.total_events = s_stats["total_events"]
            student.active_days = s_stats.get("active_days", 0)
            student.last_updated = datetime.utcnow()
            
            student.activity_score = (student.total_commits * 2) + (student.pull_requests * 3) + (student.active_days * 1)
            
            db.commit()
            print(f"Successfully updated student {student.github_username}")
        else:
            print(f"No data received for student {student.github_username}")
    except Exception as e:
        print(f"Error updating student {student_id}: {e}")
    finally:
        db.close()

def get_period_cutoff(period: str) -> Optional[str]:
    now = datetime.utcnow()
    if period == "weekly":
        cutoff = now - timedelta(days=7)
    elif period == "monthly":
        cutoff = now - timedelta(days=30)
    elif period == "yearly":
        cutoff = now - timedelta(days=365)
    else: # all
        return "2000-01-01" # effectively everything
    return cutoff.strftime("%Y-%m-%d")

from sqlalchemy import func

async def scheduled_update_all():
    print("Executing scheduled poll of all students...")
    db = SessionLocal()
    students = db.query(Student).all()
    s_ids = [s.id for s in students]
    db.close()
    
    for sid in s_ids:
        await update_student_data(sid)
    print("Scheduled poll complete.")

def sync_scheduler_wrapper():
    """Wrapper to run the async scheduled update from the sync APScheduler"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(scheduled_update_all())
        loop.close()
    except Exception as e:
        print(f"Error in sync_scheduler_wrapper: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(sync_scheduler_wrapper, 'interval', minutes=60)



@app.post("/students/", response_model=StudentRead)
async def add_student(student: StudentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Sanitize username (handle profile URLs)
    clean_username = student.github_username.strip().rstrip('/')
    if '/' in clean_username:
        clean_username = clean_username.split('/')[-1]
    
    db_student = db.query(Student).filter(Student.github_username == clean_username).first()
    if db_student:
        raise HTTPException(status_code=400, detail="Student already tracked")
    
    new_student = Student(
        github_username=clean_username,
        name=student.name
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    # Trigger immediate update
    background_tasks.add_task(update_student_data, new_student.id)
    
    return new_student

@app.post("/students/{student_id}/refresh")
async def refresh_student(student_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    background_tasks.add_task(update_student_data, student.id)
    return {"message": "Update scheduled"}

@app.post("/students/upload")
async def upload_students(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are allowed")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Find columns
        name_col = None
        url_col = None
        
        for col in df.columns:
            c_low = str(col).lower()
            if 'name' in c_low and not name_col:
                name_col = col
            if ('github' in c_low or 'url' in c_low or 'profile' in c_low or 'username' in c_low) and not url_col:
                url_col = col
        
        if not name_col or not url_col:
            raise HTTPException(status_code=400, detail=f"Required columns (Name and GitHub URL) not found. Found columns: {list(df.columns)}")
            
        added_count = 0
        for _, row in df.iterrows():
            name = str(row[name_col]).strip()
            url = str(row[url_col]).strip()
            
            if not name or not url or url.lower() == 'nan' or name.lower() == 'nan':
                continue
                
            # Extract username from URL if it's a URL
            clean_username = url.rstrip('/')
            if '/' in clean_username:
                clean_username = clean_username.split('/')[-1]
            
            # Final check to avoid empty or invalid usernames
            if not clean_username or clean_username.lower() == 'nan':
                continue

            # Check if exists
            exists = db.query(Student).filter(Student.github_username == clean_username).first()
            if not exists:
                new_student = Student(github_username=clean_username, name=name)
                db.add(new_student)
                db.commit()
                db.refresh(new_student)
                background_tasks.add_task(update_student_data, new_student.id)
                added_count += 1
                
        return {"message": f"Successfully processed. Added {added_count} new students."}
        
    except Exception as e:
        print(f"Excel upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.delete("/students/{student_id}")
async def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    db.delete(student)
    db.commit()
    return {"message": "Student removed successfully"}

@app.get("/students/", response_model=List[StudentRead])
def read_students(period: str = "monthly", skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cutoff = get_period_cutoff(period)
    
    # We need to aggregate stats from logs for the period
    students = db.query(Student).all()
    results = []
    
    for s in students:
        # Sum logs for the period
        logs = db.query(
            func.sum(ActivityLog.commits_count).label("commits"),
            func.sum(ActivityLog.pr_count).label("prs"),
            func.sum(ActivityLog.issue_count).label("issues"),
            func.sum(ActivityLog.review_count).label("reviews"),
            func.count(ActivityLog.id).label("active_days")
        ).filter(
            ActivityLog.student_id == s.id,
            ActivityLog.date_str >= cutoff
        ).first()
        
        commits = logs.commits or 0
        prs = logs.prs or 0
        issues = logs.issues or 0
        reviews = logs.reviews or 0
        active_days = logs.active_days or 0
        
        # Calculate score for the period
        score = (commits * 2) + (prs * 3) + (active_days * 1)
        
        # Create a transient object or dict that matches StudentRead
        # Actually Pydantic can handle dicts if we return them or a list of objects
        results.append({
            "id": s.id,
            "name": s.name,
            "github_username": s.github_username,
            "profile_url": s.profile_url,
            "avatar_url": s.avatar_url,
            "total_commits": commits,
            "pull_requests": prs,
            "issues": issues,
            "reviews": reviews,
            "repo_count": s.repo_count, # repo count is harder to filter by date without more data
            "total_events": commits + prs + issues + reviews,
            "activity_score": score,
            "active_days": active_days,
            "last_updated": s.last_updated
        })
    
    # Sort results by score desc
    results.sort(key=lambda x: x["activity_score"], reverse=True)
    return results[skip:skip+limit]

@app.get("/dashboard/stats")
def dashboard_stats(period: str = "monthly", db: Session = Depends(get_db)):
    cutoff = get_period_cutoff(period)
    
    total_students = db.query(Student).count()
    # Active = has logs in the period
    active_students = db.query(ActivityLog.student_id).filter(
        ActivityLog.date_str >= cutoff
    ).distinct().count()
    
    # Aggregate all commits in period
    total_commits = db.query(func.sum(ActivityLog.commits_count)).filter(
        ActivityLog.date_str >= cutoff
    ).scalar() or 0
    
    # Top student in period
    top_data = db.query(
        ActivityLog.student_id,
        func.sum(ActivityLog.commits_count*2 + ActivityLog.pr_count*3 + 1).label("score")
    ).filter(
        ActivityLog.date_str >= cutoff
    ).group_by(ActivityLog.student_id).order_by(func.sum(ActivityLog.commits_count*2 + ActivityLog.pr_count*3 + 1).desc()).first()
    
    top_student_name = "None"
    if top_data:
        ts = db.query(Student).filter(Student.id == top_data.student_id).first()
        if ts:
            top_student_name = ts.name

    return {
        "total_students": total_students,
        "active_students": active_students,
        "top_contributor": top_student_name,
        "total_commits": total_commits,
        "github_token_configured": bool(tracker_service.token)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
