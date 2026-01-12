from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, Classroom, User
from schemas import ClassroomCreate, ClassroomRead
from typing import List

router = APIRouter(prefix="/classrooms", tags=["classrooms"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ClassroomRead)
def create_classroom(classroom: ClassroomCreate, owner_id: int = 1, db: Session = Depends(get_db)):
    db_classroom = Classroom(**classroom.dict(), owner_id=owner_id)
    db.add(db_classroom)
    db.commit()
    db.refresh(db_classroom)
    return db_classroom

@router.get("/", response_model=List[ClassroomRead])
def read_classrooms(owner_id: int = 1, db: Session = Depends(get_db)):
    return db.query(Classroom).filter(Classroom.owner_id == owner_id).all()

@router.get("/{classroom_id}", response_model=ClassroomRead)
def read_classroom(classroom_id: int, db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom: raise HTTPException(status_code=404, detail="Classroom not found")
    return classroom

@router.put("/{classroom_id}", response_model=ClassroomRead)
def update_classroom(classroom_id: int, classroom_update: ClassroomCreate, db: Session = Depends(get_db)):
    db_classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not db_classroom: raise HTTPException(status_code=404, detail="Classroom not found")
    for key, value in classroom_update.dict().items():
        setattr(db_classroom, key, value)
    db.commit()
    db.refresh(db_classroom)
    return db_classroom

@router.delete("/{classroom_id}")
def delete_classroom(classroom_id: int, db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom: raise HTTPException(status_code=404, detail="Classroom not found")
    db.delete(classroom)
    db.commit()
    return {"message": "Classroom deleted"}

@router.post("/{classroom_id}/archive")
def archive_classroom(classroom_id: int, db: Session = Depends(get_db)):
    classroom = db.query(Classroom).filter(Classroom.id == classroom_id).first()
    if not classroom: raise HTTPException(status_code=404, detail="Classroom not found")
    classroom.is_archived = True
    # Also mark all students as inactive
    from database import Student
    db.query(Student).filter(Student.classroom_id == classroom_id).update({"status": "inactive"})
    db.commit()
    return {"message": "Classroom archived successfully"}
