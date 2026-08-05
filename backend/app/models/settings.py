from sqlalchemy import Column, Integer, String, Numeric, JSON
from app.database.connection import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), default="Enterprise Solutions Ltd", nullable=False)
    company_logo = Column(String(255), nullable=True)
    default_vat_rate = Column(Numeric(5, 2), default=15.00, nullable=False)
    currency = Column(String(3), default="USD", nullable=False)
    theme = Column(String(50), default="light", nullable=False)
    notification_settings = Column(JSON, nullable=True)
    rules_config = Column(JSON, nullable=True)
    
    # Advanced Admin Configurations (Module 7)
    company_details = Column(JSON, nullable=True)     # Addresses, phone, email, website, timezone, fiscal year
    tax_config = Column(JSON, nullable=True)          # Supported rates, decimals precision, tolerance, auto-validation switches
    notification_config = Column(JSON, nullable=True)  # Email/SMS/Desktop toggles by event types
    email_config = Column(JSON, nullable=True)         # SMTP Server, SMTP Port, username, password, encryption
    security_config = Column(JSON, nullable=True)      # Max login attempts, account lock time, password complexity
