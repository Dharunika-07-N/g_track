from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import SessionLocal, Student, ActivityLog, init_db
from pydantic import BaseModel
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio
from typing import List, Optional

# Import the service
from services.tracker import tracker_service

app = FastAPI(title="Github Activity Tracker")

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
    last_updated: datetime

    class Config:
        orm_mode = True

# --- background tasks ---
async def update_student_data(student_id: int):
    # Create a new session for the background task
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            return
            
        data = await tracker_service.analyze_user(student.github_username)
        if data:
            s_stats = data["stats"]
            student.name = data["name"]
            student.avatar_url = data["avatar_url"]
            student.profile_url = data["profile_url"]
            
            student.total_commits = s_stats["commits"]
            student.pull_requests = s_stats["pull_requests"]
            student.issues = s_stats["issues"]
            student.reviews = s_stats["reviews"]
            student.repo_count = s_stats["repo_count"]
            student.total_events = s_stats["total_events"]
            student.last_updated = datetime.utcnow()
            
            # Simple Activity Score Logic from User Request
            # Score = (Commits × 2) + (Pull Requests × 3) + (Active Days × 1)
            # We don't have exact "Active Days" in the simplified stats, using total_events as proxy or just simplified
            # Let's say 1 event roughly implies activity.
            student.activity_score = (student.total_commits * 2) + (student.pull_requests * 3) + (student.issues * 1)
            
            db.commit()
    except Exception as e:
        print(f"Error updating student {student_id}: {e}")
    finally:
        db.close()

def scheduled_update_all():
    # This runs in a thread, so we need to run the async updates carefully
    # simpler to just fetch IDs and spawn tasks or run loop
    db = SessionLocal()
    students = db.query(Student).all()
    s_ids = [s.id for s in students]
    db.close()
    
    # We need to run async code from sync scheduler. 
    # Proper way in FastAPI/Uvicorn is often just triggering it via an event loop if accessible, 
    # but creating a fresh loop for the job is safer or using `asyncio.run`
    async def runner():
        for sid in s_ids:
            await update_student_data(sid)
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we are in the main loop (unlikely for a thread scheduler), create task
            loop.create_task(runner())
        else:
            asyncio.run(runner())
    except RuntimeError:
        asyncio.run(runner())

scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_update_all, 'interval', minutes=60)
scheduler.start()

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()

@app.post("/students/", response_model=StudentRead)
async def add_student(student: StudentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    db_student = db.query(Student).filter(Student.github_username == student.github_username).first()
    if db_student:
        raise HTTPException(status_code=400, detail="Student already tracked")
    
    new_student = Student(
        github_username=student.github_username,
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

@app.get("/students/", response_model=List[StudentRead])
def read_students(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    # Order by activity score desc
    return db.query(Student).order_by(Student.activity_score.desc()).offset(skip).limit(limit).all()

@app.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    # Active = has events in last 30 days (total_events > 0)
    active_students = db.query(Student).filter(Student.total_events > 0).count()
    
    top_student = db.query(Student).order_by(Student.activity_score.desc()).first()
    
    return {
        "total_students": total_students,
        "active_students": active_students,
        "top_contributor": top_student.name if top_student else "None"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
