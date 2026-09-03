from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.users import UserRole, UserStatus

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    role: UserRole = UserRole.ACCOUNTANT
    status: UserStatus = UserStatus.ACTIVE
    
    # SaaS onboarding fields
    account_type: str = "PERSONAL"
    business_registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    tax_system: Optional[str] = None
    occupation: Optional[str] = None
    profession: Optional[str] = None
    country_code: Optional[str] = None
    company_id: Optional[int] = None
    
    # Extended settings (Optional)
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = "USD"
    currency_symbol: Optional[str] = "$"
    bio: Optional[str] = None
    theme_preference: str = "light"
    language_preference: str = "en"
    timezone: str = "UTC"
    email_notifications: bool = True
    system_notifications: bool = True
    fraud_alerts: bool = True
    validation_alerts: bool = True
    report_notifications: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None
    
    account_type: Optional[str] = None
    business_registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    tax_system: Optional[str] = None
    occupation: Optional[str] = None
    profession: Optional[str] = None
    country_code: Optional[str] = None
    company_id: Optional[int] = None
    
    company_name: Optional[str] = None
    job_title: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    currency: Optional[str] = None
    bio: Optional[str] = None
    theme_preference: Optional[str] = None
    language_preference: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None
    system_notifications: Optional[bool] = None
    fraud_alerts: Optional[bool] = None
    validation_alerts: Optional[bool] = None
    report_notifications: Optional[bool] = None

class UserResponse(UserBase):
    id: int
    profile_photo: Optional[str] = None
    last_login: Optional[datetime] = None
    last_password_change: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user: UserResponse
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
