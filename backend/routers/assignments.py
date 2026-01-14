from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, Assignment, AutogradingTest, Student, Submission, AssignmentReminderLog
from schemas import AssignmentCreate, AssignmentRead
from services.google_sheets import google_sheets_service
from services.notifications import notification_service
from datetime import datetime
from typing import List

router = APIRouter(prefix="/assignments", tags=["assignments"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=AssignmentRead)
def create_assignment(assignment: AssignmentCreate, db: Session = Depends(get_db)):
    # Create assignment without tests first
    data = assignment.dict()
    tests_data = data.pop("tests", [])
    db_assignment = Assignment(**data)
    db.add(db_assignment)
    db.commit()
    db.refresh(db_assignment)
    
    # Add tests
    for test_data in tests_data:
        db_test = AutogradingTest(**test_data, assignment_id=db_assignment.id)
        db.add(db_test)
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.get("/classroom/{classroom_id}", response_model=List[AssignmentRead])
def read_assignments(classroom_id: int, db: Session = Depends(get_db)):
    return db.query(Assignment).filter(Assignment.classroom_id == classroom_id).all()

@router.get("/{assignment_id}", response_model=AssignmentRead)
def read_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment: raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment

@router.put("/{assignment_id}", response_model=AssignmentRead)
def update_assignment(assignment_id: int, assignment_update: AssignmentCreate, db: Session = Depends(get_db)):
    db_assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not db_assignment: raise HTTPException(status_code=404, detail="Assignment not found")
    
    data = assignment_update.dict()
    tests_data = data.pop("tests", [])
    
    for key, value in data.items():
        setattr(db_assignment, key, value)
    
    # Update tests (Delete old ones and add new ones for simplicity)
    db.query(AutogradingTest).filter(AutogradingTest.assignment_id == assignment_id).delete()
    for test_data in tests_data:
        db_test = AutogradingTest(**test_data, assignment_id=assignment_id)
        db.add(db_test)
        
    db.commit()
    db.refresh(db_assignment)
    return db_assignment

@router.delete("/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment: raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}

@router.post("/{assignment_id}/analyze")
def analyze_assignment_submissions(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if not assignment.google_sheet_url:
        raise HTTPException(status_code=400, detail="Google Sheet URL not configured for this assignment")
    
    try:
        responses = google_sheets_service.get_sheet_responses(assignment.google_sheet_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    # Get all students in this classroom
    students = db.query(Student).filter(Student.classroom_id == assignment.classroom_id).all()
    
    # Identify submitted students by Email or Roll No
    # We'll try to match "Email" or "Email Address" or "Email ID" or "Roll No" columns
    submitted_identifiers = set()
    for resp in responses:
        # Normalize keys to lowercase for matching
        resp_lower = {str(k).lower().strip(): str(v).lower().strip() for k, v in resp.items()}
        
        email = resp_lower.get("email") or resp_lower.get("email address") or resp_lower.get("email id")
        roll_no = resp_lower.get("roll no") or resp_lower.get("roll number") or resp_lower.get("id")
        
        if email: submitted_identifiers.add(email)
        if roll_no: submitted_identifiers.add(roll_no)

    results = []
    summary = {"completed": 0, "pending": 0}

    for student in students:
        is_submitted = (
            student.email.lower() in submitted_identifiers if student.email else False
        ) or (
            student.student_id.lower() in submitted_identifiers if student.student_id else False
        )
        
        # Check if submission record exists
        submission = db.query(Submission).filter(
            Submission.assignment_id == assignment_id,
            Submission.student_id == student.id
        ).first()
        
        status = "submitted" if is_submitted else "pending"
        
        if not submission:
            submission = Submission(
                assignment_id=assignment_id,
                student_id=student.id,
                status=status,
                submitted_at=datetime.utcnow() if is_submitted else None
            )
            db.add(submission)
        else:
            # Only update if status changed from pending to submitted
            if status == "submitted" and submission.status == "pending":
                submission.status = "submitted"
                submission.submitted_at = datetime.utcnow()
        
        if is_submitted:
            summary["completed"] += 1
        else:
            summary["pending"] += 1
            
        results.append({
            "student_id": student.id,
            "name": student.name,
            "email": student.email,
            "status": status
        })
    
    db.commit()
    return {"summary": summary, "students": results}

@router.post("/{assignment_id}/send-reminders")
def send_assignment_reminders(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Find pending submissions
    pending_submissions = db.query(Submission).filter(
        Submission.assignment_id == assignment_id,
        Submission.status == "pending"
    ).all()
    
    sent_count = 0
    cooldown_hours = 24
    now = datetime.utcnow()
    
    for sub in pending_submissions:
        student = sub.student
        if not student or not student.email:
            continue
        
        # Check cooldown: only send if not notified in the last 24 hours
        last_log = db.query(AssignmentReminderLog).filter(
            AssignmentReminderLog.assignment_id == assignment_id,
            AssignmentReminderLog.student_id == student.id
        ).order_by(AssignmentReminderLog.sent_at.desc()).first()
        
        if last_log and (now - last_log.sent_at).total_seconds() < cooldown_hours * 3600:
            continue
        
        # Send reminder
        success = notification_service.send_assignment_reminder(
            student_name=student.name,
            student_email=student.email,
            assignment_title=assignment.title,
            deadline=assignment.deadline
        )
        
        if success:
            # Log reminder
            log = AssignmentReminderLog(
                assignment_id=assignment_id,
                student_id=student.id,
                sent_at=now
            )
            db.add(log)
            sent_count += 1
            
    db.commit()
    return {"message": f"Reminders sent to {sent_count} students"}

@router.get("/{assignment_id}/status")
def get_assignment_status(assignment_id: int, db: Session = Depends(get_db)):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    submissions = db.query(Submission).filter(Submission.assignment_id == assignment_id).all()
    
    completed = sum(1 for s in submissions if s.status in ["submitted", "graded"])
    pending = sum(1 for s in submissions if s.status == "pending")
    
    return {
        "assignment_title": assignment.title,
        "classroom_id": assignment.classroom_id,
        "summary": {
            "completed": completed,
            "pending": pending,
            "total": len(submissions)
        }
    }
