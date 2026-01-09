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

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    github_username = Column(String, unique=True, index=True)
    profile_url = Column(String)
    avatar_url = Column(String)
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
    logs = relationship("ActivityLog", back_populates="student", cascade="all, delete-orphan")

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
