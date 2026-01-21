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
    """
    Updated sync function that uses the corrected API calls.
    """
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student or not student.github_username:
            return
        
        username = student.github_username.strip().rstrip('/').strip('@').split('/')[-1]
        
        print(f"--- Starting Sync for student: {username} ---")
        
        # 1. Get stats for "all time" (or year) period to update main profile
        stats = await tracker_service.get_complete_student_stats(username, period="year")
        
        # 2. Fetch avatar and profile info manually if missing
        if not student.avatar_url or not student.profile_url:
            async with httpx.AsyncClient(headers=tracker_service.headers, timeout=10.0) as client:
                resp = await client.get(f"{tracker_service.base_url}/users/{username}")
                if resp.status_code == 200:
                    user_info = resp.json()
                    student.name = student.name or user_info.get("name") or username
                    student.avatar_url = user_info.get("avatar_url")
                    student.profile_url = user_info.get("html_url")
        
        # 3. Update student record with fresh data from stats
        student.total_commits = stats["total_commits"]
        student.pull_requests = stats["pull_requests"]
        student.repo_count = stats["repo_count"]
        student.active_days = stats["active_days"]
        student.activity_score = stats["activity_score"]
        student.last_updated = datetime.utcnow()
        
        # 4. Update daily breakdown for the last 7 days
        daily_counts = await tracker_service.get_daily_commit_counts(username, days=7)
        
        for date_str, count in daily_counts.items():
            log = db.query(ActivityLog).filter(
                ActivityLog.student_id == student_id,
                ActivityLog.date_str == date_str
            ).first()
            
            if log:
                log.commits_count = count
            else:
                log = ActivityLog(
                    student_id=student_id,
                    date_str=date_str,
                    commits_count=count
                )
                db.add(log)
        
        db.commit()
        print(f"Sync complete for {username}. Total Commits: {student.total_commits}, Score: {student.activity_score}")

        # LeetCode Sync
        user_record = db.query(User).filter(User.email == student.email).first()
        if user_record and user_record.leetcode_username:
            lc_stats = await leetcode_service.get_user_stats(user_record.leetcode_username)
            if lc_stats:
                student.leetcode_solved = lc_stats["total_solved"]
                student.leetcode_rating = lc_stats["ranking"] or 0
                db.commit()

    except Exception as e:
        print(f"Error updating student {student_id}: {str(e)}")
        db.rollback()
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
    else: 
        return "2000-01-01"
    return cutoff.strftime("%Y-%m-%d")

