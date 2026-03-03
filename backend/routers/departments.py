from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import SessionLocal, Department, Classroom, Student, User
from schemas import DepartmentCreate, DepartmentRead
from dependencies import require_admin
from typing import List, Optional
from datetime import datetime
import pandas as pd
import io

router = APIRouter(prefix="/departments", tags=["departments"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.post("/", response_model=DepartmentRead)
def create_department(
    dept: DepartmentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Admin creates a new department."""
    existing = db.query(Department).filter(
        Department.name == dept.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department with this name already exists")

    db_dept = Department(
        name=dept.name,
        code=dept.code.upper(),
        description=dept.description,
        hod_name=dept.hod_name,
        hod_email=dept.hod_email,
        is_active=dept.is_active,
        created_by=user["user_id"],
        created_at=datetime.utcnow()
    )
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)

    result = db_dept.__dict__.copy()
    result["student_count"] = 0
    result["classroom_count"] = 0
    return result


@router.get("/", response_model=List[DepartmentRead])
def list_departments(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """List all departments with student/classroom counts."""
    query = db.query(Department)
    if not include_inactive:
        query = query.filter(Department.is_active == True)

    departments = query.all()

    results = []
    for dept in departments:
        student_count = db.query(func.count(Student.id)).filter(
            Student.department_id == dept.id,
            Student.status == "active"
        ).scalar() or 0

        classroom_count = db.query(func.count(Classroom.id)).filter(
            Classroom.department_id == dept.id,
            Classroom.is_archived == False
        ).scalar() or 0

        d = {
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "description": dept.description,
            "hod_name": dept.hod_name,
            "hod_email": dept.hod_email,
            "is_active": dept.is_active,
            "created_by": dept.created_by,
            "created_at": dept.created_at,
            "student_count": student_count,
            "classroom_count": classroom_count,
        }
        results.append(d)

    return results


@router.get("/{dept_id}", response_model=DepartmentRead)
def get_department(dept_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    student_count = db.query(func.count(Student.id)).filter(
        Student.department_id == dept_id,
        Student.status == "active"
    ).scalar() or 0

    classroom_count = db.query(func.count(Classroom.id)).filter(
        Classroom.department_id == dept_id,
        Classroom.is_archived == False
    ).scalar() or 0

    result = {
        "id": dept.id,
        "name": dept.name,
        "code": dept.code,
        "description": dept.description,
        "hod_name": dept.hod_name,
        "hod_email": dept.hod_email,
        "is_active": dept.is_active,
        "created_by": dept.created_by,
        "created_at": dept.created_at,
        "student_count": student_count,
        "classroom_count": classroom_count,
    }
    return result


@router.put("/{dept_id}", response_model=DepartmentRead)
def update_department(
    dept_id: int,
    dept_update: DepartmentCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Ensure the new name doesn't conflict with another department
    conflict = db.query(Department).filter(Department.name == dept_update.name, Department.id != dept_id).first()
    if conflict:
        raise HTTPException(status_code=400, detail="Another department with this name already exists")

    dept.name = dept_update.name
    dept.code = dept_update.code.upper()
    dept.description = dept_update.description
    dept.hod_name = dept_update.hod_name
    dept.hod_email = dept_update.hod_email
    dept.is_active = dept_update.is_active
    db.commit()
    db.refresh(dept)

    student_count = db.query(func.count(Student.id)).filter(
        Student.department_id == dept_id, Student.status == "active"
    ).scalar() or 0
    classroom_count = db.query(func.count(Classroom.id)).filter(
        Classroom.department_id == dept_id, Classroom.is_archived == False
    ).scalar() or 0

    result = dept.__dict__.copy()
    result["student_count"] = student_count
    result["classroom_count"] = classroom_count
    return result


@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Safety: detach students and classrooms before deleting
    db.query(Student).filter(Student.department_id == dept_id).update({"department_id": None})
    db.query(Classroom).filter(Classroom.department_id == dept_id).update({"department_id": None})

    db.delete(dept)
    db.commit()
    return {"message": f"Department '{dept.name}' deleted successfully"}


# ── Department Classrooms ─────────────────────────────────────────────────────

@router.get("/{dept_id}/classrooms")
def get_dept_classrooms(dept_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """Get all classrooms belonging to a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    classrooms = db.query(Classroom).filter(
        Classroom.department_id == dept_id,
        Classroom.is_archived == False
    ).all()

    result = []
    for c in classrooms:
        student_count = db.query(func.count(Student.id)).filter(
            Student.classroom_id == c.id, Student.status == "active"
        ).scalar() or 0
        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "semester": c.semester,
            "year": c.year,
            "batch": c.batch,
            "subject_code": c.subject_code,
            "faculty_name": c.faculty_name,
            "faculty_email": c.faculty_email,
            "department": c.department,
            "department_id": c.department_id,
            "is_archived": c.is_archived,
            "created_at": c.created_at,
            "student_count": student_count,
        })
    return result


@router.post("/{dept_id}/classrooms")
def create_dept_classroom(
    dept_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Create a classroom inside a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    classroom = Classroom(
        name=payload.get("name", ""),
        description=payload.get("description", ""),
        org_id=payload.get("org_id", ""),
        semester=payload.get("semester", ""),
        year=payload.get("year", ""),
        subject_code=payload.get("subject_code", ""),
        faculty_name=payload.get("faculty_name", ""),
        faculty_email=payload.get("faculty_email", ""),
        batch=payload.get("batch", ""),
        department=dept.name,
        department_id=dept_id,
        owner_id=user["user_id"],
        created_at=datetime.utcnow()
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)
    return {"id": classroom.id, "name": classroom.name, "message": "Classroom created successfully"}


# ── Department Students ───────────────────────────────────────────────────────


@router.get("/{dept_id}/students")
def get_dept_students(
    dept_id: int,
    classroom_id: Optional[int] = None,
    period: str = "all-time",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Get all students in a department, optionally filtered by classroom and date range."""
    from database import ActivityLog
    from datetime import datetime, timedelta

    dept = db.query(Department).filter(Department.id == dept_id).first()
    print(f"DEBUG: get_dept_students hit. Dept={dept_id}, Period='{period}', Start='{start_date}'")
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Range Logic
    filter_start = "2000-01-01"
    filter_end = "2099-12-31"
    today = datetime.utcnow().date()
    
    if period == "daily":
        filter_start = str(today)
    elif period == "weekly":
        filter_start = str(today - timedelta(days=7))
    elif period == "monthly":
        filter_start = str(today - timedelta(days=30))
    elif period == "yearly":
        filter_start = str(today - timedelta(days=365))
    elif period == "custom" and start_date:
        filter_start = start_date
        if end_date:
            filter_end = end_date

    query = db.query(Student).filter(
        Student.department_id == dept_id,
        Student.status == "active"
    )
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)

    students = query.all()

    if period == "all-time":
        # Keep original logic for all-time
        results = [
            {
                "id": s.id,
                "name": s.name,
                "student_id": s.student_id,
                "email": s.email,
                "github_username": s.github_username,
                "profile_url": s.profile_url,
                "avatar_url": s.avatar_url,
                "department": s.department,
                "department_id": s.department_id,
                "classroom_id": s.classroom_id,
                "status": s.status,
                "total_commits": s.total_commits,
                "total_contributions": s.total_contributions,
                "pull_requests": s.pull_requests,
                "issues": s.issues,
                "reviews": s.reviews,
                "repo_count": s.repo_count,
                "activity_score": s.activity_score,
                "active_days": s.active_days,
                "last_updated": s.last_updated,
            }
            for s in students
        ]
        results.sort(key=lambda x: x["activity_score"], reverse=True)
        return results

    # Get aggregated logs
    logs_summary = db.query(
        ActivityLog.student_id,
        func.sum(ActivityLog.commits_count).label("commits"),
        func.sum(ActivityLog.pr_count).label("prs"),
        func.sum(ActivityLog.issue_count).label("issues"),
        func.sum(ActivityLog.review_count).label("reviews"),
        func.count(ActivityLog.id).label("active_days")
    ).filter(
        ActivityLog.date_str >= filter_start,
        ActivityLog.date_str <= filter_end
    ).group_by(ActivityLog.student_id).all()

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

    results = []
    for s in students:
        stat = stats_map.get(s.id, {"commits": 0, "prs": 0, "issues": 0, "reviews": 0, "active_days": 0})
        score = (stat["commits"] * 2) + (stat["prs"] * 3) + (stat["active_days"] * 1)
        
        results.append({
            "id": s.id,
            "name": s.name,
            "student_id": s.student_id,
            "email": s.email,
            "github_username": s.github_username,
            "profile_url": s.profile_url,
            "avatar_url": s.avatar_url,
            "department": s.department,
            "department_id": s.department_id,
            "classroom_id": s.classroom_id,
            "status": s.status,
            "total_contributions": stat["commits"],
            "total_commits": stat["commits"],
            "pull_requests": stat["prs"],
            "issues": stat["issues"],
            "reviews": stat["reviews"],
            "repo_count": s.repo_count,
            "activity_score": score,
            "active_days": stat["active_days"],
            "last_updated": s.last_updated,
        })

    results.sort(key=lambda x: x["activity_score"], reverse=True)
    return results


@router.post("/{dept_id}/upload")
async def upload_dept_students(
    dept_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    classroom_id: Optional[int] = None,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Upload an Excel/CSV of students directly into a department (and optionally a classroom)."""
    with open("import_debug.log", "a", encoding="utf-8") as log_file:
        log_file.write(f"\n--- NEW IMPORT AT {datetime.utcnow()} ---\n")
        dept = db.query(Department).filter(Department.id == dept_id).first()
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")

        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(status_code=400, detail="Invalid file type. Use .xlsx, .xls or .csv")

        try:
            contents = await file.read()
            if file.filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(contents))
            else:
                df = pd.read_excel(io.BytesIO(contents))

            # Filter out completely empty rows
            df = df.dropna(how='all')

            added_count = 0
            skipped_count = 0
            updated_count = 0
            errors = []

            # --- SMART COLUMN DISCOVERY (Case-insensitive, symbol-agnostic) ---
            cols = {'name': None, 'github': None, 'id': None, 'email': None}
            
            # Normalize headers for better matching
            header_map = {}
            for original_col in df.columns:
                clean_h = str(original_col).lower().strip().replace(' ', '').replace('_', '').replace('-', '').replace('.', '')
                header_map[clean_h] = original_col
            
            log_file.write(f"Normalized Headers: {list(header_map.keys())}\n")

            # 1. Match GitHub ID
            for h in header_map:
                if any(x in h for x in ['github', 'username', 'gitid', 'gitlink']):
                    cols['github'] = header_map[h]
                    break
            
            # 2. Match Name
            for h in header_map:
                if h == 'name' or ( 'name' in h and 'user' not in h and 'hod' not in h):
                    cols['name'] = header_map[h]
                    break
            
            # 3. Match Email
            for h in header_map:
                if 'email' in h:
                    cols['email'] = header_map[h]
                    break
            
            # 4. Match Roll Number / Student ID
            for h in header_map:
                if any(x in h for x in ['roll', 'reg', 'sid', 'idnumber', 'studentlink']):
                    cols['id'] = header_map[h]
                    break
            
            if not cols['github']:
                # Last ditch: search for any column whose first valid row looks like a github link
                for col in df.columns:
                    sample = str(df[col].dropna().iloc[0] if not df[col].dropna().empty else "").lower()
                    if 'github.com' in sample:
                        cols['github'] = col
                        break

            log_file.write(f"Mapped Columns: {cols}\n")

            for index, row in df.iterrows():
                try:
                    # Extract basic strings
                    name_raw = str(row.get(cols['name'], '')).strip() if cols['name'] else ""
                    github_raw = str(row.get(cols['github'], '')).strip() if cols['github'] else ""
                    sid_raw = str(row.get(cols['id'], '')).strip() if cols['id'] else ""
                    email_raw = str(row.get(cols['email'], '')).strip() if cols['email'] else ""

                    # Clean GitHub (Handle URLs and @)
                    if not github_raw or github_raw.lower() == 'nan':
                        # If github_raw is empty, scan the entire row for a github link (fallback)
                        found_git = False
                        for cell_val in row:
                            cv = str(cell_val).lower()
                            if 'github.com/' in cv:
                                github_raw = str(cell_val).strip()
                                found_git = True
                                break
                        if not found_git:
                            skipped_count += 1
                            continue

                    # Extract username from URL or handle
                    username = github_raw.rstrip('/').strip('@').split('/')[-1].split('?')[0]
                    if not username or len(username) < 2 or username.lower() == 'nan':
                        skipped_count += 1
                        continue

                    # Persistence Logic
                    exists = db.query(Student).filter(Student.github_username == username).first()
                    
                    if exists:
                        # Update existing student's dept and optional fields
                        exists.department_id = dept_id
                        exists.department = dept.name
                        exists.status = "active" # Re-activate if it was archived
                        if classroom_id: exists.classroom_id = classroom_id
                        
                        # Only update name/email if currently generic
                        if not exists.name or exists.name.lower() in ['', 'unknown', 'student']:
                            exists.name = name_raw if name_raw else exists.name
                        if not exists.email or '@' not in str(exists.email):
                            exists.email = email_raw if '@' in email_raw else exists.email
                        if not exists.student_id:
                            exists.student_id = sid_raw
                            
                        db.commit()
                        updated_count += 1
                    else:
                        # Create new record
                        from routers.auth import hash_password
                        hashed_pw = hash_password(sid_raw if sid_raw and sid_raw.lower() != 'nan' else "12345")
                        
                        new_student = Student(
                            github_username=username,
                            name=name_raw if name_raw and name_raw.lower() != 'nan' else "Unknown",
                            student_id=sid_raw if sid_raw and sid_raw.lower() != 'nan' else None,
                            email=email_raw if '@' in email_raw else None,
                            classroom_id=classroom_id,
                            department=dept.name,
                            department_id=dept_id,
                            password_hash=hashed_pw
                        )
                        db.add(new_student)
                        db.commit()
                        db.refresh(new_student)
                        
                        # Trigger background sync
                        from routers.students import update_student_data_background
                        background_tasks.add_task(update_student_data_background, new_student.id)
                        added_count += 1

                except Exception as row_err:
                    log_file.write(f"Row {index} error: {str(row_err)}\n")
                    errors.append(f"Row {index}: {str(row_err)}")
                    continue

            log_file.write(f"Import Summary: Added {added_count}, Updated {updated_count}, Skipped {skipped_count}\n")
            return {
                "message": f"Successfully processed students.",
                "added": added_count,
                "updated": updated_count,
                "skipped": skipped_count,
                "errors": errors[:10]
            }

        except Exception as e:
            log_file.write(f"CRITICAL IMPORT ERROR: {str(e)}\n")
            raise HTTPException(status_code=500, detail=str(e))



@router.post("/{dept_id}/sync")
async def sync_dept_students(
    dept_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Trigger a GitHub sync for all students in a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    students = db.query(Student).filter(
        Student.department_id == dept_id,
        Student.status == "active"
    ).all()

    from routers.students import update_student_data_background
    for s in students:
        background_tasks.add_task(update_student_data_background, s.id)

    return {"message": f"Sync scheduled for {len(students)} students in {dept.name}"}


# ── Stats ─────────────────────────────────────────────────────────────────────

@router.get("/{dept_id}/stats")
def get_dept_stats(dept_id: int, db: Session = Depends(get_db), user: dict = Depends(require_admin)):
    """Aggregated stats for a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    students = db.query(Student).filter(
        Student.department_id == dept_id,
        Student.status == "active"
    ).all()

    if not students:
        return {
            "total_students": 0,
            "avg_commits": 0,
            "avg_score": 0,
            "total_commits": 0,
            "top_student": None,
        }

    total_commits = sum(s.total_commits for s in students)
    total_score = sum(s.activity_score for s in students)
    top = max(students, key=lambda s: s.activity_score)

    return {
        "total_students": len(students),
        "avg_commits": round(total_commits / len(students), 1),
        "avg_score": round(total_score / len(students), 1),
        "total_commits": total_commits,
        "top_student": {
            "name": top.name,
            "github_username": top.github_username,
            "avatar_url": top.avatar_url,
            "activity_score": top.activity_score,
        },
    }


@router.delete("/{dept_id}/students")
def delete_all_dept_students(
    dept_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_admin)
):
    """Archive all students in a department."""
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    # Filter by department_id and archive them
    updated_count = db.query(Student).filter(
        Student.department_id == dept_id,
        Student.status == "active"
    ).update({"status": "archived"}, synchronize_session=False)

    db.commit()
    return {"message": f"Successfully removed all {updated_count} students from {dept.name}"}
