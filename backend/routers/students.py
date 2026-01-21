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

router = APIRouter(prefix="/students", tags=["students"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def update_student_data_background(student_id: int, start_date: str = "2025-12-01", end_date: str = "2026-01-21"):
    """
    Background task to sync student data.
    """
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
        
        # Update student record
        student.total_commits = stats["total_commits"]
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
        
        db.commit()
    except Exception as e:
        print(f"Error in background update for student {student_id}: {str(e)}")
        db.rollback()
    finally:
        db.close()

@router.get("/{student_id}/stats")
async def get_student_stats(
    student_id: int,
    start_date: Optional[str] = Query("2025-12-01", description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query("2026-01-21", description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get student stats for a custom date range.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if not student.github_username:
        raise HTTPException(status_code=400, detail="Student has no GitHub username")
    
    try:
        stats = await tracker_service.get_complete_student_stats(
            username=student.github_username,
            start_date=start_date,
            end_date=end_date,
            period="custom"
        )
        
        return {
            "student": {
                "id": student.id,
                "name": student.name,
                "github_username": student.github_username,
                "avatar_url": student.avatar_url
            },
            "stats": stats,
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@router.post("/{student_id}/update")
async def update_student_data_endpoint(
    student_id: int,
    start_date: str = "2025-12-01",
    end_date: str = "2026-01-21",
    db: Session = Depends(get_db)
):
    """
    Update student's data in database for specific date range.
    """
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if not student.github_username:
        raise HTTPException(status_code=400, detail="Student has no GitHub username")
    
    try:
        stats = await tracker_service.get_complete_student_stats(
            username=student.github_username,
            start_date=start_date,
            end_date=end_date,
            period="custom"
        )
        
        student.total_commits = stats["total_commits"]
        student.pull_requests = stats["pull_requests"]
        student.repo_count = stats["repo_count"]
        student.active_days = stats["active_days"]
        student.activity_score = stats["activity_score"]
        student.last_updated = datetime.utcnow()
        
        db.commit()
        db.refresh(student)
        
        return {
            "message": "Student data updated successfully",
            "student": {
                "id": student.id,
                "name": student.name,
                "github_username": student.github_username,
                "total_commits": student.total_commits,
                "pull_requests": student.pull_requests,
                "active_days": student.active_days,
                "activity_score": student.activity_score
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating student: {str(e)}")

@router.post("/batch-update")
async def batch_update_students(
    start_date: str = "2025-12-01",
    end_date: str = "2026-01-21",
    db: Session = Depends(get_db)
):
    """
    Update ALL students' data for the specified date range.
    """
    students = db.query(Student).filter(Student.github_username.isnot(None), Student.status == "active").all()
    
    results = {"total": len(students), "updated": 0, "failed": 0, "errors": []}
    
    for student in students:
        try:
            stats = await tracker_service.get_complete_student_stats(
                username=student.github_username,
                start_date=start_date,
                end_date=end_date,
                period="custom"
            )
            
            student.total_commits = stats["total_commits"]
            student.pull_requests = stats["pull_requests"]
            student.repo_count = stats["repo_count"]
            student.active_days = stats["active_days"]
            student.activity_score = stats["activity_score"]
            student.last_updated = datetime.utcnow()
            
            db.commit()
            results["updated"] += 1
            await asyncio.sleep(2) # Nicer rate limiting
        except Exception as e:
            results["failed"] += 1
            results["errors"].append({"student": student.github_username, "error": str(e)})
            db.rollback()
    
    return results

@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Get top N students by activity score.
    """
    students = db.query(Student)\
        .filter(Student.github_username.isnot(None), Student.status == "active")\
        .order_by(Student.activity_score.desc())\
        .limit(limit)\
        .all()
    
    return [
        {
            "rank": idx + 1,
            "id": s.id,
            "name": s.name,
            "github_username": s.github_username,
            "avatar_url": s.avatar_url,
            "commits": s.total_commits,
            "prs": s.pull_requests,
            "active_days": s.active_days,
            "score": s.activity_score,
            "last_updated": s.last_updated
        }
        for idx, s in enumerate(students)
    ]

@router.post("/", response_model=StudentRead)
async def add_student(student: StudentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_username = student.github_username.strip().rstrip('/').strip('@').split('/')[-1]
    
    # Check if student already exists
    db_student = db.query(Student).filter(Student.github_username == clean_username).first()
    if db_student: 
        raise HTTPException(status_code=400, detail="Student already tracked in registry")
    
    from routers.auth import hash_password
    password_to_use = str(student.student_id).strip()
    hashed_pw = hash_password(password_to_use)
    
    # Create User record
    existing_user = db.query(User).filter((User.github_username == clean_username) | (User.email == student.email)).first()
    if not existing_user:
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
    
    # Create Student record
    new_student = Student(**student.dict())
    new_student.github_username = clean_username
    new_student.password_hash = hashed_pw
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    background_tasks.add_task(update_student_data_background, new_student.id)
    return new_student

@router.get("/", response_model=List[StudentRead])
async def read_students(
    classroom_id: Optional[int] = None, 
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    query = db.query(Student).filter(Student.status == "active")
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
    
    # We return the scores stored in DB (caller should run batch-update to refresh)
    students = query.order_by(Student.activity_score.desc()).offset(skip).limit(limit).all()
    return students

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
async def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student: raise HTTPException(status_code=404, detail="Student not found")
    student.status = "archived"
    db.commit()
    return {"message": "Student archived"}

@router.post("/sync-all")
async def sync_all_students(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    students = db.query(Student).filter(Student.status == "active").all()
    for s in students:
        background_tasks.add_task(update_student_data_background, s.id)
    return {"message": f"Sync scheduled for {len(students)} students"}