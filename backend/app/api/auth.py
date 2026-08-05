from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

from app.database.connection import get_db
from app.services.auth_service import auth_service
from app.schemas.users import Token, UserResponse, UserUpdate
from app.authentication.jwt import get_current_user
from app.models.users import User, UserRole, UserStatus

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    company_name: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    password: str = Field(..., min_length=8)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = False

class RefreshRequest(BaseModel):
    refresh_token: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

def get_client_details(request: Request):
    """Utility to extract IP address and User Agent browser details."""
    ip = request.client.host if request.client else None
    browser = request.headers.get("user-agent", "Unknown Browser")
    return ip, browser

@router.post("/login", response_model=Token)
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    ip, browser = get_client_details(request)
    # Authenticate and retrieve user
    user = auth_service.authenticate_user(db, data.email, data.password, ip, browser)
    
    # Calculate access token expiry if "remember_me" is checked
    from datetime import timedelta
    from app.authentication.jwt import create_access_token
    expires = timedelta(days=30) if data.remember_me else None
    
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": user
    }

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ip, browser = get_client_details(request)
    auth_service.logout_user(db, current_user, ip, browser)
    return {"message": "Successfully logged out"}

@router.post("/refresh")
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    access_token, new_refresh = auth_service.refresh_tokens(db, data.refresh_token)
    # Fetch user to return in payload
    user = db.query(User).filter(User.refresh_token == new_refresh).first()
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": user,
        "refresh_token": new_refresh
    }

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    reset_token = auth_service.request_password_reset(db, data.email)
    # For local demonstration and development, we will return the token in response
    # to bypass missing SMTP mail infrastructure.
    return {
        "message": "If this email is registered, you will receive a reset code.",
        "reset_token": reset_token  # Returned for ease of sandbox test
    }

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    success = auth_service.reset_password(db, data.token, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset password"
        )
    return {"message": "Password reset successful"}

@router.post("/change-password")
def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    success = auth_service.change_password(
        db, current_user, data.current_password, data.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to change password"
        )
    return {"message": "Password changed successfully"}

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )
    
    from app.authentication.jwt import get_password_hash
    hashed = get_password_hash(data.password)
    
    new_user = User(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        phone=data.phone,
        password_hash=hashed,
        company_name=data.company_name,
        role=UserRole.ACCOUNTANT,
        status=UserStatus.ACTIVE
    )
    db.add(new_user)
    
    if data.company_name:
        from app.models.settings import SystemSettings
        settings_rec = db.query(SystemSettings).first()
        if settings_rec:
            settings_rec.company_name = data.company_name
            
    db.commit()
    db.refresh(new_user)
    
    from app.repositories.audit_repository import audit_repository
    audit_repository.create(
        db,
        user_id=new_user.id,
        action="USER_REGISTRATION",
        description=f"Public signup completed for user: {new_user.email}"
    )
    
    return {"message": "Account registered successfully", "user": {
        "id": new_user.id,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "email": new_user.email
    }}
