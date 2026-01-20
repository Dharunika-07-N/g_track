from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from database import SessionLocal, Student, ActivityLog, Classroom, User
from schemas import StudentCreate, StudentRead
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
from services.tracker import tracker_service
from services.leetcode import leetcode_service
from sqlalchemy import func
import pandas as pd
import io

router = APIRouter(prefix="/students", tags=["students"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def update_student_data(student_id: int):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student: return
        
        print(f"--- Starting Sync for student: {student.github_username} ---")
        
        # GitHub Sync
        clean_username = student.github_username.strip().strip('@').split('/')[-1]
        data = await tracker_service.analyze_user(clean_username)
        
        if data:
            print(f"Data received for {clean_username}: {data['stats']}")
            student.name = student.name or data["name"]
            student.avatar_url = data["avatar_url"]
            student.profile_url = data["profile_url"]
            daily_stats = data.get("daily_stats", {})
            for day_str, d_data in daily_stats.items():
                log = db.query(ActivityLog).filter(ActivityLog.student_id == student.id, ActivityLog.date_str == day_str).first()
                if not log:
                    log = ActivityLog(student_id=student.id, date_str=day_str)
                    db.add(log)
                log.commits_count = d_data["commits"]
                log.pr_count = d_data["prs"]
                log.issue_count = d_data["issues"]
                log.review_count = d_data["reviews"]
            db.commit()
            
            # Refresh logs to get accurate totals
            db.refresh(student)
            
            student.total_commits = sum(l.commits_count for l in student.logs)
            student.pull_requests = sum(l.pr_count for l in student.logs)
            student.issues = sum(l.issue_count for l in student.logs)
            student.reviews = sum(l.review_count for l in student.logs)
            student.repo_count = data["stats"]["repo_count"]
            student.total_events = data["stats"]["total_events"]
            student.active_days = len(student.logs)
            student.last_updated = datetime.utcnow()
            student.activity_score = (student.total_commits * 2) + (student.pull_requests * 3) + (student.active_days * 1)
            print(f"Score updated for {clean_username}: {student.activity_score}")
        else:
            print(f"FAILED to fetch data for {clean_username}. Is GITHUB_TOKEN set correctly?")
        
        # LeetCode Sync
        user_record = db.query(User).filter(User.email == student.email).first()
        if user_record and user_record.leetcode_username:
            print(f"Fetching LeetCode data for {user_record.leetcode_username}...")
            lc_stats = await leetcode_service.get_user_stats(user_record.leetcode_username)
            if lc_stats:
                student.leetcode_solved = lc_stats["total_solved"]
                student.leetcode_rating = lc_stats["ranking"] or 0
                print(f"LeetCode status updated for {user_record.leetcode_username}")
        
        db.commit()
    except Exception as e:
        print(f"Error updating student {student_id}: {str(e)}")
    finally:
        db.close()

def get_period_cutoff(period: str) -> str:
    now = datetime.utcnow()
    if period == "today": 
        return now.strftime("%Y-%m-%d")
    elif period == "weekly": 
        cutoff = now - timedelta(days=7)
    elif period == "monthly": 
        cutoff = now - timedelta(days=30)
    elif period == "yearly": 
        cutoff = now - timedelta(days=365)
    else: 
        return "2000-01-01"
    return cutoff.strftime("%Y-%m-%d")

@router.post("/", response_model=StudentRead)
async def add_student(student: StudentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_username = student.github_username.strip().rstrip('/').split('/')[-1]
    db_student = db.query(Student).filter(Student.github_username == clean_username).first()
    if db_student: raise HTTPException(status_code=400, detail="Student already tracked")
    
    import secrets
    from services.notifications import notification_service
    from routers.auth import hash_password
    
    temp_password = secrets.token_urlsafe(10)
    
    new_student = Student(**student.dict())
    new_student.github_username = clean_username
    new_student.password_hash = hash_password(temp_password)
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    # Trigger background sync for this student
    background_tasks.add_task(update_student_data, new_student.id)
    
    if new_student.email and new_student.email.lower() != 'nan':
        background_tasks.add_task(
            notification_service.send_welcome_email,
            new_student.name, new_student.email, temp_password
        )
        
    return new_student

@router.get("/", response_model=List[StudentRead])
def read_students(
    classroom_id: Optional[int] = None, 
    period: str = "monthly", 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    # Handle custom date range
    if period == "custom" and start_date and end_date:
        cutoff_start = start_date
        cutoff_end = end_date
    else:
        cutoff_start = get_period_cutoff(period)
        cutoff_end = datetime.utcnow().strftime("%Y-%m-%d")
    
    query = db.query(Student)
    if classroom_id: query = query.filter(Student.classroom_id == classroom_id)
    students = query.all()
    results = []
    for s in students:
        logs_summary = db.query(
            func.sum(ActivityLog.commits_count).label("commits"),
            func.sum(ActivityLog.pr_count).label("prs"),
            func.sum(ActivityLog.issue_count).label("issues"),
            func.sum(ActivityLog.review_count).label("reviews"),
            func.count(ActivityLog.id).label("active_days")
        ).filter(
            ActivityLog.student_id == s.id, 
            ActivityLog.date_str >= cutoff_start,
            ActivityLog.date_str <= cutoff_end
        ).first()
        
        commits = logs_summary.commits or 0
        prs = logs_summary.prs or 0
        issues = logs_summary.issues or 0
        reviews = logs_summary.reviews or 0
        active_days = logs_summary.active_days or 0
        
        results.append({
            "id": s.id, "name": s.name, "github_username": s.github_username,
            "profile_url": s.profile_url, "avatar_url": s.avatar_url,
            "total_commits": commits, "pull_requests": prs, "issues": issues, "reviews": reviews,
            "repo_count": s.repo_count, "total_events": commits + prs + issues + reviews,
            "activity_score": (commits * 2) + (prs * 3) + (active_days * 1),
            "active_days": active_days, "last_updated": s.last_updated,
            "classroom_id": s.classroom_id, "student_id": s.student_id, "email": s.email, "status": s.status
        })
    results.sort(key=lambda x: x["activity_score"], reverse=True)
    return results[skip:skip+limit]

@router.post("/{student_id}/refresh")
async def refresh_student(student_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    background_tasks.add_task(update_student_data, student.id)
    return {"message": "Update scheduled"}

@router.post("/upload")
async def upload_students(background_tasks: BackgroundTasks, file: UploadFile = File(...), classroom_id: Optional[int] = None, db: Session = Depends(get_db)):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')): raise HTTPException(status_code=400, detail="Invalid file type")
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'): df = pd.read_csv(io.BytesIO(contents))
        else: df = pd.read_excel(io.BytesIO(contents))
        
        added_count = 0
        for _, row in df.iterrows():
            name = str(row.get('Name', row.get('name', 'Unknown'))).strip()
            github = str(row.get('GitHub', row.get('github', row.get('username', '')))).strip()
            sid = str(row.get('ID', row.get('student_id', ''))).strip()
            email = str(row.get('Email', row.get('email', ''))).strip()
            
            if not github or github.lower() == 'nan': continue
            clean_username = github.rstrip('/').strip('@').split('/')[-1]
            if not clean_username: continue
            
            exists = db.query(Student).filter(Student.github_username == clean_username).first()
            if not exists:
                import secrets
                from services.notifications import notification_service
                from routers.auth import hash_password
                
                temp_password = secrets.token_urlsafe(10)
                
                new_student = Student(
                    github_username=clean_username, 
                    name=name, 
                    student_id=sid, 
                    email=email, 
                    classroom_id=classroom_id,
                    password_hash=hash_password(temp_password)
                )
                db.add(new_student)
                db.commit()
                
                # Trigger background sync for this student
                background_tasks.add_task(update_student_data, new_student.id)
                db.refresh(new_student)
                background_tasks.add_task(update_student_data, new_student.id)
                
                if email and email.lower() != 'nan':
                    background_tasks.add_task(
                        notification_service.send_welcome_email,
                        name, email, temp_password
                    )
                
                added_count += 1
        return {"message": f"Added {added_count} students"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{student_id}")
async def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    # Archive instead of delete
    student.status = "archived"
    db.commit()
    return {"message": "Student archived"}

class BulkDeleteRequest(BaseModel):
    student_ids: List[int]

@router.post("/bulk-delete")
async def bulk_delete_students(request: BulkDeleteRequest, db: Session = Depends(get_db)):
    db.query(Student).filter(Student.id.in_(request.student_ids)).update({Student.status: "archived"}, synchronize_session=False)
    db.commit()
    return {"message": "Selected students archived"}

@router.post("/sync-all")
async def sync_all_students(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    students = db.query(Student).filter(Student.status == "active").all()
    for s in students:
        background_tasks.add_task(update_student_data, s.id)
    return {"message": f"Sync scheduled for {len(students)} students"}
