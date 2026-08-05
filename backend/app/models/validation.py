from sqlalchemy import Column, Integer, Numeric, DateTime, Enum, ForeignKey, func, Text, JSON, String
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum

class ValidationStatus(str, enum.Enum):
    PASSED = "Passed"
    FAILED = "Failed"
    WARNING = "Warning"

class ValidationResult(Base):
    __tablename__ = "validation_results"

    validation_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), unique=True, nullable=False)
    validation_status = Column(Enum(ValidationStatus), default=ValidationStatus.FAILED, nullable=False)
    missing_fields = Column(JSON, nullable=True)  # List of strings
    invalid_fields = Column(JSON, nullable=True)  # Dict of fields and details
    vat_validation = Column(Text, nullable=True)  # VAT math or VIES status details
    duplicate_status = Column(Text, default="Unique", nullable=False)  # "Unique", "Potential Duplicate", "Duplicate"
    fraud_score = Column(Numeric(5, 2), default=0.00, nullable=False)  # Fraud rating 0-100
    validation_notes = Column(Text, nullable=True)
    
    # Engine details and recommendations (Module 5)
    risk_score = Column(Numeric(5, 2), default=0.00, nullable=False)  # Risk level 0-100
    validation_score = Column(Numeric(5, 2), default=0.00, nullable=False)  # Compliance score 0-100
    ai_explanation = Column(Text, nullable=True)  # Plain English reason
    ai_recommendations = Column(JSON, nullable=True)  # List of strings: ["Check supplier", "Recalculate total"]
    fraud_flags = Column(JSON, nullable=True)  # Dict of boolean flags: {"fake_supplier": True}
    comments_json = Column(JSON, default=[], nullable=True)  # List of audit logs comments
    generated_report_path = Column(String(255), nullable=True)  # PDF validation report link

    validated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    invoice = relationship("Invoice", back_populates="validation_result")
