from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReportBase(BaseModel):
    invoice_id: Optional[int] = None
    report_path: str

class ReportCreate(ReportBase):
    generated_by: Optional[int] = None

class ReportResponse(ReportBase):
    report_id: int
    generated_by: Optional[int] = None
    generated_date: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    log_id: int
    user_id: Optional[int] = None
    action: str
    description: Optional[str] = None
    ip_address: Optional[str] = None
    browser: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    notification_id: int
    user_id: int
    title: str
    message: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
