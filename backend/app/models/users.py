from sqlalchemy import Column, Integer, String, DateTime, Enum, func, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum

class UserRole(str, enum.Enum):
    OWNER = "Owner"
    ADMINISTRATOR = "Administrator"
    ACCOUNTANT = "Accountant"
    AUDITOR = "Auditor"
    VIEWER = "Viewer"

class UserStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    SUSPENDED = "Suspended"

class AccountType(str, enum.Enum):
    PERSONAL = "PERSONAL"
    COMPANY = "COMPANY"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    account_type = Column(Enum(AccountType), default=AccountType.PERSONAL, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.ACCOUNTANT, nullable=False)
    profile_photo = Column(String(255), nullable=True)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    
    # SaaS onboarding fields
    business_registration_number = Column(String(100), nullable=True)
    tax_number = Column(String(100), nullable=True)
    tax_system = Column(String(50), nullable=True)  # GST, VAT, Sales Tax, HST, PST, etc.
    occupation = Column(String(100), nullable=True)
    profession = Column(String(100), nullable=True)
    
    # Company reference
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    country_code = Column(String(10), nullable=True)
    
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
    currency = Column(String(10), default="USD", nullable=True)
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
    company = relationship("Company", back_populates="members", foreign_keys=[company_id])
    uploaded_invoices = relationship("Invoice", back_populates="uploader")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    generated_reports = relationship("Report", back_populates="creator")
    reset_tokens = relationship("PasswordResetToken", back_populates="user", cascade="all, delete-orphan")

    @property
    def currency_symbol(self) -> str:
        symbol_map = {
            "INR": "₹",
            "ZAR": "R",
            "CAD": "$",
            "USD": "$",
            "GBP": "£",
            "EUR": "€",
            "AUD": "$",
            "AED": "AED",
            "NGN": "₦",
            "KES": "KSh",
            "ZWG": "ZiG"
        }
        return symbol_map.get(self.currency, "$") if self.currency else "$"

