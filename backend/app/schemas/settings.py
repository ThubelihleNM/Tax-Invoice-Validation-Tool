from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from decimal import Decimal

class SystemSettingsBase(BaseModel):
    company_name: str = Field(..., max_length=255)
    company_logo: Optional[str] = None
    default_vat_rate: Decimal = Field(default=Decimal("15.00"))
    currency: str = Field(default="USD", max_length=3)
    theme: str = Field(default="light", max_length=50)
    notification_settings: Optional[Dict[str, Any]] = None

class SystemSettingsUpdate(BaseModel):
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    default_vat_rate: Optional[Decimal] = None
    currency: Optional[str] = None
    theme: Optional[str] = None
    notification_settings: Optional[Dict[str, Any]] = None

class SystemSettingsResponse(SystemSettingsBase):
    id: int

    class Config:
        from_attributes = True
