from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timedelta, timezone
import secrets

from app.config.config import settings
from app.database.connection import get_db
from app.services.auth_service import auth_service
from app.schemas.users import Token, UserResponse, UserUpdate
from app.authentication.jwt import get_current_user, create_access_token, get_password_hash
from app.models.users import User, UserRole, UserStatus, AccountType
from app.models.companies import Company
from app.models.countries import Country
from app.repositories.audit_repository import audit_repository

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    account_type: str = "PERSONAL"
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    tax_system: Optional[str] = None
    password: str = Field(..., min_length=8)
    confirm_password: Optional[str] = None
    
    # Personal specific
    occupation: Optional[str] = None
    profession: Optional[str] = None
    
    # Company specific
    company_name: Optional[str] = None
    business_registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    
    # Common location details
    city: Optional[str] = None
    address: Optional[str] = None


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
    expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS) if data.remember_me else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    account_type_val = user.account_type.value if hasattr(user.account_type, "value") else str(user.account_type)
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)

    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": role_val,
            "account_type": account_type_val
        },
        expires_delta=expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role_val,
        "user": user,
        "refresh_token": user.refresh_token
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user's authoritative profile directly from database."""
    return current_user

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(request: Request, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ip, browser = get_client_details(request)
    auth_service.logout_user(db, current_user, ip, browser)
    return {"message": "Successfully logged out"}

@router.post("/refresh")
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    access_token, new_refresh = auth_service.refresh_tokens(db, data.refresh_token)
    user = db.query(User).filter(User.refresh_token == new_refresh).first()
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "user": user,
        "refresh_token": new_refresh
    }

@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a secure password reset token."""
    reset_token = auth_service.request_password_reset(db, data.email)
    resp = {
        "message": "If this email is registered, instructions to reset your password have been sent."
    }
    # In development mode without active SMTP, provide reset_token for testing
    if reset_token and (not settings.SMTP_HOST or not settings.SMTP_USERNAME):
        resp["reset_token"] = reset_token
    return resp

@router.post("/reset-password")
def reset_password(data: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Apply new password using a secure reset token."""
    success = auth_service.reset_password(db, data.token, data.new_password)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to reset password"
        )
    return {"message": "Your password has been reset successfully."}

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
    """
    Registers a new user (Personal or Business), dynamically resolving country tax systems,
    securely hashing passwords with bcrypt, and persisting to the database.
    """
    # 1. Reject duplicate email
    existing = db.query(User).filter(User.email == data.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )

    # 2. Check password confirmation if supplied
    if data.confirm_password and data.password != data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match. Please verify your password confirmation."
        )

    # 3. Account Type normalization
    acct_type_str = data.account_type.upper().strip()
    if acct_type_str not in ["PERSONAL", "COMPANY"]:
        acct_type_str = "PERSONAL"
    
    acct_type_enum = AccountType.PERSONAL if acct_type_str == "PERSONAL" else AccountType.COMPANY

    # 4. Conditional validation for company
    if acct_type_str == "COMPANY":
        if not data.company_name or not data.company_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company name is required for company accounts."
            )
        if not data.business_registration_number or not data.business_registration_number.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business registration number is required for company accounts."
            )
        if not data.tax_number or not data.tax_number.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Business Tax Identification Number is required for company accounts."
            )

    # 5. Dynamic Country & Tax System Resolution
    country_obj = None
    if data.country and data.country.strip():
        clean_name = data.country.strip()
        country_obj = db.query(Country).filter(
            (func.lower(Country.name) == clean_name.lower()) |
            (func.upper(Country.code) == clean_name.upper())
        ).first()
    elif data.country_code and data.country_code.strip():
        clean_code = data.country_code.strip()
        country_obj = db.query(Country).filter(
            func.upper(Country.code) == clean_code.upper()
        ).first()

    determined_country = data.country
    determined_country_code = data.country_code
    determined_tax_system = None
    currency_code = "USD"

    if country_obj:
        determined_country = country_obj.name
        determined_country_code = country_obj.code
        
        # Check all available tax systems for this country
        available_tax_systems = {cfg.tax_system.code.upper(): cfg for cfg in country_obj.tax_configs}
        
        if data.tax_system and data.tax_system.strip().upper() in available_tax_systems:
            determined_tax_system = data.tax_system.strip().upper()
            matched_cfg = available_tax_systems[determined_tax_system]
            currency_code = matched_cfg.currency.code
        elif country_obj.tax_config:
            determined_tax_system = country_obj.tax_config.tax_system.code
            currency_code = country_obj.tax_config.currency.code
    else:
        # Default fallback if country not found in registry
        determined_tax_system = data.tax_system or "VAT"

    # 6. Secure Password Hashing (Argon2 / bcrypt)
    hashed_password = get_password_hash(data.password)

    # 7. Create User Record
    new_user = User(
        account_type=acct_type_enum,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=data.email.strip().lower(),
        phone=data.phone.strip() if data.phone else None,
        country_code=determined_country_code,
        country=determined_country,
        tax_system=determined_tax_system,
        currency=currency_code,
        password_hash=hashed_password,
        role=UserRole.ACCOUNTANT if acct_type_str == "PERSONAL" else UserRole.OWNER,
        status=UserStatus.ACTIVE,
        occupation=data.occupation.strip() if (data.occupation and acct_type_str == "PERSONAL") else None,
        profession=data.profession.strip() if (data.profession and acct_type_str == "PERSONAL") else None,
        company_name=data.company_name.strip() if acct_type_str == "COMPANY" else None,
        business_registration_number=data.business_registration_number.strip() if acct_type_str == "COMPANY" else None,
        tax_number=data.tax_number.strip() if acct_type_str == "COMPANY" else None,
        tax_id=data.tax_number.strip() if acct_type_str == "COMPANY" else None,
        city=data.city.strip() if (data.city and acct_type_str == "COMPANY") else None,
        address=data.address.strip() if (data.address and acct_type_str == "COMPANY") else None,
        refresh_token=secrets.token_urlsafe(64),
        session_status="Active",
        last_login=datetime.now(timezone.utc)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 8. If Company, create Company record and link to owner
    if acct_type_str == "COMPANY":
        new_company = Company(
            company_name=data.company_name.strip(),
            registration_number=data.business_registration_number.strip(),
            tax_number=data.tax_number.strip(),
            country=determined_country or "Unknown",
            tax_system=determined_tax_system or "VAT",
            currency=currency_code,
            phone=data.phone.strip() if data.phone else "N/A",
            email=data.email.strip().lower(),
            address=data.address.strip() if data.address else "N/A",
            city=data.city.strip() if data.city else "N/A",
            postal_code="N/A",
            owner_id=new_user.id
        )
        db.add(new_company)
        db.commit()
        db.refresh(new_company)

        new_user.company_id = new_company.id
        db.commit()
        db.refresh(new_user)

    # 9. Audit log entry
    audit_repository.create(
        db,
        user_id=new_user.id,
        action="USER_REGISTRATION",
        description=f"Public registration completed: {new_user.email} (Type: {new_user.account_type.value}, Tax System: {new_user.tax_system})"
    )

    # 10. Generate access token
    access_token = create_access_token(
        data={
            "sub": str(new_user.id),
            "role": new_user.role.value,
            "account_type": new_user.account_type.value
        }
    )

    return {
        "message": "Registration Successful!",
        "access_token": access_token,
        "token_type": "bearer",
        "role": new_user.role.value,
        "account_type": new_user.account_type.value,
        "user": new_user,
        "refresh_token": new_user.refresh_token
    }
