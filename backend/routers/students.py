from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Query
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
import asyncio
import httpx
from dependencies import require_admin

router = APIRouter(prefix="/students", tags=["students"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_period_cutoff(period: str) -> str:
    today = datetime.utcnow()
    if period == "daily":
        return today.strftime("%Y-%m-%d")
    elif period == "weekly":
        return (today - timedelta(days=7)).strftime("%Y-%m-%d")
    elif period == "monthly":
        return (today - timedelta(days=30)).strftime("%Y-%m-%d")
    return "2000-01-01"

@router.get("/", response_model=List[StudentRead])
async def read_students(
    period: str = "all-time",
    classroom_id: Optional[int] = None, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    # Determine date range for filtering
    start_date = "2000-01-01"
    today = datetime.utcnow().date()
    
    if period == "daily":
        start_date = str(today)
    elif period == "weekly":
        start_date = str(today - timedelta(days=7))
    elif period == "monthly":
        start_date = str(today - timedelta(days=30))
    
    query = db.query(Student).filter(Student.status == "active")
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    
    # If all-time, just return the cached totals (fast path)
    if period == "all-time":
        students = query.order_by(Student.activity_score.desc()).offset(skip).limit(limit).all()
        return students

    # For custom periods, we must aggregate from ActivityLog
    # Fetch base student objects
    students = query.all()
    
    # Aggregate stats from ActivityLog
    logs_summary = db.query(
        ActivityLog.student_id,
        func.sum(ActivityLog.commits_count).label("commits"),
        func.sum(ActivityLog.pr_count).label("prs"),
        func.sum(ActivityLog.issue_count).label("issues"),
        func.sum(ActivityLog.review_count).label("reviews"),
        func.count(ActivityLog.id).label("active_days") # Approximate active days
    ).filter(
        ActivityLog.date_str >= start_date
    ).group_by(ActivityLog.student_id).all()
    
    # Create a map for fast lookup
    stats_map = {
        row.student_id: {
            "commits": row.commits or 0,
            "prs": row.prs or 0,
            "issues": row.issues or 0,
            "reviews": row.reviews or 0,
            "active_days": row.active_days or 0
        }
        for row in logs_summary
    }
    
    # Construct response objects with overwritten stats
    results = []
    for s in students:
        stat = stats_map.get(s.id, {"commits": 0, "prs": 0, "issues": 0, "reviews": 0, "active_days": 0})
        
        # Calculate scores dynamically
        score = (stat["commits"] * 2) + (stat["prs"] * 3) + (stat["active_days"] * 1)
        
        # We create a dictionary representation first
        s_dict = {
            "id": s.id,
            "name": s.name,
            "github_username": s.github_username,
            "student_id": s.student_id,
            "email": s.email,
            "department": s.department,
            "classroom_id": s.classroom_id,
            "profile_url": s.profile_url,
            "avatar_url": s.avatar_url,
            "status": s.status,
            "last_updated": s.last_updated,
            
            # Dynamic fields
            "total_contributions": stat["commits"], 
            "total_commits": stat["commits"], # For now keep them same if logs only have total
            "pull_requests": stat["prs"],
            "issues": stat["issues"],
            "reviews": stat["reviews"],
            "repo_count": s.repo_count, # Repo count is hard to track over time, keeping static
            "total_events": stat["commits"] + stat["prs"] + stat["issues"] + stat["reviews"],
            "active_days": stat["active_days"],
            "activity_score": score
        }
        results.append(s_dict)
    
    # Sort by activity score descending (in Python since we modified the values)
    results.sort(key=lambda x: x["activity_score"], reverse=True)
    
    # Pagination
    paginated_results = results[skip : skip + limit]
    return paginated_results

async def update_student_data_background(student_id: int, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Background task to sync student data.
    """
    # Use dynamic dates if not provided
    if not start_date:
        start_date = "2025-12-01" # Semester Start
    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student or not student.github_username:
            return
        
        # Clean username
        username = student.github_username.strip().rstrip('/').strip('@').split('/')[-1]
        
        # Fetch fresh data from GitHub for the custom range
        stats = await tracker_service.get_complete_student_stats(
            username=username,
            start_date=start_date,
            end_date=end_date,
            period="custom"
        )
        
        # Update student record (Totals)
        student.total_commits = stats["total_commits"]
        student.total_contributions = stats.get("total_contributions", student.total_commits)
        student.pull_requests = stats["pull_requests"]
        student.repo_count = stats["repo_count"]
        student.active_days = stats["active_days"]
        student.activity_score = stats["activity_score"]
        student.last_updated = datetime.utcnow()
        
        # Also update avatar/profile if missing
        if not student.avatar_url or not student.profile_url:
            async with httpx.AsyncClient(headers=tracker_service.headers, timeout=10.0) as client:
                resp = await client.get(f"{tracker_service.base_url}/users/{username}")
                if resp.status_code == 200:
                    user_info = resp.json()
                    student.avatar_url = user_info.get("avatar_url")
                    student.profile_url = user_info.get("html_url")
        
        # ---------------------------------------------------------
        # CRITICAL: SAVE DAILY LOGS TO DATABASE
        # ---------------------------------------------------------
        if "daily_breakdown" in stats:
            for week in stats["daily_breakdown"]:
                for day in week["contributionDays"]:
                    date_str = day["date"] # YYYY-MM-DD
                    count = day["contributionCount"]
                    
                    if count > 0:
                        # Check if log exists
                        log = db.query(ActivityLog).filter(
                            ActivityLog.student_id == student.id,
                            ActivityLog.date_str == date_str
                        ).first()
                        
                        if log:
                            log.commits_count = count # Approximation: GitHub gives total, we map to commits
                            # We don't distinguish PRs vs Commits per day in simple calendar, 
                            # so we store everything as 'commits_count' for trending, or assume mostly commits.
                        else:
                            new_log = ActivityLog(
                                student_id=student.id,
                                date_str=date_str,
                                commits_count=count
                            )
                            db.add(new_log)
        
        db.commit()
    except Exception as e:
        print(f"Error in background update for student {student_id}: {str(e)}")
        db.rollback()
    finally:
        db.close()

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
                from routers.auth import hash_password
                password_to_use = sid if sid and sid.lower() != 'nan' else "12345"
                hashed_pw = hash_password(password_to_use)
                
                new_student = Student(
                    github_username=clean_username, 
                    name=name, 
                    student_id=sid, 
                    email=email, 
                    classroom_id=classroom_id,
                    department=dept,
                    password_hash=hashed_pw
                )
                db.add(new_student)
                db.commit()
                db.refresh(new_student)
                background_tasks.add_task(update_student_data_background, new_student.id)
                added_count += 1
        return {"message": f"Added {added_count} students"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{student_id}")
async def delete_student(
    student_id: int, 
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student: 
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Logical delete (archiving)
    student.status = "archived"
    db.commit()
    return {"message": f"Student {student.name} archived successfully"}

@router.post("/sync-all")
async def sync_all_students(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    students = db.query(Student).filter(Student.status == "active").all()
    for s in students:
        background_tasks.add_task(update_student_data_background, s.id)
    return {"message": f"Sync scheduled for {len(students)} students"}

@router.post("/{student_id}/refresh")
async def refresh_student(student_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    background_tasks.add_task(update_student_data_background, student.id)
    return {"message": "Refresh scheduled"}