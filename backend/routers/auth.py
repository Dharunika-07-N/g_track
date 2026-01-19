from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
import bcrypt
from pydantic import BaseModel
from typing import Optional
from database import SessionLocal, User
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

class RegisterRequest(BaseModel):
    github_username: str
    email: str
    password: str
    role: str = "student"  # student, faculty, hod
    name: Optional[str] = None
    department: Optional[str] = None
    subject_name: Optional[str] = None
    student_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def create_token(user_id: int, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if HOD already exists for this department
    if req.role == "hod" or req.role == "admin":
        if not req.department:
            raise HTTPException(status_code=400, detail="Department is required for HOD registration")
        
        existing_hod = db.query(User).filter(
            User.role.in_(["hod", "admin"]),
            User.department == req.department
        ).first()
        
        if existing_hod:
            raise HTTPException(
                status_code=400, 
                detail=f"An HOD/Admin already exists for the {req.department} department. Only one HOD per department is allowed."
            )
    
    # Create user
    user = User(
        github_username=req.github_username,
        email=req.email,
        password_hash=hash_password(req.password),
        role=req.role,
        name=req.name or req.github_username,
        department=req.department,
        subject_name=req.subject_name,
        student_id=req.student_id,
        created_at=datetime.utcnow()
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_token(user.id, user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=user.id
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
        
    if not user.password_hash:
        # Handle users created before auth (e.g. default admin)
        # For now error out or perhaps allow if password matches some default?
        # Better to raise invalid credentials
        raise HTTPException(status_code=401, detail="Invalid credentials (legacy user, please reset password)")

    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user.id, user.role or "student")
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role or "student",
        user_id=user.id
    )

@router.get("/me")
def get_current_user(payload: dict = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "github_username": user.github_username
    }