@router.post("/", response_model=StudentRead)
async def add_student(student: StudentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_username = student.github_username.strip().rstrip('/').split('/')[-1]
    
    # Check if student already exists in tracking
    db_student = db.query(Student).filter(Student.github_username == clean_username).first()
    if db_student: 
        raise HTTPException(status_code=400, detail="Student already tracked in registry")
    
    import secrets
    from services.notifications import notification_service
    from routers.auth import hash_password
    
    # Password set to Roll Number (student_id) as per user request
    if not student.student_id:
        raise HTTPException(status_code=400, detail="Student ID (Roll Number) is required to set login password")
        
    password_to_use = str(student.student_id).strip()
    hashed_pw = hash_password(password_to_use)
    
    # Check if User already exists
    existing_user = db.query(User).filter((User.github_username == clean_username) | (User.email == student.email)).first()
    
    if not existing_user:
        # Create User record for the dashboard
        new_user = User(
            name=student.name,
            email=student.email,
            github_username=clean_username,
            student_id=student.student_id,
            department=student.department,
            role="student",
            password_hash=hashed_pw,
            password_reset_required=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    
    # Create Student record for tracking
    new_student = Student(**student.dict())
    new_student.github_username = clean_username
    new_student.password_hash = hashed_pw
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    # Trigger background sync for this student
    background_tasks.add_task(update_student_data, new_student.id)
    
    if new_student.email and new_student.email.lower() != 'nan':
        background_tasks.add_task(
            notification_service.send_welcome_email,
            new_student.name, new_student.email, password_to_use
        )
        
    return new_student

@router.get("/", response_model=List[StudentRead])
async def read_students(
    classroom_id: Optional[int] = None, 
    period: str = "monthly", 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    Returns students with stats filtered by period.
    Period can be: "all", "year", "monthly", "weekly", "today" or "custom"
    """
    query = db.query(Student).filter(Student.status == "active")
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    students = query.all()
    
    # Map periods to match GitHubTrackerService expectation
    tracker_period = "all"
    if period == "weekly": tracker_period = "week"
    elif period == "monthly": tracker_period = "month"
    elif period == "year": tracker_period = "year"
    
    results = []
    for s in students:
        if not s.github_username:
            continue
        
        # Get stats for the requested period from Tracker Service (Fresh)
        # Handle custom date range if needed
        if period == "custom" and start_date and end_date:
            commits = await tracker_service.get_commit_count_for_period(s.github_username, start_date, end_date)
            prs = await tracker_service.get_pull_request_count(s.github_username, start_date, end_date)
            active_days = await tracker_service.get_active_days_count(s.github_username, start_date, end_date)
            repos = s.repo_count # Repo count is overall
        else:
            stats = await tracker_service.get_complete_student_stats(s.github_username, period=tracker_period)
            commits = stats["total_commits"]
            prs = stats["pull_requests"]
            repos = stats["repo_count"]
            active_days = stats["active_days"]
        
        results.append({
            "id": s.id, 
            "name": s.name, 
            "github_username": s.github_username,
            "profile_url": s.profile_url, 
            "avatar_url": s.avatar_url,
            "total_commits": commits, 
            "pull_requests": prs, 
            "issues": 0, # Search API issues not implemented yet, but keeping for schema compat
            "reviews": 0,
            "repo_count": repos, 
            "total_events": commits + prs,
            "activity_score": (commits * 2) + (prs * 3) + (active_days * 1),
            "active_days": active_days, 
            "last_updated": s.last_updated,
            "classroom_id": s.classroom_id, 
            "student_id": s.student_id, 
            "email": s.email, 
            "status": s.status
        })
    
    # Sort by Activity Score Descending
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
            dept = str(row.get('Department', row.get('department', row.get('dept', '')))).strip()
            
            if not github or github.lower() == 'nan': continue
            clean_username = github.rstrip('/').strip('@').split('/')[-1]
            if not clean_username: continue
            
            exists = db.query(Student).filter(Student.github_username == clean_username).first()
            if not exists:
                import secrets
                from services.notifications import notification_service
                from routers.auth import hash_password
                
                # Password set to Roll Number (student_id) as per user request
                password_to_use = sid if sid and sid.lower() != 'nan' else secrets.token_urlsafe(8)
                hashed_pw = hash_password(password_to_use)
                
                # Check if User already exists (by email or github)
                existing_user = db.query(User).filter((User.github_username == clean_username) | (User.email == email)).first()
                if not existing_user:
                    # Create User record
                    new_user = User(
                        name=name,
                        email=email,
                        github_username=clean_username,
                        student_id=sid,
                        department=dept,
                        role="student",
                        password_hash=hashed_pw,
                        password_reset_required=True
                    )
                    db.add(new_user)
                    db.commit()

                # Create Student record
                new_student = Student(
                    github_username=clean_username, 
                    name=name, 
                    student_id=sid, 
                    email=email, 
                    classroom_id=classroom_id,
                    password_hash=hashed_pw
                )
                db.add(new_student)
                db.commit()
                
                # Trigger background sync for this student
                db.refresh(new_student)
                background_tasks.add_task(update_student_data, new_student.id)
                
                if email and email.lower() != 'nan':
                    background_tasks.add_task(
                        notification_service.send_welcome_email,
                        name, email, password_to_use
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
