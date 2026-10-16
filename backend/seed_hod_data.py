import os
import sys
from datetime import datetime, timedelta
import random

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, Classroom, Student, User, Assignment, Submission, ActivityLog, Department
from routers.auth import hash_password

def seed_hod_data():
    db = SessionLocal()
    try:
        print("Starting HOD dashboard & incomplete export data seeding...")
        
        # 1. Departments check / create
        dept = db.query(Department).first()
        if not dept:
            dept = Department(
                name="Computer Science & Engineering",
                code="CSE",
                description="Department of Computer Science & Engineering",
                hod_name="Dr. Nirmala Devi",
                hod_email="hod@college.edu",
                is_active=True
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        dept_id = dept.id

        # 2. Seed Faculty Users
        faculty_users_data = [
            {
                "name": "Dr. Sarah Jenkins",
                "email": "faculty@college.edu",
                "github_username": "sarahjenkins_faculty",
                "role": "faculty",
                "department": dept.name
            },
            {
                "name": "Prof. Rajesh Kumar",
                "email": "rajesh.faculty@college.edu",
                "github_username": "rajesh_faculty",
                "role": "faculty",
                "department": dept.name
            }
        ]

        for f_data in faculty_users_data:
            existing = db.query(User).filter(User.email == f_data["email"]).first()
            if not existing:
                new_f = User(
                    name=f_data["name"],
                    email=f_data["email"],
                    github_username=f_data["github_username"],
                    role=f_data["role"],
                    department=f_data["department"],
                    password_hash=hash_password("faculty123")
                )
                db.add(new_f)
                db.commit()
                print(f"Created faculty: {f_data['name']} ({f_data['email']})")
            else:
                existing.role = "faculty"
                existing.department = f_data["department"]
                db.commit()

        admin_user = db.query(User).filter(User.role.in_(["hod", "admin"])).first()
        owner_id = admin_user.id if admin_user else 1

        # 3. Seed Classrooms
        c1 = db.query(Classroom).filter(Classroom.subject_code == "CS301").first()
        if not c1:
            c1 = Classroom(
                name="CS301: Data Structures & Algorithms",
                description="Core computer science concepts, algorithmic analysis and implementations.",
                subject_code="CS301",
                semester="5",
                year="2026",
                term="Fall 2026",
                faculty_name="Dr. Sarah Jenkins",
                faculty_email="faculty@college.edu",
                department=dept.name,
                department_id=dept_id,
                owner_id=owner_id
            )
            db.add(c1)
            db.commit()
            db.refresh(c1)
            print("Created classroom CS301")

        c2 = db.query(Classroom).filter(Classroom.subject_code == "CS302").first()
        if not c2:
            c2 = Classroom(
                name="CS302: Full-Stack Web Technologies",
                description="Hands-on modern web applications with React, FastAPI and PostgreSQL.",
                subject_code="CS302",
                semester="5",
                year="2026",
                term="Fall 2026",
                faculty_name="Prof. Rajesh Kumar",
                faculty_email="rajesh.faculty@college.edu",
                department=dept.name,
                department_id=dept_id,
                owner_id=owner_id
            )
            db.add(c2)
            db.commit()
            db.refresh(c2)
            print("Created classroom CS302")

        # 4. Link existing students to classrooms if not linked
        students = db.query(Student).all()
        print(f"Found {len(students)} students in database.")
        for idx, s in enumerate(students):
            if not s.classroom_id:
                s.classroom_id = c1.id if idx % 2 == 0 else c2.id
            if not s.department_id:
                s.department_id = dept_id
            if not s.department:
                s.department = dept.name
        db.commit()

        # 5. Seed Assignments
        a1 = db.query(Assignment).filter(Assignment.title == "Lab 1: Git Workflow & Tree Algorithms").first()
        if not a1:
            a1 = Assignment(
                title="Lab 1: Git Workflow & Tree Algorithms",
                description="Implement Binary Search Trees and balance checks with clean Git commit history.",
                classroom_id=c1.id,
                type="individual",
                deadline=datetime.utcnow() + timedelta(days=5),
                points=100,
                response_link="https://github.com/classroom-tracker/lab-1"
            )
            db.add(a1)
            db.commit()
            db.refresh(a1)
            print("Created Assignment: Lab 1")

        a2 = db.query(Assignment).filter(Assignment.title == "Project 1: React Dashboard UI").first()
        if not a2:
            a2 = Assignment(
                title="Project 1: React Dashboard UI",
                description="Build a responsive frontend component dashboard connected to REST endpoints.",
                classroom_id=c2.id,
                type="individual",
                deadline=datetime.utcnow() + timedelta(days=10),
                points=100,
                response_link="https://github.com/classroom-tracker/project-1"
            )
            db.add(a2)
            db.commit()
            db.refresh(a2)
            print("Created Assignment: Project 1")

        # 6. Seed Submissions: Some completed, but mostly incomplete/pending for realistic tracking
        for idx, s in enumerate(students):
            # First 20 students submitted, rest are incomplete/pending or have no submission
            existing_sub = db.query(Submission).filter(Submission.student_id == s.id, Submission.assignment_id == a1.id).first()
            if not existing_sub:
                if idx < 25:
                    sub = Submission(
                        assignment_id=a1.id,
                        student_id=s.id,
                        repo_url=f"https://github.com/{s.github_username or 'student'}/lab-1",
                        status="submitted" if idx < 15 else "graded",
                        grade=85 + (idx % 15),
                        submitted_at=datetime.utcnow() - timedelta(days=random.randint(1, 3))
                    )
                elif idx < 60:
                    sub = Submission(
                        assignment_id=a1.id,
                        student_id=s.id,
                        repo_url=f"https://github.com/{s.github_username or 'student'}/lab-1",
                        status="pending",
                        grade=None,
                        submitted_at=None
                    )
                else:
                    # No submission record -> automatically counts as incomplete
                    sub = None
                
                if sub:
                    db.add(sub)

        db.commit()

        # 7. Seed Activity Logs for students to give realistic commit & activity scores
        today = datetime.utcnow().date()
        for idx, s in enumerate(students):
            # Check if student already has logs
            has_logs = db.query(ActivityLog).filter(ActivityLog.student_id == s.id).first()
            if not has_logs:
                num_days = random.randint(3, 12)
                student_commits = 0
                for d in range(num_days):
                    log_date = str(today - timedelta(days=d * 2))
                    day_commits = random.randint(1, 8)
                    student_commits += day_commits
                    log = ActivityLog(
                        student_id=s.id,
                        date_str=log_date,
                        commits_count=day_commits,
                        pr_count=1 if d % 3 == 0 else 0,
                        issue_count=1 if d % 4 == 0 else 0,
                        review_count=1 if d % 5 == 0 else 0
                    )
                    db.add(log)
                s.total_commits = student_commits
                s.activity_score = student_commits * 2 + num_days * 3
                s.repo_count = random.randint(2, 6)

        db.commit()
        print("Data seeding completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_hod_data()
