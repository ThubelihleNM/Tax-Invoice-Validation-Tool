from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from app.models.validation import ValidationStatus

class ValidationResultBase(BaseModel):
    validation_status: ValidationStatus
    missing_fields: Optional[List[str]] = None
    invalid_fields: Optional[Dict[str, Any]] = None
    vat_validation: Optional[str] = None
    duplicate_status: str = "Unique"
    fraud_score: Decimal = Field(default=Decimal("0.00"))
    validation_notes: Optional[str] = None

class ValidationResultCreate(ValidationResultBase):
    invoice_id: int

class ValidationResultUpdate(BaseModel):
    validation_status: Optional[ValidationStatus] = None
    missing_fields: Optional[List[str]] = None
    invalid_fields: Optional[Dict[str, Any]] = None
    vat_validation: Optional[str] = None
    duplicate_status: Optional[str] = None
    fraud_score: Optional[Decimal] = None
    validation_notes: Optional[str] = None

class ValidationResultResponse(ValidationResultBase):
    validation_id: int
    invoice_id: int
    validated_at: datetime

    class Config:
        from_attributes = True
