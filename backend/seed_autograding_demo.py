from sqlalchemy.orm import Session
from database import SessionLocal, User, Classroom, Student, Assignment, Submission, AutogradingTest, init_db
from routers.auth import hash_password
from datetime import datetime, timedelta
import random

def seed_autograding_demo():
    print("Seeding database for Autograding Demo...")
    init_db()
    db = SessionLocal()
    
    try:
        # 1. Create Instructor
        instructor = db.query(User).filter(User.email == "demo@faculty.com").first()
        if not instructor:
            instructor = User(
                github_username="demo_faculty",
                email="demo@faculty.com",
                password_hash=hash_password("password123"),
                role="faculty",
                name="Prof. Demo"
            )
            db.add(instructor)
            db.commit()
            print("Created Instructor: demo@faculty.com / password123")
        
        # 2. Create Classroom
        classroom = db.query(Classroom).filter(Classroom.name == "Python 101").first()
        if not classroom:
            classroom = Classroom(
                name="Python 101",
                subject_code="CS101",
                year="2024", # String
                semester="1",
                faculty_name="Prof. Demo",
                owner_id=instructor.id
            )
            db.add(classroom)
            db.commit()
            print("Created Classroom: Python 101")
            
        # 3. Create Student
        student = db.query(Student).filter(Student.github_username == "demo_student").first()
        if not student:
            student = Student(
                name="Demo Student",
                student_id="S12345",
                github_username="demo_student",
                email="student@demo.com", # Replace with your email for testing notifications
                password_hash=hash_password("password123"),
                classroom_id=classroom.id,
                total_commits=15,
                activity_score=45
            )
            db.add(student)
            db.commit()
            print("Created Student: demo_student")

        # 4. Create Assignment with Autograding Test
        assignment = db.query(Assignment).filter(Assignment.title == "Hello World").first()
        if not assignment:
            assignment = Assignment(
                title="Hello World",
                description="Write a Python script that prints 'Hello World'",
                classroom_id=classroom.id,
                deadline=datetime.utcnow() + timedelta(days=2),
                type="Individual",
                points=10
            )
            db.add(assignment)
            db.commit()
            
            # Add Test Case
            test = AutogradingTest(
                assignment_id=assignment.id,
                test_name="Output Check",
                run_command="python main.py",
                expected_output="Hello World",
                test_type="strict",
                points=10
            )
            db.add(test)
            db.commit()
            print("Created Assignment: Hello World with Autograding Test")

        # 5. Create Submission (Simulated)
        # Using a real repo I created for this demo, or a generic one.
        # Let's use a popular public simple repo or just standard Flask/Python repo.
        # Ideally, we need a repository that actually has `main.py` printing `Hello World`.
        # I'll point to a generic harmless one for now, grading WILL FAIL unless it matches.
        # To make it PASS, we need a correct repo.
        # I will create a temporary local repo path for testing if 'file://' urls are allowed by gitpython, 
        # but the request likely implies remote.
        # Let's set a dummy one.
        dummy_repo_url = "https://github.com/octocat/Hello-World" # This usually doesn't have main.py printing Hello World
        
        submission = db.query(Submission).filter(Submission.assignment_id == assignment.id, Submission.student_id == student.id).first()
        if not submission:
            submission = Submission(
                assignment_id=assignment.id,
                student_id=student.id,
                repo_url=dummy_repo_url, 
                submitted_at=datetime.utcnow(),
                status="submitted"
            )
            db.add(submission)
            db.commit()
            print(f"Created Submission for {student.name}")

    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_autograding_demo()
