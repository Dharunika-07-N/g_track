from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
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

# EXPLICIT IMPORTS TO AVOID ANY CONFLICTS
from routers.auth import router as auth_router, verify_token
from routers.students import router as students_router
from routers.classrooms import router as classrooms_router
from routers.assignments import router as assignments_router
from routers.submissions import router as submissions_router
from routers.analytics import router as analytics_router
from routers.hod import router as hod_router

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

# --- API ROUTES ---
# We use direct inclusion with prefix to be most robust across FastAPI versions
app.include_router(auth_router, prefix="/api")

# Protected dependencies
api_deps = [Depends(verify_token)]
app.include_router(students_router, prefix="/api", dependencies=api_deps)
app.include_router(classrooms_router, prefix="/api", dependencies=api_deps)
app.include_router(assignments_router, prefix="/api", dependencies=api_deps)
app.include_router(submissions_router, prefix="/api", dependencies=api_deps)
app.include_router(analytics_router, prefix="/api", dependencies=api_deps)
app.include_router(hod_router, prefix="/api", dependencies=api_deps)

# Ping endpoint for debug
@app.get("/api/ping")
def ping():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

# Static files for templates
os.makedirs("templates", exist_ok=True)
app.mount("/templates", StaticFiles(directory="templates"), name="templates")

# Mount assets
if os.path.isdir(os.path.join("static", "assets")):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Background Tasks ---
async def update_student_data(student_id: int):
    from routers.students import update_student_data_background
    await update_student_data_background(student_id)

async def scheduled_update_all():
    db = SessionLocal()
    students_list = db.query(Student).all()
    s_ids = [s.id for s in students_list]
    db.close()
    for sid in s_ids:
        await update_student_data(sid)

def sync_scheduler_wrapper():
    try:
        loop = asyncio.new_event_loop()
        from services.reminders import check_and_send_reminders
        loop.run_until_complete(scheduled_update_all())
        loop.run_until_complete(check_and_send_reminders())
        loop.close()
    except Exception as e:
        print(f"Error in sync_scheduler_wrapper: {e}")

# Catch-all for SPA
@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def spa_fallback(request: Request, full_path: str):
    # 1. If it's a static file request that actually exists, serve it
    static_file = os.path.join("static", full_path)
    if os.path.exists(static_file) and os.path.isfile(static_file):
        return FileResponse(static_file)
    
    # 2. If it's an API request that reached here, it's a 404 (not matched by routers)
    if full_path.startswith("api") or full_path.startswith("templates"):
        return JSONResponse(
            status_code=404, 
            content={"detail": f"API Route Not Found: {request.method} /{full_path}"}
        )
    
    # 3. For all other GET requests, serve index.html (SPA routing)
    if request.method == "GET":
        frontend_index = os.path.join("static", "index.html")
        if os.path.exists(frontend_index):
            return FileResponse(frontend_index)
        return JSONResponse(content={"message": "Frontend not built"})
    
    # 4. For non-GET requests to non-API paths, it's a 405 or 404
    return JSONResponse(
        status_code=405,
        content={"detail": f"Method {request.method} not allowed for path /{full_path}"}
    )

@app.get("/")
def read_root():
    frontend_index = os.path.join("static", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)
    return {"message": "Github Classroom Tracker API is running"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
