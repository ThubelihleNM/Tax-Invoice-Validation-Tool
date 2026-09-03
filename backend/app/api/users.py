from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

from app.database.connection import get_db
from app.services.user_service import user_service
from app.repositories.user_repository import user_repository
from app.schemas.users import UserResponse, UserCreate, UserUpdate
from app.models.users import User, UserRole, UserStatus
from app.authentication.jwt import (
    get_current_user,
    require_admin,
    require_any_role,
    get_password_hash
)

router = APIRouter(prefix="/users", tags=["Users"])

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    bio: Optional[str] = None
    theme_preference: Optional[str] = None
    language_preference: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None
    fraud_alerts: Optional[bool] = None
    validation_alerts: Optional[bool] = None
    report_notifications: Optional[bool] = None
    
    # SaaS onboarding fields
    business_registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    tax_system: Optional[str] = None
    occupation: Optional[str] = None
    profession: Optional[str] = None
    country_code: Optional[str] = None


@router.get("", response_model=UserListResponse)
def get_users(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    status: Optional[UserStatus] = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Retrieve search-filtered list of users (Admin only)."""
    users, total = user_repository.get_multi(
        db, skip=skip, limit=limit, search=search, role=role, status=status
    )
    return {"users": users, "total": total}

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Create a user account (Admin only)."""
    return user_service.create_user(db, admin_user.id, data)

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Update details/status/role of a user (Admin only)."""
    return user_service.update_user(db, admin_user.id, id, data)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Delete a user account (Admin only)."""
    if admin_user.id == id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account."
        )
    success = user_service.delete_user(db, admin_user.id, id)
    return {"message": "User deleted successfully"}

@router.post("/{id}/reset-password")
def admin_reset_password(
    id: int,
    data: AdminResetPasswordRequest,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin)
):
    """Admin-override to force reset a user's password."""
    user = user_repository.get_by_id(db, id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    user.password_hash = get_password_hash(data.new_password)
    user.failed_login_attempts = 0
    db.commit()
    
    from app.repositories.audit_repository import audit_repository
    audit_repository.create(
        db,
        user_id=admin_user.id,
        action="ADMIN_RESET_PASSWORD",
        description=f"Admin reset password for user: {user.email}"
    )
    return {"message": f"Password reset successfully for {user.email}"}

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(require_any_role)):
    """Retrieve profile of the active user."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db)
):
    """Allow active user to update their own name/phone number/preferences."""
    user_in = UserUpdate(
        first_name=data.first_name,
        last_name=data.last_name,
        phone=data.phone,
        company_name=data.company_name,
        job_title=data.job_title,
        country=data.country,
        city=data.city,
        address=data.address,
        postal_code=data.postal_code,
        tax_id=data.tax_id,
        bio=data.bio,
        theme_preference=data.theme_preference,
        language_preference=data.language_preference,
        timezone=data.timezone,
        email_notifications=data.email_notifications,
        system_notifications=data.system_notifications,
        fraud_alerts=data.fraud_alerts,
        validation_alerts=data.validation_alerts,
        report_notifications=data.report_notifications,
        business_registration_number=data.business_registration_number,
        tax_number=data.tax_number,
        tax_system=data.tax_system,
        occupation=data.occupation,
        profession=data.profession,
        country_code=data.country_code
    )
    return user_service.update_user(db, current_user.id, current_user.id, user_in)

@router.post("/profile/photo", response_model=UserResponse)
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db)
):
    """Upload/replace own profile photo (PNG, JPG, JPEG, <= 5MB)."""
    return user_service.save_profile_photo(db, current_user, file)

@router.delete("/profile/photo", response_model=UserResponse)
def remove_profile_photo(
    current_user: User = Depends(require_any_role),
    db: Session = Depends(get_db)
):
    """Remove user's profile photo, setting it to null."""
    current_user.profile_photo = None
    db.commit()
    db.refresh(current_user)
    return current_user
