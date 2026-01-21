from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import SessionLocal, Student, ActivityLog, Submission, Assignment, Classroom
from sqlalchemy import func
import pandas as pd
import io
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/export/csv")
def export_full_history(
    classroom_id: int = None, 
    status: str = None, 
    period: str = "all",
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db)
):
    try:
        from datetime import datetime, timedelta
        
        # Handle custom date range
        if period == "custom" and start_date and end_date:
            cutoff_start = start_date
            cutoff_end = end_date
        else:
            # Local logic for period cutoff since reusable function is missing
            today = datetime.utcnow().date()
            if period == "daily":
                cutoff_start = str(today)
            elif period == "weekly":
                cutoff_start = str(today - timedelta(days=7))
            elif period == "monthly":
                cutoff_start = str(today - timedelta(days=30))
            else:
                cutoff_start = "2000-01-01" # Default all-time
            
            cutoff_end = datetime.utcnow().strftime("%Y-%m-%d")
        
        # Base Student Query
        students = db.query(Student)
        if classroom_id:
            students = students.filter(Student.classroom_id == classroom_id)
        
        students = students.all()
        export_data = []
        
        for s in students:
            # Get metrics for this student within the period
            logs_summary = db.query(
                func.sum(ActivityLog.commits_count).label("commits"),
                func.sum(ActivityLog.pr_count).label("prs"),
                func.sum(ActivityLog.issue_count).label("issues"),
                func.sum(ActivityLog.review_count).label("reviews"),
                func.count(ActivityLog.id).label("active_days")
            ).filter(
                ActivityLog.student_id == s.id, 
                ActivityLog.date_str >= cutoff_start,
                ActivityLog.date_str <= cutoff_end
            ).first()
            
            commits = logs_summary.commits or 0
            prs = logs_summary.prs or 0
            issues = logs_summary.issues or 0
            reviews = logs_summary.reviews or 0
            active_days = logs_summary.active_days or 0
            score = (commits * 2) + (prs * 3) + (active_days * 1)
            
            # Submission status check if requested
            if status:
                subs = db.query(Submission).filter(Submission.student_id == s.id).all()
                combined_status = "completed" if all(sub.status in ["submitted", "graded"] for sub in subs) and subs else "incomplete"
                if status != combined_status:
                    continue

            period_label = f"{start_date} to {end_date}" if period == "custom" else period.capitalize()
            
            export_data.append({
                "Roll No": s.student_id,
                "Name": s.name,
                "Email": s.email,
                "GitHub": s.github_username,
                "Period": period_label,
                "Commits": commits,
                "PRs": prs,
                "Issues": issues,
                "Reviews": reviews,
                "Repo Count": s.repo_count,
                "Total Events": (commits + prs + issues + reviews),
                "Active Days": active_days,
                "Activity Score": score,
                "Status": s.status
            })
        # Sort by Commits Descending (highest commit first), then by Activity Score
        export_data.sort(key=lambda x: (x["Commits"], x["Activity Score"]), reverse=True)
        
        # Add Rank column and reorder fields to put Rank first
        ranked_export_data = []
        for i, item in enumerate(export_data):
            ranked_item = {"Rank": i + 1}
            ranked_item.update(item)
            ranked_export_data.append(ranked_item)
            
        df = pd.DataFrame(ranked_export_data)
        
        output = io.BytesIO()
        df.to_excel(output, index=False)
        output.seek(0)
        
        filename_period = f"{start_date}_to_{end_date}" if period == "custom" else period
        filename = f"{filename_period}_{status or 'students'}_report.xlsx"
        headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
        return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/summary")
def get_global_summary(db: Session = Depends(get_db)):
    total_students = db.query(Student).count()
    total_classrooms = db.query(Classroom).count()
    total_assignments = db.query(Assignment).count()
    total_commits = db.query(func.sum(ActivityLog.commits_count)).scalar() or 0
    
    # Trends
    daily_commits = db.query(
        ActivityLog.date_str,
        func.sum(ActivityLog.commits_count).label("commits")
    ).group_by(ActivityLog.date_str).order_by(ActivityLog.date_str.desc()).limit(30).all()
    
    return {
        "metrics": {
            "students": total_students,
            "classrooms": total_classrooms,
            "assignments": total_assignments,
            "commits": total_commits
        },
        "trends": [dict(r._asdict()) for r in daily_commits]
    }

