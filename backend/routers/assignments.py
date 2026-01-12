from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, Assignment, AutogradingTest
from schemas import AssignmentCreate, AssignmentRead
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
