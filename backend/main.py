from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from database import SessionLocal, Student, ActivityLog, init_db, User
from pydantic import BaseModel
from datetime import datetime, timedelta
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
import asyncio
from typing import List, Optional
import os

# Import routers
from routers import students, classrooms, assignments, submissions, analytics

from services.tracker import tracker_service
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting up...")
    init_db()
    
    # Create a default instructor for dev if none exists
    db = SessionLocal()
    if not db.query(User).first():
        default_user = User(
            github_username="admin",
            name="Default Instructor",
            email="admin@example.com"
        )
        db.add(default_user)
        db.commit()
    db.close()

    scheduler.start()
    # Trigger initial update immediately in background
    asyncio.create_task(scheduled_update_all())
    yield
    # Shutdown
    print("Application shutting down...")
    scheduler.shutdown()

app = FastAPI(title="Github Classroom Tracker", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(students.router)
app.include_router(classrooms.router)
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(analytics.router)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- background tasks ---
async def update_student_data(student_id: int):
    # This is also in students router, keeping a reference here if needed
    from routers.students import update_student_data as usd
    await usd(student_id)

async def scheduled_update_all():
    print("Executing scheduled poll of all students...")
    db = SessionLocal()
    students_list = db.query(Student).all()
    s_ids = [s.id for s in students_list]
    db.close()
    
    for sid in s_ids:
        await update_student_data(sid)
    print("Scheduled poll complete.")

def sync_scheduler_wrapper():
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(scheduled_update_all())
        loop.close()
    except Exception as e:
        print(f"Error in sync_scheduler_wrapper: {e}")

scheduler = BackgroundScheduler()
scheduler.add_job(sync_scheduler_wrapper, 'interval', minutes=60)

@app.get("/")
def read_root():
    return {"message": "Github Classroom Tracker API is running"}

@app.get("/dashboard/stats")
def dashboard_stats(period: str = "monthly", db: Session = Depends(get_db)):
    from routers.students import get_period_cutoff
    from sqlalchemy import func
    cutoff = get_period_cutoff(period)
    
    total_students = db.query(Student).count()
    active_students = db.query(ActivityLog.student_id).filter(
        ActivityLog.date_str >= cutoff
    ).distinct().count()
    
    total_commits = db.query(func.sum(ActivityLog.commits_count)).filter(
        ActivityLog.date_str >= cutoff
    ).scalar() or 0
    
    # For "Graded Today", we can count submissions with a grade that were updated today
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    from database import Submission
    graded_today = db.query(Submission).filter(
        Submission.grade.isnot(None),
        func.substr(Submission.submitted_at, 1, 10) == today_str
    ).count()

    return {
        "total_students": total_students,
        "active_students": active_students,
        "total_commits": total_commits,
        "graded_today": graded_today,
        "github_token_configured": bool(tracker_service.token)
    }

@app.get("/dashboard/leaderboard")
def get_leaderboard(period: str = "monthly", limit: int = 5, db: Session = Depends(get_db)):
    from routers.students import get_period_cutoff
    from database import Student, ActivityLog
    from sqlalchemy import func
    
    cutoff = get_period_cutoff(period)
    
    query = db.query(
        Student.id,
        Student.name,
        Student.github_username,
        Student.avatar_url,
        func.sum(ActivityLog.commits_count).label("commits"),
        func.sum(ActivityLog.pr_count).label("prs"),
        func.count(ActivityLog.id).label("active_days")
    ).join(ActivityLog, Student.id == ActivityLog.student_id)\
     .filter(ActivityLog.date_str >= cutoff)\
     .group_by(Student.id)\
     .order_by(func.sum(ActivityLog.commits_count).desc())\
     .limit(limit).all()
    
    leaderboard = []
    for r in query:
        score = (r.commits * 2) + (r.prs * 3) + (r.active_days * 1)
        leaderboard.append({
            "id": r.id,
            "name": r.name or r.github_username,
            "github_username": r.github_username,
            "avatar_url": r.avatar_url,
            "commits": r.commits,
            "prs": r.prs,
            "score": score
        })
    
    leaderboard.sort(key=lambda x: x["score"], reverse=True)
    return leaderboard

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
