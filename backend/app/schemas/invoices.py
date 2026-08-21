from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
from app.models.invoices import InvoiceStatus, RiskLevel, OcrStatus
from app.schemas.suppliers import SupplierResponse
from app.schemas.customers import CustomerResponse

class InvoiceItemBase(BaseModel):
    description: str
    quantity: Decimal = Field(default=Decimal("1.00"))
    unit_price: Decimal = Field(default=Decimal("0.00"))
    tax_rate: Decimal = Field(default=Decimal("0.00"))
    total: Decimal = Field(default=Decimal("0.00"))

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    item_id: int
    invoice_id: int

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    invoice_number: str = Field(..., max_length=100)
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: str = "USD"
    subtotal: Decimal = Field(default=Decimal("0.00"))
    vat_percentage: Decimal = Field(default=Decimal("0.00"))
    vat_amount: Decimal = Field(default=Decimal("0.00"))
    discount: Decimal = Field(default=Decimal("0.00"))
    total_amount: Decimal = Field(default=Decimal("0.00"))
    invoice_status: InvoiceStatus = InvoiceStatus.PENDING
    risk_level: RiskLevel = RiskLevel.LOW
    confidence_score: Decimal = Field(default=Decimal("0.00"))
    ocr_status: OcrStatus = OcrStatus.PENDING
    file_path: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    supplier_id: Optional[int] = None
    customer_id: Optional[int] = None
    items: Optional[List[InvoiceItemCreate]] = None

class InvoiceUpdate(BaseModel):
    invoice_number: Optional[str] = None
    supplier_id: Optional[int] = None
    customer_id: Optional[int] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    currency: Optional[str] = None
    subtotal: Optional[Decimal] = None
    vat_percentage: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    discount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    invoice_status: Optional[InvoiceStatus] = None
    risk_level: Optional[RiskLevel] = None
    confidence_score: Optional[Decimal] = None
    ocr_status: Optional[OcrStatus] = None
    file_path: Optional[str] = None

class InvoiceResponse(InvoiceBase):
    invoice_id: int
    supplier_id: Optional[int] = None
    customer_id: Optional[int] = None
    uploaded_by: Optional[int] = None
    created_at: datetime
    
    # Nested relations
    items: List[InvoiceItemResponse] = []
    supplier: Optional[SupplierResponse] = None
    customer: Optional[CustomerResponse] = None
    
    class Config:
        from_attributes = True
