from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.suppliers import SupplierStatus

class SupplierBase(BaseModel):
    supplier_name: str = Field(..., max_length=255)
    tax_number: str = Field(..., max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)
    country: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    status: SupplierStatus = SupplierStatus.ACTIVE

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    supplier_name: Optional[str] = None
    tax_number: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    status: Optional[SupplierStatus] = None

class SupplierResponse(SupplierBase):
    supplier_id: int

    class Config:
        from_attributes = True
