import os
import csv
import io
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Response, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database.connection import get_db
from app.authentication.jwt import require_any_role, require_accountant_or_admin
from app.models.users import User
from app.models.invoices import Invoice, InvoiceStatus
from app.models.suppliers import Supplier
from app.models.customers import Customer
from app.models.reports import Report, ScheduledReport, ExportHistory
from app.repositories.audit_repository import audit_repository

router = APIRouter(prefix="/reports", tags=["Reports"])

class ExportRequest(BaseModel):
    report_type: str
    export_format: str  # "PDF", "EXCEL", "CSV"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    supplier_id: Optional[int] = None
    invoice_status: Optional[str] = None

class EmailRequest(BaseModel):
    recipient_email: str
    subject: str
    message: str
    report_type: str

class ScheduleRequest(BaseModel):
    report_type: str
    frequency: str  # "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"
    recipient_email: str
    filters: Optional[Dict[str, Any]] = None

@router.get("/templates")
def list_report_templates(
    current_user: User = Depends(require_any_role)
):
    """Retrieve the standard list of 15 business intelligence report categories."""
    return [
        {"id": "invoice_validation", "name": "Invoice Validation Report", "category": "Compliance"},
        {"id": "tax_compliance", "name": "Tax Compliance Report", "category": "Tax"},
        {"id": "vat_summary", "name": "VAT Summary Report", "category": "Tax"},
        {"id": "supplier_performance", "name": "Supplier Performance Report", "category": "Suppliers"},
        {"id": "customer_invoice", "name": "Customer Invoice Report", "category": "Customers"},
        {"id": "duplicate_invoice", "name": "Duplicate Invoice Report", "category": "Fraud"},
        {"id": "fraud_detection", "name": "Fraud Detection Report", "category": "Fraud"},
        {"id": "risk_analysis", "name": "Risk Analysis Report", "category": "Risk"},
        {"id": "invoice_processing", "name": "Invoice Processing Report", "category": "System"},
        {"id": "ocr_accuracy", "name": "OCR Accuracy Report", "category": "System"},
        {"id": "validation_performance", "name": "Validation Performance Report", "category": "System"},
        {"id": "audit_trail", "name": "Audit Trail Report", "category": "Security"},
        {"id": "user_activity", "name": "User Activity Report", "category": "Security"},
        {"id": "system_usage", "name": "System Usage Report", "category": "System"},
        {"id": "executive_summary", "name": "Executive Summary Report", "category": "Executive"}
    ]

@router.post("/export")
def export_report(
    req: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """
    Query invoice records matching filters and output to CSV spreadsheets.
    For PDF, returns a general validation summaries checklist placeholder.
    """
    # 1. Base Query
    query = db.query(Invoice)
    
    # 2. Apply Filters
    if req.start_date:
        try:
            sd = datetime.strptime(req.start_date, "%Y-%m-%d").date()
            query = query.filter(Invoice.invoice_date >= sd)
        except Exception:
            pass
    if req.end_date:
        try:
            ed = datetime.strptime(req.end_date, "%Y-%m-%d").date()
            query = query.filter(Invoice.invoice_date <= ed)
        except Exception:
            pass
    if req.supplier_id:
        query = query.filter(Invoice.supplier_id == req.supplier_id)
    if req.invoice_status:
        query = query.filter(Invoice.invoice_status == req.invoice_status)

    invoices = query.all()

    # Log export history
    export_log = ExportHistory(
        report_name=req.report_type.replace("_", " ").title() + " Report",
        export_format=req.export_format.upper(),
        user_id=current_user.id
    )
    db.add(export_log)
    db.commit()

    # Log audit
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="REPORT_EXPORT",
        description=f"Exported report {req.report_type} in {req.export_format} format."
    )

    # 3. CSV/EXCEL Format output
    if req.export_format.upper() in ["CSV", "EXCEL"]:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow([
            "Invoice ID", "Invoice Number", "Supplier Name", "Customer Name", 
            "Invoice Date", "Total Amount", "Currency", "Validation Rating", "OCR Accuracy"
        ])
        
        for inv in invoices:
            writer.writerow([
                inv.invoice_id,
                inv.invoice_number,
                inv.supplier.supplier_name if inv.supplier else "N/A",
                inv.customer.customer_name if inv.customer else "N/A",
                str(inv.invoice_date or ""),
                float(inv.total_amount),
                inv.currency,
                inv.invoice_status.value,
                float(inv.confidence_score)
            ])
            
        output.seek(0)
        filename = f"report_{req.report_type}_{datetime.now().strftime('%Y%m%d')}.csv"
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    # PDF Fallback Placeholder (Return validation details of the first matched invoice if available)
    if invoices:
        first_id = invoices[0].invoice_id
        # Serve the validation PDF report compiled by ReportLab!
        from app.services.report_service import REPORTS_DIR
        filename = f"validation_report_{first_id}.pdf"
        pdf_path = os.path.join(REPORTS_DIR, filename)
        
        # If PDF hasn't been generated, compile it now!
        if not os.path.exists(pdf_path):
            from app.services.report_service import report_service
            try:
                report_service.generate_validation_pdf(db, first_id)
            except Exception:
                raise HTTPException(status_code=500, detail="Failed to compile report PDF.")
                
        return FileResponse(
            path=pdf_path,
            media_type="application/pdf",
            filename=f"{req.report_type}_summary.pdf"
        )
        
    raise HTTPException(status_code=404, detail="No matching invoices found to export.")

@router.post("/email")
def email_report(
    req: EmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Simulates sending reports via email attachments."""
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="REPORT_EMAILED",
        description=f"Emailed report: {req.report_type} to recipient {req.recipient_email}"
    )
    return {"message": f"Report successfully dispatched via email to {req.recipient_email}"}

@router.post("/schedule")
def schedule_report(
    req: ScheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant_or_admin)
):
    """Saves a recurring validation report scheduler configuration in DB."""
    sched = ScheduledReport(
        report_type=req.report_type,
        frequency=req.frequency,
        recipient_email=req.recipient_email,
        rules_filter=req.filters
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="REPORT_SCHEDULED",
        description=f"Scheduled report cron registered: {req.report_type} ({req.frequency}) for {req.recipient_email}"
    )
    
    return sched

@router.get("/scheduled", response_model=List[Dict[str, Any]])
def list_scheduled_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve active cron scheduled template configurations."""
    return db.query(ScheduledReport).all()

@router.delete("/scheduled/{id}")
def delete_scheduled_report(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant_or_admin)
):
    """Remove a scheduled report task configurations."""
    sched = db.query(ScheduledReport).filter(ScheduledReport.id == id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Scheduled report config not found.")
    
    report_type = sched.report_type
    db.delete(sched)
    db.commit()
    
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="SCHEDULE_DELETED",
        description=f"Cancelled recurring report schedule: {report_type}"
    )
    
    return {"message": "Scheduled report configuration cancelled."}
