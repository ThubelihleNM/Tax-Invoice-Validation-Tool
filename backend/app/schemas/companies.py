from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    company_name: str
    registration_number: str
    tax_number: str
    country: str
    tax_system: str
    currency: str
    phone: str
    email: EmailStr
    address: str
    city: str
    postal_code: str

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    country: Optional[str] = None
    tax_system: Optional[str] = None
    currency: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
