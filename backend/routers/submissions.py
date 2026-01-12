from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, Submission, Feedback, User
from schemas import SubmissionRead, FeedbackCreate, FeedbackRead
from typing import List

router = APIRouter(prefix="/submissions", tags=["submissions"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/assignment/{assignment_id}", response_model=List[SubmissionRead])
def read_submissions(assignment_id: int, db: Session = Depends(get_db)):
    return db.query(Submission).filter(Submission.assignment_id == assignment_id).all()

@router.get("/{submission_id}", response_model=SubmissionRead)
def read_submission(submission_id: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission: raise HTTPException(status_code=404, detail="Submission not found")
    return submission

@router.post("/{submission_id}/feedback", response_model=FeedbackRead)
def create_feedback(submission_id: int, feedback: FeedbackCreate, instructor_id: int = 1, db: Session = Depends(get_db)):
    db_feedback = Feedback(**feedback.dict(), instructor_id=instructor_id)
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

@router.get("/{submission_id}/feedback", response_model=List[FeedbackRead])
def read_feedback(submission_id: int, db: Session = Depends(get_db)):
    return db.query(Feedback).filter(Feedback.submission_id == submission_id).all()

@router.patch("/{submission_id}/grade")
def update_grade(submission_id: int, grade: int, manual_score: int, db: Session = Depends(get_db)):
    submission = db.query(Submission).filter(Submission.id == submission_id).first()
    if not submission: raise HTTPException(status_code=404, detail="Submission not found")
    submission.grade = grade
    submission.manual_score = manual_score
    submission.status = "graded"
    db.commit()
    return {"message": "Grade updated"}
