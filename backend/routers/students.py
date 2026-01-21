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
    
    # Calculate cutoff for DB filtering
    cutoff_date = get_period_cutoff(period)
    
    if period == "custom" and start_date:
        cutoff_date = start_date
        
    results = []
    
    # Pre-fetch activity logs if needed to avoid N+1 (simplified here to loop for clarity/speed of impl, 
    # but could be optimized with a join)
    
    for s in students:
        if not s.github_username:
            continue
            
        commits = 0
        prs = 0
        active_days = 0
        repos = s.repo_count # Repo count is always from student record (snapshot)
        
        if period == "all" or period == "year": # Assuming total_commits in student table is 'all time' or 'year' approx
            commits = s.total_commits
            prs = s.pull_requests
            active_days = s.active_days
        else:
            # Query ActivityLog for specific period
            # For 'custom' or 'monthly'/'weekly'
            stats = db.query(
                func.sum(ActivityLog.commits_count),
                func.sum(ActivityLog.pr_count),
                func.count(ActivityLog.id)
            ).filter(
                ActivityLog.student_id == s.id,
                ActivityLog.date_str >= cutoff_date
            )
            
            if period == "custom" and end_date:
                stats = stats.filter(ActivityLog.date_str <= end_date)
                
            stats_res = stats.first()
            
            commits = stats_res[0] or 0
            prs = stats_res[1] or 0
            active_days = stats_res[2] or 0 # Rough approximation of active days based on log existance
            
        
        # Calculate score dynamically based on the PERIOD stats
        # Formula: (commits * 2) + (prs * 3) + (active_days * 1)
        score = (commits * 2) + (prs * 3) + (active_days * 1)
        
        results.append({
            "id": s.id, 
            "name": s.name, 
            "github_username": s.github_username,
            "profile_url": s.profile_url, 
            "avatar_url": s.avatar_url,
            "total_commits": commits, 
            "pull_requests": prs, 
            "issues": 0, 
            "reviews": 0,
            "repo_count": repos, 
            "total_events": commits + prs,
            "activity_score": score,
            "active_days": active_days, 
            "last_updated": s.last_updated,
            "classroom_id": s.classroom_id, 
            "student_id": s.student_id, 
            "email": s.email, 
            "status": s.status
        })
    
    # Sort by Total Commits Descending, then by Activity Score
    results.sort(key=lambda x: (x["total_commits"], x["activity_score"]), reverse=True)
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
