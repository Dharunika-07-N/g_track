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

from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from services.tracker import tracker_service
from routers import students, classrooms, assignments, submissions, analytics, hod, auth

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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Router
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

# Auth routes (public for login/register)
api_router.include_router(auth.router)

# Protected routes
api_protected_deps = [Depends(auth.verify_token)]
api_router.include_router(students.router, dependencies=api_protected_deps)
api_router.include_router(classrooms.router, dependencies=api_protected_deps)
api_router.include_router(assignments.router, dependencies=api_protected_deps)
api_router.include_router(submissions.router, dependencies=api_protected_deps)
api_router.include_router(analytics.router, dependencies=api_protected_deps)
api_router.include_router(hod.router, dependencies=api_protected_deps)

app.include_router(api_router)

# Static files for templates
os.makedirs("templates", exist_ok=True)
app.mount("/templates", StaticFiles(directory="templates"), name="templates")

# Mount the assets folder explicitly for better performance/MIME handling
if os.path.isdir(os.path.join("static", "assets")):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- background tasks ---
async def update_student_data(student_id: int):
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
    frontend_index = os.path.join("static", "index.html")
    if os.path.exists(frontend_index):
        from fastapi.responses import FileResponse
        return FileResponse(frontend_index)
    return {"message": "Github Classroom Tracker API is running"}

# SPA Fallback
@app.get("/{full_path:path}")
async def spa_fallback(full_path: str):
    from fastapi.responses import FileResponse
    
    static_file = os.path.join("static", full_path)
    if os.path.exists(static_file) and os.path.isfile(static_file):
        return FileResponse(static_file)
    
    if full_path.startswith("api") or full_path.startswith("templates"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    frontend_index = os.path.join("static", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)
    
    return {"message": "Github Classroom Tracker API is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
