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
