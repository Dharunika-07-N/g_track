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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
# Token reload trigger

# Debug: Print first/last 4 chars of token to verify it's loaded
token = os.getenv("GITHUB_TOKEN")
if token:
    print(f"✅ Token loaded: {token[:4]}...{token[-4:]}")
else:
    print("❌ ERROR: GITHUB_TOKEN not found in environment!")

from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from services.tracker import tracker_service

# Import routers
from routers import students, classrooms, assignments, submissions, analytics, hod

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Application starting up...")
    init_db()
    
    # Create a default instructor for dev if none exists
    db = SessionLocal()
    if not db.query(User).first():
        from routers.auth import hash_password
        default_user = User(
            github_username="admin",
            name="Default Instructor",
            email="admin@example.com",
            role="hod",
            password_hash=hash_password("admin123")
        )
        db.add(default_user)
        db.commit()
    db.close()

    # Start Scheduler
    from services.scheduler_service import start_scheduler
    scheduler = start_scheduler()
    
    # Adding the periodic student data sync job to the same scheduler
    scheduler.add_job(sync_scheduler_wrapper, 'interval', minutes=60)
    
    # Trigger initial update immediately in background
    asyncio.create_task(scheduled_update_all())
    yield
    # Shutdown
    print("Application shutting down...")
    scheduler.shutdown()

app = FastAPI(title="Github Classroom Tracker", lifespan=lifespan)

# Static files for templates
os.makedirs("templates", exist_ok=True)
app.mount("/templates", StaticFiles(directory="templates"), name="templates")

# Mount the assets folder explicitly for better performance/MIME handling
# Check if static/assets exists first (it should in prod)
if os.path.isdir(os.path.join("static", "assets")):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers.auth import verify_token, router as auth_router

# Include Routers with Security
# Auth router FIRST (contains /login, /register, and /me)
app.include_router(auth_router, prefix="/api")

# Protected routers with /api prefix
app.include_router(students.router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(classrooms.router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(assignments.router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(submissions.router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(analytics.router, prefix="/api", dependencies=[Depends(verify_token)])
app.include_router(hod.router, prefix="/api", dependencies=[Depends(verify_token)])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- background tasks ---
async def update_student_data(student_id: int):
    # This is also in students router, keeping a reference here if needed
    from routers.students import update_student_data_background
    await update_student_data_background(student_id)

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
        from services.reminders import check_and_send_reminders
        loop.run_until_complete(scheduled_update_all())
        loop.run_until_complete(check_and_send_reminders())
        loop.close()
    except Exception as e:
        print(f"Error in sync_scheduler_wrapper: {e}")

@app.get("/")
def read_root():
    # If the frontend is built, we serve the index.html from there
    frontend_index = os.path.join("static", "index.html")
    if os.path.exists(frontend_index):
        from fastapi.responses import FileResponse
        return FileResponse(frontend_index)
    return {"message": "Github Classroom Tracker API is running"}



@app.get("/dashboard/stats", dependencies=[Depends(verify_token)])
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
        "github_token_configured": bool(tracker_service.token)
    }

@app.get("/dashboard/daily-stats", dependencies=[Depends(verify_token)])
def daily_stats(date: str, db: Session = Depends(get_db)):
    # Expected format YYYY-MM-DD
    # Returns stats for that specific day
    from database import ActivityLog, Student, Assignment
    from sqlalchemy import func
    
    # Activity logs for this date
    logs = db.query(ActivityLog).filter(ActivityLog.date_str == date).all()
    
    active_count = len(set(log.student_id for log in logs))
    commits_count = sum(log.commits_count for log in logs)
    
    # Find assignments created or due on this date (simple check)
    assignments_due = db.query(Assignment).filter(func.date(Assignment.deadline) == date).count()
    
    return {
        "date": date,
        "active_students": active_count,
        "commits": commits_count,
        "assignments_due": assignments_due
    }

@app.get("/dashboard/leaderboard", dependencies=[Depends(verify_token)])
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
        # Handle None values from sum queries
        commits = r.commits or 0
        prs = r.prs or 0
        active_days = r.active_days or 0
        
        score = (commits * 2) + (prs * 3) + (active_days * 1)
        leaderboard.append({
            "id": r.id,
            "name": r.name or r.github_username,
            "github_username": r.github_username,
            "avatar_url": r.avatar_url,
            "commits": commits,
            "prs": prs,
            "score": score
        })
    
    # Sort primarily by commits, then by score
    leaderboard.sort(key=lambda x: (x["commits"], x["score"]), reverse=True)
    return leaderboard

@app.get("/dashboard/upcoming", dependencies=[Depends(verify_token)])
def upcoming_deadlines(limit: int = 5, db: Session = Depends(get_db)):
    from database import Assignment
    from datetime import datetime
    
    now = datetime.utcnow()
    # Assignments due in future, sorted by closest deadline
    upcoming = db.query(Assignment).filter(Assignment.deadline > now).order_by(Assignment.deadline.asc()).limit(limit).all()
    
    return upcoming

# SPA Fallback: Serve index.html for all non-API routes
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    """
    Catch-all route for SPA. Serves index.html for all routes that:
    - Don't start with critical API prefixes
    - Don't exist as static files
    This allows React Router to handle client-side routing.
    """
    from fastapi.responses import FileResponse
    
    # If this is a naked path request or common client-side route, serve index.html
    # We check static folder content first
    static_file = os.path.join("static", full_path)
    if os.path.exists(static_file) and os.path.isfile(static_file):
        return FileResponse(static_file)
    
    # List of API prefixes that should NOT fallback to index.html to avoid 
    # returning HTML for failed API calls (which breaks JSON parsing in frontend)
    api_prefixes = ['api', 'dashboard', 'templates']
    
    if any(full_path.startswith(prefix) for prefix in api_prefixes):
        raise HTTPException(status_code=404, detail="API route not found")
    
    # Serve index.html for SPA routing
    frontend_index = os.path.join("static", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)
    
    return {"message": "Github Classroom Tracker API is running (Static frontend not found)"}



if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
