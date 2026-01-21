from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

import os
from dotenv import load_dotenv

# Load .env file if it exists (primarily for local dev)
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'tracker.db')}"
elif DATABASE_URL.startswith("postgres://"):
    # SQLAlchemy 1.4+ requires postgresql:// instead of postgres://
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# For SQLite, we need to allow multiple threads and enable WAL mode
engine_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=engine_args, pool_pre_ping=True)

# Enable WAL mode for SQLite
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    github_username = Column(String, unique=True, index=True)
    name = Column(String)
    email = Column(String)
    password_hash = Column(String, nullable=True) # Check nullable for migration safety, enforce in logic
    role = Column(String, default="student")
    department = Column(String, nullable=True)
    subject_name = Column(String, nullable=True)
    student_id = Column(String, nullable=True)
    avatar_url = Column(String)
    access_token = Column(String)
    phone = Column(String, nullable=True)
    leetcode_username = Column(String, nullable=True)
    hackerrank_username = Column(String, nullable=True)
    password_reset_required = Column(Boolean, default=False)
    import_batch_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    classrooms = relationship("Classroom", back_populates="owner")

class Classroom(Base):
    __tablename__ = "classrooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    org_id = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # Replaced 'term' with semester and year, though keeping term potentially for backward compat or ignoring it
    term = Column(String, nullable=True) 
    semester = Column(String)
    year = Column(String)
    subject_code = Column(String)
    faculty_name = Column(String)
    faculty_email = Column(String)
    department = Column(String, nullable=True)
    batch = Column(String, nullable=True)
    
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
    password_hash = Column(String, nullable=True)
    department = Column(String, nullable=True)
    github_username = Column(String, unique=True, index=True)
    profile_url = Column(String)
    avatar_url = Column(String)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=True)
    enrollment_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="active") # active, inactive, dropped, archived
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
    
    # Coding Platforms
    leetcode_solved = Column(Integer, default=0)
    leetcode_rating = Column(Integer, default=0)
    hackerrank_score = Column(Integer, default=0)

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
    response_link = Column(String) # For collecting answers/responses
    google_sheet_url = Column(String) # For verifying responses
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

class AssignmentReminderLog(Base):
    __tablename__ = "assignment_reminder_logs"

    id = Column(Integer, primary_key=True, index=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    student_id = Column(Integer, ForeignKey("students.id"))
    sent_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment")
    student = relationship("Student")

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    date_str = Column(String, index=True) # YYYY-MM-DD
    
    commits_count = Column(Integer, default=0)
    pr_count = Column(Integer, default=0)
    issue_count = Column(Integer, default=0)
    review_count = Column(Integer, default=0)
    
    student = relationship("Student", back_populates="logs")
    
    __table_args__ = (UniqueConstraint('student_id', 'date_str', name='_student_date_uc'),)

class SemesterArchive(Base):
    __tablename__ = "semester_archives"

    id = Column(Integer, primary_key=True, index=True)
    department = Column(String)
    batch = Column(String)
    semester = Column(String)
    start_date = Column(String)
    end_date = Column(String)
    title = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    snapshot_data = Column(String) # JSON string of metrics
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint('department', 'batch', 'semester', name='_dept_batch_sem_uc'),)

class ImportLog(Base):
    __tablename__ = "import_logs"
    id = Column(Integer, primary_key=True, index=True)
    imported_by = Column(Integer, ForeignKey("users.id"))
    import_type = Column(String) # student, faculty
    file_name = Column(String)
    total_rows = Column(Integer)
    success_count = Column(Integer)
    error_count = Column(Integer)
    status = Column(String) # completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)
