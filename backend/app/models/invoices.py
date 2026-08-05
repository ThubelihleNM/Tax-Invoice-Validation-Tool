from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, Enum, ForeignKey, func, Text, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base
import enum

class InvoiceStatus(str, enum.Enum):
    PENDING = "Pending"
    VALIDATED = "Validated"
    FLAGGED = "Flagged"
    REJECTED = "Rejected"

class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"

class OcrStatus(str, enum.Enum):
    PENDING = "Pending"
    SUCCESS = "Success"
    FAILED = "Failed"

class Invoice(Base):
    __tablename__ = "invoices"

    invoice_id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String(100), index=True, nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.supplier_id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.customer_id"), nullable=True)
    invoice_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    currency = Column(String(3), default="USD", nullable=False)
    subtotal = Column(Numeric(15, 2), default=0.00, nullable=False)
    vat_percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    vat_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    discount = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    invoice_status = Column(Enum(InvoiceStatus), default=InvoiceStatus.PENDING, nullable=False)
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    confidence_score = Column(Numeric(5, 2), default=0.00, nullable=False)
    ocr_status = Column(Enum(OcrStatus), default=OcrStatus.PENDING, nullable=False)
    file_path = Column(String(255), nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # OCR Data and performance metrics (Module 4)
    ocr_text = Column(Text, nullable=True)
    extracted_json = Column(JSON, nullable=True)
    processing_time = Column(Numeric(10, 2), nullable=True)
    thumbnail_path = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    uploader = relationship("User", back_populates="uploaded_invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    validation_result = relationship("ValidationResult", uselist=False, back_populates="invoice", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    item_id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Numeric(12, 4), default=1.0000, nullable=False)
    unit_price = Column(Numeric(15, 4), default=0.0000, nullable=False)
    tax_rate = Column(Numeric(5, 2), default=0.00, nullable=False)
    total = Column(Numeric(15, 2), default=0.00, nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="items")
