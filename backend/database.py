from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'tracker.db')}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String)
    avatar_url = Column(String)
    access_token = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    classrooms = relationship("Classroom", back_populates="owner")

class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    org_id = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    term = Column(String)
    subject_code = Column(String)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="classrooms")
    students = relationship("Student", back_populates="classroom")
    assignments = relationship("Assignment", back_populates="classroom")

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    student_id = Column(String) # School/College ID
    email = Column(String)
    github_username = Column(String, unique=True, index=True)
    profile_url = Column(String)
    avatar_url = Column(String)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    enrollment_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active") # active, inactive, dropped
    last_updated = Column(DateTime, default=datetime.utcnow)
    
    # Metrics (These will now be 'Current/Overall' cached stats)
    total_commits = Column(Integer, default=0)
    pull_requests = Column(Integer, default=0)
    issues = Column(Integer, default=0)
    reviews = Column(Integer, default=0)
    total_events = Column(Integer, default=0)
    repo_count = Column(Integer, default=0)
    active_days = Column(Integer, default=0)
    
    # Derived scores
    activity_score = Column(Integer, default=0)

    # Relationships
    classroom = relationship("Classroom", back_populates="students")
    logs = relationship("ActivityLog", back_populates="student", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student")

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"))
    type = Column(String) # individual, group
    deadline = Column(DateTime)
    points = Column(Integer)
    visibility = Column(Boolean, default=True)
    late_policy = Column(String)
    repo_prefix = Column(String)
    starter_code_url = Column(String)
    config = Column(String) # JSON string for additional config
    created_at = Column(DateTime, default=datetime.utcnow)

    classroom = relationship("Classroom", back_populates="assignments")
    tests = relationship("AutogradingTest", back_populates="assignment")
    submissions = relationship("Submission", back_populates="assignment")

class AutogradingTest(Base):
    __tablename__ = "autograding_tests"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    test_name = Column(String)
    test_type = Column(String) # Command, Python, Java, Node.js, I/O
    setup_commands = Column(String)
    run_command = Column(String)
    timeout = Column(Integer, default=10)
    points = Column(Integer)
    expected_output = Column(String)

    assignment = relationship("Assignment", back_populates="tests")

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    repo_url = Column(String)
    status = Column(String) # submitted, pending, graded
    grade = Column(Integer)
    autograde_score = Column(Integer)
    manual_score = Column(Integer)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="submissions")
    student = relationship("Student", back_populates="submissions")
    feedbacks = relationship("Feedback", back_populates="submission")

class Feedback(Base):
    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id"))
    instructor_id = Column(Integer, ForeignKey("users.id"))
    comment = Column(String)
    line_number = Column(Integer, nullable=True)
    file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("Submission", back_populates="feedbacks")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String)
    related_entity = Column(String) # "assignment:1", "submission:2"
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    date_str = Column(String, index=True) # YYYY-MM-DD
    
    commits_count = Column(Integer, default=0)
    pr_count = Column(Integer, default=0)
    issue_count = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    
    student = relationship("Student", back_populates="logs")
    
    __table_args__ = (UniqueConstraint('student_id', 'date_str', name='_student_date_uc'),)

def init_db():
    Base.metadata.create_all(bind=engine)
