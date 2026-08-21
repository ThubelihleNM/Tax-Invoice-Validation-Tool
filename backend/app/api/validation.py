import os
from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database.connection import get_db
from app.authentication.jwt import require_accountant_or_admin, require_any_role, require_admin
from app.models.users import User
from app.models.invoices import Invoice, InvoiceStatus
from app.models.validation import ValidationResult, ValidationStatus
from app.services.validation_service import validation_service
from app.services.report_service import report_service
from app.repositories.audit_repository import audit_repository
from app.api.invoices import check_invoice_access

router = APIRouter(prefix="/validation", tags=["Validation"])

class OverrideRequest(BaseModel):
    status: str  # "Passed" or "Rejected"
    comment: str

class CommentRequest(BaseModel):
    comment: str

@router.post("/run/{invoice_id}", status_code=status.HTTP_200_OK)
def run_invoice_validation(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant_or_admin)
):
    """Manually run compliance check rules on OCR extracted fields, generating reports."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found.")
    check_invoice_access(current_user, invoice)

    try:
        val_res = validation_service.run_validation(db, invoice_id)
        # Generate PDF report automatically
        report_service.generate_validation_pdf(db, invoice_id)
        return val_res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed to run: {str(e)}")

@router.get("/{invoice_id}")
def get_validation_details(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve compliance details, AI explanations, checklists, and audit comments."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found.")
    check_invoice_access(current_user, invoice)

    val = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).first()
    if not val:
        # Auto-run validation once if it has not run yet (lazy evaluation support)
        try:
            val = validation_service.run_validation(db, invoice_id)
            report_service.generate_validation_pdf(db, invoice_id)
        except Exception:
            raise HTTPException(status_code=404, detail="No compliance audit records found for this invoice.")
    return val

@router.post("/override/{invoice_id}")
def administrative_override(
    invoice_id: int,
    req: OverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Allows Administrators to manually override audit warning flags."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found.")
    check_invoice_access(current_user, invoice)
        
    val = invoice.validation_result
    if not val:
        raise HTTPException(status_code=400, detail="Cannot override. Run validation checks first.")

    target_status = req.status.strip().capitalize()
    if target_status not in ["Passed", "Rejected"]:
        raise HTTPException(status_code=400, detail="Override status must be either 'Passed' or 'Rejected'.")

    # Update database validation statuses
    new_val_status = ValidationStatus.PASSED if target_status == "Passed" else ValidationStatus.FAILED
    new_inv_status = InvoiceStatus.VALIDATED if target_status == "Passed" else InvoiceStatus.REJECTED
    
    val.validation_status = new_val_status
    invoice.invoice_status = new_inv_status
    
    # Append comment logs to validation JSON history
    comments = list(val.comments_json or [])
    comments.append({
        "user": f"{current_user.first_name} {current_user.last_name}",
        "role": current_user.role.value,
        "text": f"STATUS OVERRIDE TO {target_status.upper()}. Rationale: {req.comment}",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M")
    })
    val.comments_json = comments
    
    db.commit()

    # Log action in system audit
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="MANUAL_OVERRIDE",
        description=f"Administrator override status to {target_status} on invoice {invoice.invoice_number}"
    )

    # Regenerate report
    report_service.generate_validation_pdf(db, invoice_id)

    return val

@router.post("/comment/{invoice_id}")
def add_auditor_comment(
    invoice_id: int,
    req: CommentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Allows accountants, auditors, and administrators to add auditing notes."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found.")
    check_invoice_access(current_user, invoice)

    val = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).first()
    if not val:
        raise HTTPException(status_code=404, detail="Validation details not found.")

    comments = list(val.comments_json or [])
    comments.append({
        "user": f"{current_user.first_name} {current_user.last_name}",
        "role": current_user.role.value,
        "text": req.comment,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M")
    })
    val.comments_json = comments
    
    db.commit()

    # Regenerate PDF report
    report_service.generate_validation_pdf(db, invoice_id)

    return val

@router.get("/report/{invoice_id}")
def download_validation_report(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Serve validation PDF report compiled using ReportLab platypus."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found.")
    check_invoice_access(current_user, invoice)

    val = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).first()
    if not val or not val.generated_report_path:
        # Attempt to auto generate if missing
        try:
            report_service.generate_validation_pdf(db, invoice_id)
            val = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).first()
        except Exception:
            raise HTTPException(status_code=404, detail="Compliance PDF report could not be compiled.")
            
    # Resolve absolute path to serve
    filename = f"validation_report_{invoice_id}.pdf"
    from app.services.report_service import REPORTS_DIR
    pdf_abs_path = os.path.join(REPORTS_DIR, filename)
    
    if not os.path.exists(pdf_abs_path):
        raise HTTPException(status_code=404, detail="Compiled PDF report is not found on storage disk.")
        
    return FileResponse(
        path=pdf_abs_path,
        media_type="application/pdf",
        filename=filename
    )
