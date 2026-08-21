from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, EmailStr
import secrets

from app.database.connection import get_db
from app.authentication.jwt import get_current_user, require_any_role
from app.models.users import User, UserRole, UserStatus
from app.models.companies import Company
from app.schemas.companies import CompanyResponse, CompanyCreate, CompanyUpdate
from app.schemas.users import UserResponse
from app.authentication.jwt import get_password_hash

router = APIRouter(prefix="/companies", tags=["Companies"])

class MemberInviteRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole
    password: str
    phone: Optional[str] = None

@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(data: CompanyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Standalone company registration/setup route."""
    if current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already registered with a company."
        )
    
    new_company = Company(
        company_name=data.company_name,
        registration_number=data.registration_number,
        tax_number=data.tax_number,
        country=data.country,
        tax_system=data.tax_system,
        currency=data.currency,
        phone=data.phone,
        email=data.email,
        address=data.address,
        city=data.city,
        postal_code=data.postal_code,
        owner_id=current_user.id
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)
    
    current_user.company_id = new_company.id
    current_user.role = UserRole.OWNER
    db.commit()
    
    return new_company

@router.get("/me", response_model=CompanyResponse)
def get_my_company(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    """Retrieve company details for active user's company."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any company."
        )
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found."
        )
    return company

@router.put("/me", response_model=CompanyResponse)
def update_my_company(data: CompanyUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    """Update active company profiles (Owner/Admin only)."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any company."
        )
    
    if current_user.role not in [UserRole.OWNER, UserRole.ADMINISTRATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Company Owners and Administrators can update details."
        )
        
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found."
        )
        
    update_data = data.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(company, field, val)
        
    db.commit()
    db.refresh(company)
    return company

@router.get("/me/members", response_model=List[UserResponse])
def get_company_members(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    """Get members of the active user's company."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any company."
        )
    return db.query(User).filter(User.company_id == current_user.company_id).all()

@router.post("/me/members", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def invite_company_member(
    req: MemberInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Invite and create a company member account immediately (Owner/Admin only)."""
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any company."
        )
        
    if current_user.role not in [UserRole.OWNER, UserRole.ADMINISTRATOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Company Owners and Administrators can invite new members."
        )
        
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already registered."
        )
        
    new_member = User(
        first_name=req.first_name,
        last_name=req.last_name,
        email=req.email,
        phone=req.phone,
        password_hash=get_password_hash(req.password),
        role=req.role,
        company_id=current_user.company_id,
        account_type=current_user.account_type,
        country=current_user.country,
        country_code=current_user.country_code,
        status=UserStatus.ACTIVE,
        session_status="Inactive",
        refresh_token=secrets.token_urlsafe(64)
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return new_member
