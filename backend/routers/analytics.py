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
def export_full_history(classroom_id: int = None, db: Session = Depends(get_db)):
    # Join Students, Logs, Submissions, Assignments
    query = db.query(
        Student.name.label("student_name"),
        Student.github_username,
        ActivityLog.date_str,
        ActivityLog.commits_count,
        ActivityLog.pr_count,
        ActivityLog.issue_count,
        ActivityLog.review_count
    ).join(ActivityLog, Student.id == ActivityLog.student_id)
    
    if classroom_id:
        query = query.filter(Student.classroom_id == classroom_id)
        
    df_activity = pd.DataFrame([dict(r._asdict()) for r in query.all()])
    
    # Also get submissions
    sub_query = db.query(
        Student.name.label("student_name"),
        Assignment.title.label("assignment_title"),
        Submission.status,
        Submission.grade,
        Submission.autograde_score,
        Submission.manual_score,
        Submission.submitted_at
    ).join(Submission, Student.id == Submission.student_id)\
     .join(Assignment, Submission.assignment_id == Assignment.id)
     
    if classroom_id:
        sub_query = sub_query.filter(Student.classroom_id == classroom_id)
        
    df_submissions = pd.DataFrame([dict(r._asdict()) for r in sub_query.all()])
    
    # Combine into an Excel file with multiple sheets
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        if not df_activity.empty:
            df_activity.to_excel(writer, sheet_name='Activity History', index=False)
        if not df_submissions.empty:
            df_submissions.to_excel(writer, sheet_name='Assignment Submissions', index=False)
            
    output.seek(0)
    
    headers = {
        'Content-Disposition': 'attachment; filename="classroom_history_report.xlsx"'
    }
    return StreamingResponse(output, headers=headers, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

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
    
    # 1. Find Classrooms matching Dept & Batch
    # Note: Since Dept/Batch are new, we might strictly filter or loose filter.
    # For now, let's assuming strict filter if data exists, otherwise maybe all? 
    # The requirement implies specific segmentation.
    
    classrooms = db.query(Classroom).filter(
        Classroom.department == department,
        Classroom.batch == batch
    ).all()
    
    classroom_ids = [c.id for c in classrooms]
    
    # If no classrooms found, maybe return 0 or try to find by string matching?
    # Let's stick to strict relation for correctness.
    
    # 2. Students in those classrooms
    students = db.query(Student).filter(Student.classroom_id.in_(classroom_ids)).all()
    student_ids = [s.id for s in students]
    
    # 3. Filter data by date range
    # ActivityLogs
    commits = db.query(func.sum(ActivityLog.commits_count)).filter(
        ActivityLog.student_id.in_(student_ids),
        ActivityLog.date_str >= start_date,
        ActivityLog.date_str <= end_date
    ).scalar() or 0
    
    # Assignments created in range in those classrooms
    assignments_count = db.query(Assignment).filter(
        Assignment.classroom_id.in_(classroom_ids),
        Assignment.created_at >= start_date,
        Assignment.created_at <= end_date
    ).count()
    
    # Classrooms created (maybe just count the matched ones created in range? or all matched?)
    # "Classrooms created" usually implies created_at
    classrooms_count = db.query(Classroom).filter(
        Classroom.id.in_(classroom_ids),
        Classroom.created_at >= start_date,
        Classroom.created_at <= end_date
    ).count()
    
    # Submissions/Projects (Repos)
    # Projects: distinct repos in submissions or maybe student repo_count?
    # Let's count submissions in range
    submissions_count = db.query(Submission).filter(
        Submission.student_id.in_(student_ids),
        Submission.submitted_at >= start_date,
        Submission.submitted_at <= end_date
    ).count()
    
    return {
        "student_count": len(students),
        "assignment_count": assignments_count,
        "classroom_count": classrooms_count,
        "commit_count": commits,
        "project_count": submissions_count # Using submissions as proxy for projects for now
    }

from schemas import SemesterArchiveCreate, SemesterArchiveRead
from database import SemesterArchive

@router.post("/archive", response_model=SemesterArchiveRead)
def create_archive(data: SemesterArchiveCreate, db: Session = Depends(get_db)):
    # Check if exists (handling via UniqueConstraint usually raises generic db error, better check manually)
    existing = db.query(SemesterArchive).filter(
        SemesterArchive.department == data.department,
        SemesterArchive.batch == data.batch,
        SemesterArchive.semester == data.semester
    ).first()
    
    # Calculate snapshot data again to store it
    # Re-use logic from preview (simplified)
    classrooms = db.query(Classroom).filter(
        Classroom.department == data.department,
        Classroom.batch == data.batch
    ).all()
    c_ids = [c.id for c in classrooms]
    s_ids = [s.id for s in db.query(Student).filter(Student.classroom_id.in_(c_ids)).all()]
    
    commits = db.query(func.sum(ActivityLog.commits_count)).filter(
        ActivityLog.student_id.in_(s_ids),
        ActivityLog.date_str >= data.start_date,
        ActivityLog.date_str <= data.end_date
    ).scalar() or 0
    
    assignments = db.query(Assignment).filter(
        Assignment.classroom_id.in_(c_ids),
        Assignment.created_at >= data.start_date,
        Assignment.created_at <= data.end_date
    ).count()
    
    classrooms_cnt = db.query(Classroom).filter(
        Classroom.id.in_(c_ids),
        Classroom.created_at >= data.start_date,
        Classroom.created_at <= data.end_date
    ).count()
    
    project_cnt = db.query(Submission).filter(
        Submission.student_id.in_(s_ids),
        Submission.submitted_at >= data.start_date,
        Submission.submitted_at <= data.end_date
    ).count()
    
    snapshot = {
        "students": len(s_ids),
        "assignments": assignments,
        "classrooms": classrooms_cnt,
        "commits": commits,
        "projects": project_cnt
    }
    
    if existing:
        # Overwrite
        existing.start_date = data.start_date
        existing.end_date = data.end_date
        existing.title = data.title
        existing.notes = data.notes
        existing.snapshot_data = json.dumps(snapshot)
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_archive = SemesterArchive(
            department=data.department,
            batch=data.batch,
            semester=data.semester,
            start_date=data.start_date,
            end_date=data.end_date,
            title=data.title,
            notes=data.notes,
            snapshot_data=json.dumps(snapshot)
        )
        db.add(new_archive)
        db.commit()
        db.refresh(new_archive)
        return new_archive

@router.get("/archives")
def get_archives(department: str = None, batch: str = None, db: Session = Depends(get_db)):
    query = db.query(SemesterArchive)
    if department:
        query = query.filter(SemesterArchive.department == department)
    if batch:
        query = query.filter(SemesterArchive.batch == batch)
    return query.all()