@router.post("/archive/preview")
def preview_archive_data(
    department: str,
    batch: str,
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    # Logic to count data based on Dept, Batch (Classroom filters) and Date Range
    # Filter classrooms by department and batch
    classrooms = db.query(Classroom).filter(
        Classroom.department == department,
        Classroom.batch == batch
    ).all()
    
    classroom_ids = [c.id for c in classrooms]
    
    # Count students in these classrooms
    student_count = db.query(Student).filter(Student.classroom_id.in_(classroom_ids)).count() if classroom_ids else 0
    
    # Count assignments in these classrooms (within date range if possible)
    assignment_count = db.query(Assignment).filter(Assignment.classroom_id.in_(classroom_ids)).count() if classroom_ids else 0
    
    # Count classrooms
    classroom_count = len(classrooms)
    
    # Count commits from activity logs (filter by date_str range)
    students_in_classrooms = db.query(Student.id).filter(Student.classroom_id.in_(classroom_ids)).all() if classroom_ids else []
    student_ids = [s.id for s in students_in_classrooms]
    
    commit_count = db.query(func.sum(ActivityLog.commits_count)).filter(
        ActivityLog.student_id.in_(student_ids),
        ActivityLog.date_str >= start_date,
        ActivityLog.date_str <= end_date
    ).scalar() or 0 if student_ids else 0
    
    # Count projects (unique repos from activity logs)
    project_count = db.query(func.count(func.distinct(ActivityLog.student_id))).filter(
        ActivityLog.student_id.in_(student_ids),
        ActivityLog.date_str >= start_date,
        ActivityLog.date_str <= end_date
    ).scalar() or 0 if student_ids else 0
    
    return {
        "student_count": student_count,
        "assignment_count": assignment_count,
        "classroom_count": classroom_count,
        "commit_count": commit_count,
        "project_count": project_count
    }

@router.post("/archive")
def create_archive(
    archive_data: dict,
    db: Session = Depends(get_db)
):
    from database import SemesterArchive
    from datetime import datetime
    
    # Extract data from request
    department = archive_data.get("department")
    batch = archive_data.get("batch")
    semester = archive_data.get("semester")
    start_date = archive_data.get("start_date")
    end_date = archive_data.get("end_date")
    title = archive_data.get("title", "")
    notes = archive_data.get("notes", "")
    
    # Get preview data (snapshot)
    classrooms = db.query(Classroom).filter(
        Classroom.department == department,
        Classroom.batch == batch
    ).all()
    
    classroom_ids = [c.id for c in classrooms]
    
    student_count = db.query(Student).filter(Student.classroom_id.in_(classroom_ids)).count() if classroom_ids else 0
    assignment_count = db.query(Assignment).filter(Assignment.classroom_id.in_(classroom_ids)).count() if classroom_ids else 0
    classroom_count = len(classrooms)
    
    students_in_classrooms = db.query(Student.id).filter(Student.classroom_id.in_(classroom_ids)).all() if classroom_ids else []
    student_ids = [s.id for s in students_in_classrooms]
    
    commit_count = db.query(func.sum(ActivityLog.commits_count)).filter(
        ActivityLog.student_id.in_(student_ids),
        ActivityLog.date_str >= start_date,
        ActivityLog.date_str <= end_date
    ).scalar() or 0 if student_ids else 0
    
    project_count = db.query(func.count(func.distinct(ActivityLog.student_id))).filter(
        ActivityLog.student_id.in_(student_ids),
        ActivityLog.date_str >= start_date,
        ActivityLog.date_str <= end_date
    ).scalar() or 0 if student_ids else 0
    
    snapshot = {
        "students": student_count,
        "assignments": assignment_count,
        "classrooms": classroom_count,
        "commits": commit_count,
        "projects": project_count
    }
    
    # Check if archive already exists
    existing = db.query(SemesterArchive).filter(
        SemesterArchive.department == department,
        SemesterArchive.batch == batch,
        SemesterArchive.semester == semester
    ).first()
    
    if existing:
        # Update existing
        existing.start_date = start_date
        existing.end_date = end_date
        existing.title = title
        existing.notes = notes
        existing.snapshot_data = json.dumps(snapshot)
        existing.created_at = datetime.utcnow()
    else:
        # Create new
        new_archive = SemesterArchive(
            department=department,
            batch=batch,
            semester=semester,
            start_date=start_date,
            end_date=end_date,
            title=title,
            notes=notes,
            snapshot_data=json.dumps(snapshot)
        )
        db.add(new_archive)
    
    db.commit()
    
    return {"message": "Archive created successfully", "snapshot": snapshot}

@router.get("/archives")
def get_all_archives(db: Session = Depends(get_db)):
    from database import SemesterArchive
    archives = db.query(SemesterArchive).order_by(SemesterArchive.created_at.desc()).all()
    return archives
