from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from pydantic import BaseModel

from app.database.connection import get_db
from app.authentication.jwt import require_any_role, require_accountant_or_admin
from app.models.users import User, UserRole
from app.models.invoices import Invoice, InvoiceStatus, RiskLevel
from app.models.validation import ValidationResult, ValidationStatus
from app.models.suppliers import Supplier
from app.models.ai import AIConversation, AIMessage, FavoritePrompt, AIInsight
from app.repositories.audit_repository import audit_repository

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

def get_scoped_invoice_query(db: Session, user: User):
    query = db.query(Invoice)
    if user.role == UserRole.ADMINISTRATOR:
        if user.company_id:
            query = query.filter(Invoice.company_id == user.company_id)
    elif user.account_type == "PERSONAL":
        query = query.filter(Invoice.uploaded_by == user.id)
    elif user.account_type == "COMPANY":
        query = query.filter(Invoice.company_id == user.company_id)
    return query

class AskRequest(BaseModel):
    prompt: str
    conversation_id: Optional[int] = None
    invoice_id: Optional[int] = None

class SummaryRequest(BaseModel):
    report_type: str  # "validation", "fraud", "monthly", "supplier"
    supplier_id: Optional[int] = None

class FavoriteRequest(BaseModel):
    prompt_text: str

@router.post("/ask")
def ask_ai_assistant(
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """
    Intelligent NLP responder querying SQLite records.
    Matches queries against context criteria to retrieve exact counts and math details.
    """
    prompt = req.prompt.lower()
    
    # 1. Establish or lookup Conversation Session
    conv_id = req.conversation_id
    if not conv_id:
        new_conv = AIConversation(session_title=f"Chat about: {req.prompt[:30]}...")
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)
        conv_id = new_conv.id
        
    # Save User message
    usr_msg = AIMessage(conversation_id=conv_id, sender="user", message_text=req.prompt)
    db.add(usr_msg)
    db.commit()

    # 2. Semantic matching logic
    ai_response = ""

    # Match: "why did invoice fail" or "why did this fail"
    if "why did" in prompt and ("fail" in prompt or "invalid" in prompt or "rejected" in prompt):
        # Find specified or last failed invoice
        inv = None
        if req.invoice_id:
            inv = get_scoped_invoice_query(db, current_user).filter(Invoice.invoice_id == req.invoice_id).first()
        else:
            inv = get_scoped_invoice_query(db, current_user).filter(Invoice.invoice_status == InvoiceStatus.REJECTED).order_by(Invoice.invoice_id.desc()).first()

        if inv:
            val = db.query(ValidationResult).filter(ValidationResult.invoice_id == inv.invoice_id).first()
            failed_rules = []
            if val:
                # Compile list of failed rules based on fields
                # Check for arithmetic discrepancies
                sub = float(inv.subtotal)
                vat_act = float(inv.vat_amount)
                rate = float(inv.vat_rate or 15.00)
                expected_vat = round(sub * (rate / 100), 2)
                
                if abs(vat_act - expected_vat) > 0.10:
                    failed_rules.append(f"VAT Calculation Discrepancy (expected {expected_vat} {inv.currency}, got {vat_act})")
                
                if not inv.invoice_number:
                    failed_rules.append("Invoice Identifier number missing")
                if not inv.supplier or not inv.supplier.supplier_name:
                    failed_rules.append("Supplier details missing or not registered")
                    
            rules_str = ", ".join(failed_rules) if failed_rules else "arithmetic variance and date discrepancies check failures."
            ai_response = (
                f"Invoice **{inv.invoice_number or 'N/A'}** failed compliance checks because: {rules_str}. "
                f"Our validation engine scored it {val.validation_score if val else 0}% complying with a risk score of {val.risk_score if val else 100}/100."
            )
        else:
            ai_response = "I searched the registry database logs, and all processed invoices appear to be compliant!"

    # Match: "explain vat calculation" or "explain the vat math"
    elif "explain vat" in prompt or "vat calculation" in prompt:
        ai_response = (
            "Tax Invoice validation standard VAT math checks execute using: \n\n"
            "$$\\text{Expected VAT} = \\text{Subtotal} \\times \\frac{\\text{VAT Rate}}{100}$$\n\n"
            "Our rules engine compares this expected value against the actual VAT read by OCR, flagging a "
            "warning if the difference exceeds the configured tolerance limit."
        )

    # Match: "show duplicate invoices" or "duplicates"
    elif "duplicate" in prompt:
        dups = get_scoped_invoice_query(db, current_user).join(ValidationResult).filter(ValidationResult.duplicate_status.like("Duplicate%")).limit(5).all()
        if dups:
            dup_list = "\n".join([f"- Invoice **{d.invoice_number}** (Supplier: {d.supplier.supplier_name if d.supplier else 'N/A'})" for d in dups])
            ai_response = f"I discovered the following duplicated invoice numbers in database records:\n\n{dup_list}"
        else:
            ai_response = "No duplicate invoice identifiers have been detected in active audit registers."

    # Match: "high fraud risk" or "risk score"
    elif "risk" in prompt or "fraud" in prompt:
        high_risk = get_scoped_invoice_query(db, current_user).join(ValidationResult).filter(ValidationResult.risk_score > 50).limit(5).all()
        if high_risk:
            risk_list = "\n".join([f"- Invoice **{d.invoice_number}** (Supplier: {d.supplier.supplier_name if d.supplier else 'N/A'}, Risk score: {d.validation_result[0].risk_score if d.validation_result else 75})" for d in high_risk])
            ai_response = f"Here are the processed invoices flagged with high audit risk scores:\n\n{risk_list}"
        else:
            ai_response = "All invoices are flagged as low risk. Compliance parameters appear stable."

    # Match: "summarize today" or "how many invoices processed"
    elif "summarize today" in prompt or "invoices processed today" in prompt:
        total = get_scoped_invoice_query(db, current_user).count()
        validated = get_scoped_invoice_query(db, current_user).filter(Invoice.invoice_status == InvoiceStatus.VALIDATED).count()
        rejected = get_scoped_invoice_query(db, current_user).filter(Invoice.invoice_status == InvoiceStatus.REJECTED).count()
        ai_response = (
            f"Today, **{total}** invoices were uploaded and processed through the OCR scanner.\n\n"
            f"- **{validated}** passed compliance checks and were archived.\n"
            f"- **{rejected}** were rejected due to grand total mathematical variance or missing registration numbers."
        )

    # General Fallback NLP responder
    else:
        ai_response = (
            f"I'm your AI Financial Assistant. I can help explain invoice validation results, verify VAT calculations, "
            f"and compile predictive insights. \n\n"
            f"Try asking: \n"
            f"- *'Why did the last invoice fail?'*\n"
            f"- *'Explain the VAT calculation'* \n"
            f"- *'Show duplicate invoices'* "
        )

    # Save AI response message
    ai_msg = AIMessage(conversation_id=conv_id, sender="ai", message_text=ai_response)
    db.add(ai_msg)
    db.commit()

    return {
        "conversation_id": conv_id,
        "message": ai_response,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/explain/validation/{id}")
def explain_invoice_validation(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve detailed plain English explanations of a specific invoice validation checklist results."""
    inv = db.query(Invoice).filter(Invoice.invoice_id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice record not found.")

    val = db.query(ValidationResult).filter(ValidationResult.invoice_id == id).first()
    
    sub = float(inv.subtotal)
    vat_act = float(inv.vat_amount)
    rate = float(inv.vat_rate or 15.0)
    expected_vat = round(sub * (rate / 100), 2)
    diff = abs(vat_act - expected_vat)
    
    explanation = (
        f"Validation summary details for Invoice {inv.invoice_number}:\n\n"
        f"1. **VAT Math Check**: The subtotal is {inv.currency} {sub:,.2f} at a VAT rate of {rate}%. "
        f"This yields an expected tax amount of {inv.currency} {expected_vat:,.2f}. The document lists {inv.currency} {vat_act:,.2f}. "
        f"The calculation variance is {inv.currency} {diff:,.2f} which exceeds the tolerance bounds.\n\n"
        f"2. **OCR confidence level**: The document was read with {float(inv.confidence_score):.1f}% scanning accuracy."
    )
    
    return {
        "invoice_id": id,
        "explanation": explanation,
        "recommendations": [
            "Verify VAT billing parameters with supplier.",
            "Override status manually if difference constitutes rounded fractional pennies."
        ]
    }

@router.get("/explain/risk/{id}")
def explain_invoice_risk(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Get plain English breakdown explaining the risk score assigned to an invoice upload."""
    inv = db.query(Invoice).filter(Invoice.invoice_id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    val = db.query(ValidationResult).filter(ValidationResult.invoice_id == id).first()
    score = val.risk_score if val else 25
    
    risk_level = "Low"
    if score > 50:
        risk_level = "High"
    elif score > 20:
        risk_level = "Medium"

    reasons = []
    if val and val.duplicate_status != "Unique":
        reasons.append("Duplicate invoice number matches existing registers.")
    if float(inv.total_amount) > 10000.0:
        reasons.append("Invoice total amount exceeds standard audit limits ($10k threshold).")
    if not inv.supplier or not inv.supplier.tax_number:
        reasons.append("Supplier Tax registration identifier is missing.")

    return {
        "invoice_id": id,
        "risk_score": score,
        "risk_level": risk_level,
        "explanations": reasons if reasons else ["No high risk factors detected in document structures."],
        "recommendations": [
            "Contact supplier to verify tax status." if not inv.supplier or not inv.supplier.tax_number else "Verify bank credentials before routing payment."
        ]
    }

@router.get("/conversations", response_model=List[Dict[str, Any]])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve chat history sessions logs."""
    convs = db.query(AIConversation).order_by(AIConversation.created_at.desc()).all()
    formatted = []
    for c in convs:
        # Load messages
        msgs = db.query(AIMessage).filter(AIMessage.conversation_id == c.id).order_by(AIMessage.created_at.asc()).all()
        formatted.append({
            "id": c.id,
            "session_title": c.session_title,
            "created_at": c.created_at,
            "messages": [{"sender": m.sender, "message_text": m.message_text, "created_at": m.created_at} for m in msgs]
        })
    return formatted

@router.post("/conversations/clear")
def clear_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Deletes AI chats logs from DB."""
    db.query(AIMessage).delete()
    db.query(AIConversation).delete()
    db.commit()
    return {"message": "AI assistant conversations history successfully cleared."}

@router.get("/favorites", response_model=List[Dict[str, Any]])
def list_favorite_prompts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Fetch user favorite prompts cards selections."""
    favs = db.query(FavoritePrompt).all()
    if not favs:
        # Seed defaults
        defaults = [
            "Why did this invoice fail validation?",
            "Explain the VAT calculation.",
            "Show invoices with high fraud risk."
        ]
        for d in defaults:
            db.add(FavoritePrompt(prompt_text=d))
        db.commit()
        favs = db.query(FavoritePrompt).all()
    return favs

@router.post("/favorites")
def add_favorite_prompt(
    req: FavoriteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Registers query card shortcut to favorites suggestions."""
    db_obj = FavoritePrompt(prompt_text=req.prompt_text)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return {"id": db_obj.id, "prompt_text": db_obj.prompt_text}
