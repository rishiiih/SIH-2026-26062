from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.user import User
from app.security import verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "refresh_token": "dummy-refresh-token", # Implement actual refresh logic later
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