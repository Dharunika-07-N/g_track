from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from database import SessionLocal, User, Student, ImportLog
from dependencies import require_admin
import pandas as pd
import io
import secrets
import datetime
from typing import List, Optional
from services.notifications import notification_service
from routers.auth import hash_password
from pydantic import BaseModel

router = APIRouter(prefix="/hod", tags=["HOD / Admin Functions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class BulkActionRequest(BaseModel):
    user_ids: List[int]

@router.post("/upload/students", dependencies=[Depends(require_admin)])
async def upload_students(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Clean column names
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        
        import_log = ImportLog(
            imported_by=current_user["user_id"],
            import_type="student",
            file_name=file.filename,
            total_rows=len(df),
            success_count=0,
            error_count=0,
            status="pending",
            created_at=datetime.datetime.utcnow()
        )
        db.add(import_log)
        db.commit()
        db.refresh(import_log)
        
        success_count = 0
        error_rows = []
        
        batch_id = f"batch_{import_log.id}_{datetime.datetime.now().strftime('%Y%m%d%H%M')}"
        
        for index, row in df.iterrows():
            try:
                # Map columns (flexible aliases)
                email_raw = str(row.get('email', '')).strip()
                name = str(row.get('name', 'Unknown')).strip()
                roll_no = str(row.get('roll_number', row.get('roll_no', row.get('student_id', '')))).strip()
                
                # Support "Github ID" which becomes "github_id" after cleaning
                github = str(row.get('github_url', row.get('github', row.get('github_id', '')))).strip()
                
                dept = str(row.get('department', row.get('dept', ''))).strip()
                phone = str(row.get('phone', row.get('phone_number', ''))).strip()
                leetcode = str(row.get('leetcode_username', row.get('leetcode', ''))).strip()
                
                # Handle missing email by generating one from github or roll_no
                if not email_raw or email_raw.lower() == 'nan':
                    if github and github.lower() != 'nan':
                        email = f"{github.split('/')[-1]}@internal.com"
                    elif roll_no and roll_no.lower() != 'nan':
                        email = f"{roll_no}@internal.com"
                    else:
                        error_rows.append({"row": index+2, "reason": "Missing email and cannot generate fallback (no Github/Roll No)"})
                        continue
                else:
                    email = email_raw
                
                # Check if user exists
                existing = db.query(User).filter(User.email == email).first()
                if existing:
                    error_rows.append({"row": index+2, "reason": "Email already exists"})
                    continue
                
                temp_password = secrets.token_urlsafe(8)
                
                # Create User
                new_user = User(
                    name=name,
                    email=email,
                    role="student",
                    password_hash=hash_password(temp_password),
                    github_username=github.rstrip('/').strip('@').split('/')[-1] if github else None,
                    department=dept,
                    student_id=roll_no,
                    phone=phone,
                    leetcode_username=leetcode,
                    password_reset_required=True,
                    import_batch_id=batch_id
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                
                # Create Student record for tracking
                new_student = Student(
                    name=name,
                    student_id=roll_no,
                    email=email,
                    github_username=new_user.github_username,
                    status="active"
                )
                db.add(new_student)
                db.commit()
                
                # Trigger background sync for this student
                from routers.students import update_student_data
                background_tasks.add_task(update_student_data, new_student.id)
                
                # Send welcome email
                if email:
                    background_tasks.add_task(
                        notification_service.send_welcome_email,
                        name, email, temp_password
                    )
                
                success_count += 1
            except Exception as e:
                error_rows.append({"row": index+2, "reason": str(e)})
        
        import_log.success_count = success_count
        import_log.error_count = len(error_rows)
        import_log.status = "completed"
        db.commit()
        
        return {
            "message": f"Import completed: {success_count} success, {len(error_rows)} errors",
            "batch_id": batch_id,
            "errors": error_rows
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Critical error: {str(e)}")

@router.get("/users", dependencies=[Depends(require_admin)])
def list_users(role: Optional[str] = None, department: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if department:
        query = query.filter(User.department == department)
    return query.all()

@router.post("/users/bulk-delete", dependencies=[Depends(require_admin)])
def bulk_delete_users(req: BulkActionRequest, db: Session = Depends(get_db)):
    # Protect against deleting current admin or sensitive accounts
    # For now implementation
    db.query(User).filter(User.id.in_(req.user_ids)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {len(req.user_ids)} users"}

@router.get("/stats", dependencies=[Depends(require_admin)])
def get_hod_stats(db: Session = Depends(get_db)):
    total_students = db.query(User).filter(User.role == "student").count()
    total_faculty = db.query(User).filter(User.role == "faculty").count()
    total_classrooms = db.query(User).filter(User.role == "faculty").count() # Placeholder
    
    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "department": "All"
    }
