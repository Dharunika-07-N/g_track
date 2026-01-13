from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict

class UserBase(BaseModel):
    github_username: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None

class UserRead(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ClassroomBase(BaseModel):
    name: str
    description: Optional[str] = None
    org_id: Optional[str] = None
    term: Optional[str] = None
    semester: Optional[str] = None
    year: Optional[str] = None
    subject_code: Optional[str] = None
    faculty_name: Optional[str] = None
    faculty_email: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    is_archived: bool = False

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomRead(ClassroomBase):
    id: int
    owner_id: int
    created_at: datetime
    students: List['StudentRead'] = []
    assignments: List['AssignmentRead'] = []
    class Config:
        from_attributes = True

class StudentBase(BaseModel):
    name: str
    github_username: str
    student_id: Optional[str] = None
    email: Optional[str] = None

class StudentCreate(StudentBase):
    classroom_id: Optional[int] = None
    profile_url: Optional[str] = None

class StudentRead(StudentBase):
    id: int
    classroom_id: Optional[int]
    profile_url: Optional[str]
    avatar_url: Optional[str]
    total_commits: int
    pull_requests: int
    issues: int
    reviews: int
    repo_count: int
    total_events: int
    activity_score: int
    active_days: int
    last_updated: datetime
    status: str
    class Config:
        from_attributes = True

class AutogradingTestBase(BaseModel):
    test_name: str
    test_type: str # Command, Python, Java, Node.js, I/O
    setup_commands: Optional[str] = None
    run_command: str
    timeout: int = 10
    points: int = 0
    expected_output: Optional[str] = None

class AutogradingTestCreate(AutogradingTestBase):
    pass

class AutogradingTestRead(AutogradingTestBase):
    id: int
    assignment_id: int
    class Config:
        from_attributes = True

class AssignmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    type: str # individual, group
    deadline: datetime
    points: int
    visibility: bool = True
    late_policy: Optional[str] = None
    repo_prefix: Optional[str] = None
    starter_code_url: Optional[str] = None
    response_link: Optional[str] = None
    config: Optional[str] = None

class AssignmentCreate(AssignmentBase):
    classroom_id: int
    tests: List[AutogradingTestCreate] = []

class AssignmentRead(AssignmentBase):
    id: int
    classroom_id: int
    created_at: datetime
    tests: List[AutogradingTestRead] = []
    class Config:
        from_attributes = True

class SubmissionBase(BaseModel):
    repo_url: str
    status: str
    grade: Optional[int] = None
    autograde_score: Optional[int] = None
    manual_score: Optional[int] = None

class SubmissionRead(SubmissionBase):
    id: int
    assignment_id: int
    student_id: int
    submitted_at: datetime
    class Config:
        from_attributes = True

class FeedbackBase(BaseModel):
    comment: str
    line_number: Optional[int] = None
    file_path: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    submission_id: int

class FeedbackRead(FeedbackBase):
    id: int
    submission_id: int
    instructor_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class SemesterArchiveBase(BaseModel):
    department: str
    batch: str
    semester: str
    start_date: str
    end_date: str
    title: Optional[str] = None
    notes: Optional[str] = None

class SemesterArchiveCreate(SemesterArchiveBase):
    pass

class SemesterArchiveRead(SemesterArchiveBase):
    id: int
    snapshot_data: str # JSON string
    created_at: datetime
    class Config:
        from_attributes = True

ClassroomRead.model_rebuild()
AssignmentRead.model_rebuild()
SubmissionRead.model_rebuild()
