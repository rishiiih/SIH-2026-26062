from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.db import get_db
from app.models.user import User
from app.security import verify_password, create_access_token, get_current_user, get_password_hash  # Ensure get_password_hash is imported

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class RegisterSchema(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: str
    password: str
    role_id: Optional[int] = 1
    station_id: Optional[int] = None

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: RegisterSchema, db: Session = Depends(get_db)):
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Hash password and create new user
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        password_hash=hashed_pwd,
        role_id=user_data.role_id,
        station_id=user_data.station_id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.id}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": "dummy-refresh-token",
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "role_id": user.role_id,
            "station_id": user.station_id,
            "full_name": user.full_name
        }
    }

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user