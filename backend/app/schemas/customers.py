from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class CustomerBase(BaseModel):
    customer_name: str = Field(..., max_length=255)
    tax_number: str = Field(..., max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    country: Optional[str] = Field(None, max_length=100)

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    customer_name: Optional[str] = None
    tax_number: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None

class CustomerResponse(CustomerBase):
    customer_id: int

    class Config:
        from_attributes = True
