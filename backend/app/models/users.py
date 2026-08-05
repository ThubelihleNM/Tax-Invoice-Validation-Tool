from sqlalchemy import Column, Integer, String, DateTime, Enum, func, Boolean
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum

class UserRole(str, enum.Enum):
    ADMINISTRATOR = "Administrator"
    ACCOUNTANT = "Accountant"
    AUDITOR = "Auditor"

class UserStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ACCOUNTANT, nullable=False)
    profile_photo = Column(String(255), nullable=True)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    
    # Session, security & auth tracking fields (Module 2)
    last_login = Column(DateTime(timezone=True), nullable=True)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    password_reset_token = Column(String(255), nullable=True)
    refresh_token = Column(String(255), nullable=True)
    session_status = Column(String(50), default="Inactive", nullable=False)  # "Active", "Inactive"

    # Extended Profile & Settings fields (Module 2 Expansion)
    company_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    address = Column(String(255), nullable=True)
    postal_code = Column(String(20), nullable=True)
    tax_id = Column(String(50), nullable=True)
    bio = Column(String(1000), nullable=True)
    last_password_change = Column(DateTime(timezone=True), nullable=True)
    theme_preference = Column(String(20), default="light", nullable=False)
    language_preference = Column(String(20), default="en", nullable=False)
    timezone = Column(String(50), default="UTC", nullable=False)
    email_notifications = Column(Boolean, default=True, nullable=False)
    system_notifications = Column(Boolean, default=True, nullable=False)
    fraud_alerts = Column(Boolean, default=True, nullable=False)
    validation_alerts = Column(Boolean, default=True, nullable=False)
    report_notifications = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    uploaded_invoices = relationship("Invoice", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    generated_reports = relationship("Report", back_populates="creator")
