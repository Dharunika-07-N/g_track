from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, User, Student, Assignment, Submission, ActivityLog
from dependencies import require_role
from typing import List
from sqlalchemy import func
import datetime

router = APIRouter(prefix="/student", tags=["Student Portal"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/dashboard")
async def get_student_dashboard(payload: dict = Depends(require_role(["student"])), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get student record
    student = db.query(Student).filter(Student.email == user.email).first()
    classroom_id = student.classroom_id if student else None
    
    # Quick stats
    if classroom_id:
        total_assignments = db.query(Assignment).filter(Assignment.classroom_id == classroom_id).count()
    else:
        total_assignments = db.query(Assignment).count()
        
    submissions = db.query(Submission).filter(Submission.student_id == (student.id if student else -1)).all()
    completed_count = len([s for s in submissions if s.status == "graded" or s.status == "submitted"])
    
    # Recent activity
    recent_logs = db.query(ActivityLog).filter(ActivityLog.student_id == (student.id if student else -1)).order_by(ActivityLog.date_str.desc()).limit(7).all()
    
    # Deadlines
    deadline_query = db.query(Assignment).filter(Assignment.deadline > datetime.datetime.utcnow())
    if classroom_id:
        deadline_query = deadline_query.filter(Assignment.classroom_id == classroom_id)
    upcoming_deadlines = deadline_query.order_by(Assignment.deadline.asc()).limit(5).all()

    return {
        "profile": {
            "name": user.name,
            "github_username": user.github_username,
            "leetcode_username": user.leetcode_username,
            "avatar_url": user.avatar_url
        },
        "stats": {
            "assignments_completed": completed_count,
            "pending_assignments": total_assignments - completed_count,
            "leetcode_solved": student.leetcode_solved if student else 0,
            "github_commits": student.total_commits if student else 0,
            "completion_rate": round((completed_count / total_assignments * 100), 1) if total_assignments > 0 else 0
        },
        "recent_activity": [
            {"date": log.date_str, "commits": log.commits_count, "prs": log.pr_count} 
            for log in recent_logs
        ],
        "deadlines": [
            {"id": a.id, "title": a.title, "deadline": a.deadline}
            for a in upcoming_deadlines
        ]
    }
