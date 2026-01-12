from backend.database import SessionLocal, Classroom, Student, User, Assignment
from backend.main import init_db
from datetime import datetime, timedelta

def seed_demo():
    init_db()
    db = SessionLocal()
    
    # Check for instructor
    admin = db.query(User).filter(User.github_username == "admin").first()
    if not admin:
        admin = User(github_username="admin", name="Default Instructor", email="admin@example.com")
        db.add(admin)
        db.commit()
        db.refresh(admin)

    # Create a classroom
    classroom = db.query(Classroom).filter(Classroom.name == "CS101: Web Development").first()
    if not classroom:
        classroom = Classroom(
            name="CS101: Web Development",
            description="Introduction to HTML, CSS, and modern JavaScript frameworks.",
            subject_code="CS101",
            term="Spring 2026",
            owner_id=admin.id
        )
        db.add(classroom)
        db.commit()
        db.refresh(classroom)
        print(f"Created classroom: {classroom.name}")
    else:
        print("Classroom already exists")

    # Link all students to this classroom if they don't have one
    students = db.query(Student).all()
    for s in students:
        if s.classroom_id is None:
            s.classroom_id = classroom.id
            print(f"Linked student {s.github_username} to CS101")
    
    # Create an assignment
    assignment = db.query(Assignment).filter(Assignment.title == "Lab 1: HTML Basics").first()
    if not assignment:
        assignment = Assignment(
            title="Lab 1: HTML Basics",
            description="Create a personal portfolio website using semantic HTML.",
            classroom_id=classroom.id,
            type="individual",
            deadline=datetime.utcnow() + timedelta(days=7),
            points=100
        )
        db.add(assignment)
        db.commit()
        db.refresh(assignment)
        print(f"Created assignment: {assignment.title}")

    db.commit()
    db.close()
    print("Seeding complete.")

if __name__ == "__main__":
    seed_demo()
