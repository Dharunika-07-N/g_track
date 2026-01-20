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
        
        # Additional check to ensure ONLY the authorized user can use the app
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.id == payload["user_id"]).first()
            if not user or user.email != "dharunikaktm@gmail.com":
                raise HTTPException(status_code=403, detail="Access Restricted: Only authorized personnel allowed.")
        finally:
            db.close()
            
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Registration disabled as per user request
    raise HTTPException(status_code=403, detail="Registration is currently disabled.")

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # STRICT ACCESS CONTROL: Only allowed user
    AUTHORIZED_EMAIL = "dharunikaktm@gmail.com"
    AUTHORIZED_PASS = "12345"
    AUTHORIZED_ROLE = "hod"

    if req.email != AUTHORIZED_EMAIL or req.password != AUTHORIZED_PASS:
        raise HTTPException(status_code=403, detail="Access Restricted: Only authorized personnel allowed.")

    user = db.query(User).filter(User.email == AUTHORIZED_EMAIL).first()
    
    # If the user doesn't exist in the DB, we might want to create them or 
    # mock them. To ensure the app works (which usually expects a DB user), 
    # we'll look for them.
    if not user:
        # Create the authorized user if they don't exist
        user = User(
            email=AUTHORIZED_EMAIL,
            password_hash=hash_password(AUTHORIZED_PASS),
            role=AUTHORIZED_ROLE,
            name="HOD Dharunika",
            github_username="dharunika", # placeholder
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif user.role != AUTHORIZED_ROLE:
        # Force the role to HOD if it's different
        user.role = AUTHORIZED_ROLE
        user.password_hash = hash_password(AUTHORIZED_PASS)
        db.commit()
        db.refresh(user)

    token = create_token(user.id, user.role)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
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
