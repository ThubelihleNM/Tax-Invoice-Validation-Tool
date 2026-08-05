from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Report(Base):
    __tablename__ = "reports"

    report_id = Column(Integer, primary_key=True, index=True)
    report_name = Column(String(255), nullable=False)
    report_type = Column(String(100), nullable=False)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    invoice_id = Column(Integer, ForeignKey("invoices.invoice_id"), nullable=True)
    invoice = relationship("Invoice", back_populates="reports")
    creator = relationship("User", back_populates="generated_reports")


class ScheduledReport(Base):
    __tablename__ = "scheduled_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_type = Column(String(100), nullable=False)
    frequency = Column(String(50), nullable=False)  # "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"
    recipient_email = Column(String(255), nullable=False)
    rules_filter = Column(JSON, nullable=True)  # Store criteria parameters like status, supplier
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ExportHistory(Base):
    __tablename__ = "export_history"

    id = Column(Integer, primary_key=True, index=True)
    report_name = Column(String(255), nullable=False)
    export_format = Column(String(20), nullable=False)  # "PDF", "EXCEL", "CSV"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    exported_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
