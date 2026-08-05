from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., "LOGIN", "INVOICE_UPLOAD", "MANUAL_OVERRIDE"
    description = Column(Text, nullable=False)
    ip_address = Column(String(45), nullable=True)
    browser = Column(String(255), nullable=True)
    
    # Advanced security auditing columns (Module 7)
    device = Column(String(100), nullable=True)  # e.g., "Mobile", "Desktop"
    os = Column(String(100), nullable=True)      # e.g., "Windows", "MacOS", "Linux"
    status = Column(String(50), default="Success", nullable=False)  # "Success" or "Failed"

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="audit_logs")
