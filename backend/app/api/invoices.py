import os
import uuid
import decimal
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from pydantic import BaseModel, Field

from app.database.connection import get_db
from app.authentication.jwt import require_accountant_or_admin, require_any_role
from app.models.users import User
from app.models.invoices import Invoice, InvoiceItem, InvoiceStatus, RiskLevel, OcrStatus
from app.models.suppliers import Supplier, SupplierStatus
from app.models.customers import Customer
from app.models.notifications import Notification, NotificationStatus
from app.repositories.audit_repository import audit_repository
from app.services.ocr_service import ocr_service
from app.schemas.invoices import InvoiceResponse, InvoiceUpdate
from app.config.config import settings

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# Directory to save invoices
UPLOAD_INVOICE_DIR = os.path.join(settings.UPLOAD_DIR, "invoices")
os.makedirs(UPLOAD_INVOICE_DIR, exist_ok=True)

class SaveInvoiceRequest(BaseModel):
    invoice_number: str
    supplier_name: str
    supplier_tax_number: Optional[str] = None
    supplier_address: Optional[str] = None
    customer_name: str
    customer_tax_number: Optional[str] = None
    customer_address: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    currency: str = "USD"
    subtotal: decimal.Decimal
    vat_percentage: decimal.Decimal
    vat_amount: decimal.Decimal
    discount: decimal.Decimal
    total_amount: decimal.Decimal
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None

@router.get("", response_model=List[InvoiceResponse])
def list_invoices(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[InvoiceStatus] = None,
    risk: Optional[RiskLevel] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve search-filtered historical invoice list."""
    query = db.query(Invoice)
    
    if status:
        query = query.filter(Invoice.invoice_status == status)
    if risk:
        query = query.filter(Invoice.risk_level == risk)
        
    if search:
        search_filter = f"%{search}%"
        # Join supplier and customer to search names
        query = query.outerjoin(Supplier).outerjoin(Customer).filter(
            or_(
                Invoice.invoice_number.ilike(search_filter),
                Supplier.supplier_name.ilike(search_filter),
                Customer.customer_name.ilike(search_filter)
            )
        )
        
    return query.order_by(desc(Invoice.created_at)).offset(skip).limit(limit).all()

@router.get("/recent", response_model=List[InvoiceResponse])
def get_recent_uploads(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Retrieve 5 most recently uploaded invoices."""
    return db.query(Invoice).order_by(desc(Invoice.created_at)).limit(5).all()

@router.get("/{id}", response_model=InvoiceResponse)
def get_invoice_details(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role)
):
    """Fetch invoice detailed schema."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found")
    return invoice

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_invoice(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant_or_admin)
):
    """
    Accepts file, validates dimensions, extension and size <= 20MB.
    Processes OCR text extraction and saves records to DB.
    """
    # 1. Security Check: File Size Limit (20MB)
    max_bytes = 20 * 1024 * 1024
    content = await file.read()
    file_size = len(content)
    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invoice file size exceeds maximum allowance of 20MB."
        )

    # Reset file head cursor after reading size
    await file.seek(0)

    # 2. Security Check: File Type whitelist
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".png", ".jpg", ".jpeg"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Forbidden format. System supports PDF, PNG, JPG, JPEG."
        )

    # 3. Save file securely with unique uuid prefix
    unique_fn = f"{uuid.uuid4().hex}_{file.filename}"
    file_dest_path = os.path.join(UPLOAD_INVOICE_DIR, unique_fn)
    
    with open(file_dest_path, "wb") as f:
        f.write(content)

    # Log file upload start in audits
    ip = request.client.host if request.client else None
    browser = request.headers.get("user-agent", "Unknown Browser")
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="INVOICE_UPLOAD",
        description=f"Uploaded invoice: {file.filename} (Size: {round(file_size/(1024*1024), 2)}MB)",
        ip_address=ip,
        browser=browser
    )

    # Send Notification
    notif = Notification(
        user_id=current_user.id,
        title="OCR Extraction Started",
        message=f"Parsing started automatically for: {file.filename}",
        status=NotificationStatus.UNREAD
    )
    db.add(notif)
    db.commit()

    # 4. Trigger OCR Extraction
    try:
        ocr_result = ocr_service.extract_invoice_data(file_dest_path, file.filename)
    except Exception as ocr_fail:
        # Update logs on fail
        audit_repository.create(
            db,
            user_id=current_user.id,
            action="OCR_FAILED",
            description=f"OCR extraction failed for file: {file.filename}. Error: {str(ocr_fail)}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR parsing failed: {str(ocr_fail)}"
        )

    # 5. DB Insertion of Extracted OCR records
    fields = ocr_result["fields"]
    
    # 5.1 Match or Seed Supplier
    supplier = None
    if fields.get("supplier_tax_number"):
        supplier = db.query(Supplier).filter(Supplier.tax_number == fields["supplier_tax_number"]).first()
        
    if not supplier:
        supplier = Supplier(
            supplier_name=fields.get("supplier_name", "Unknown Supplier"),
            tax_number=fields.get("supplier_tax_number") or f"TEMP-{uuid.uuid4().hex[:8].upper()}",
            email=fields.get("supplier_email"),
            phone=fields.get("supplier_phone"),
            address=fields.get("supplier_address"),
            status=SupplierStatus.ACTIVE
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)

    # 5.2 Match or Seed Customer
    customer = None
    if fields.get("customer_tax_number"):
        customer = db.query(Customer).filter(Customer.tax_number == fields["customer_tax_number"]).first()
        
    if not customer:
        customer = Customer(
            customer_name=fields.get("customer_name", "Unknown Customer"),
            tax_number=fields.get("customer_tax_number") or f"TEMP-{uuid.uuid4().hex[:8].upper()}",
            email=None,
            phone=None,
            address=fields.get("customer_address"),
            country="US"
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

    # Convert date strings to python Date
    inv_date = None
    due_date = None
    try:
        if fields.get("invoice_date"):
            inv_date = datetime.strptime(fields["invoice_date"], "%Y-%m-%d").date()
        if fields.get("due_date"):
            due_date = datetime.strptime(fields["due_date"], "%Y-%m-%d").date()
    except Exception:
        pass

    # 5.3 Save Invoice model
    invoice = Invoice(
        invoice_number=fields.get("invoice_number", f"MOCK-{uuid.uuid4().hex[:8].upper()}"),
        supplier_id=supplier.supplier_id,
        customer_id=customer.customer_id,
        invoice_date=inv_date,
        due_date=due_date,
        currency=fields.get("currency", "USD"),
        subtotal=decimal.Decimal(str(fields.get("subtotal", 0.00))),
        vat_percentage=decimal.Decimal(str(fields.get("vat_percentage", 0.00))),
        vat_amount=decimal.Decimal(str(fields.get("vat_amount", 0.00))),
        discount=decimal.Decimal(str(fields.get("discount", 0.00))),
        total_amount=decimal.Decimal(str(fields.get("total_amount", 0.00))),
        invoice_status=InvoiceStatus.PENDING,
        risk_level=fields.get("risk_level", RiskLevel.LOW),
        confidence_score=decimal.Decimal(str(ocr_result["confidence_score"])),
        ocr_status=OcrStatus.SUCCESS,
        file_path=f"/uploads/invoices/{unique_fn}",
        uploaded_by=current_user.id,
        ocr_text=ocr_result["raw_text"],
        extracted_json=fields,
        processing_time=decimal.Decimal(str(ocr_result["processing_time"])),
        thumbnail_path=None
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    # 5.4 Insert Line items
    for item in fields.get("items", []):
        db_item = InvoiceItem(
            invoice_id=invoice.invoice_id,
            description=item.get("description", "Services Setup"),
            quantity=decimal.Decimal(str(item.get("quantity", 1.00))),
            unit_price=decimal.Decimal(str(item.get("unit_price", 0.00))),
            tax_rate=decimal.Decimal(str(item.get("tax_rate", 0.00))),
            total=decimal.Decimal(str(item.get("total", 0.00)))
        )
        db.add(db_item)
    db.commit()
    db.refresh(invoice)

    # Audit log OCR completed
    audit_repository.create(
        db,
        user_id=current_user.id,
        action="OCR_COMPLETED",
        description=f"OCR processed successfully for {file.filename} in {ocr_result['processing_time']}s. Accuracy: {ocr_result['confidence_score']}%"
    )

    # Success Notification
    notif_comp = Notification(
        user_id=current_user.id,
        title="OCR Processing Successful",
        message=f"Intelligent fields extracted for: {file.filename} (Confidence: {ocr_result['confidence_score']}%)",
        status=NotificationStatus.UNREAD
    )
    db.add(notif_comp)
    db.commit()

    return invoice

@router.put("/{id}", response_model=InvoiceResponse)
def save_invoice_edits(
    id: int,
    data: SaveInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant_or_admin)
):
    """Apply manual corrections and modifications to the extracted invoice details."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found")

    # Sync dates
    inv_date = None
    due_date = None
    try:
        if data.invoice_date:
            inv_date = datetime.strptime(data.invoice_date, "%Y-%m-%d").date()
        if data.due_date:
            due_date = datetime.strptime(data.due_date, "%Y-%m-%d").date()
    except Exception:
        pass

    # Update columns
    invoice.invoice_number = data.invoice_number
    invoice.invoice_date = inv_date
    invoice.due_date = due_date
    invoice.currency = data.currency
    invoice.subtotal = data.subtotal
    invoice.vat_percentage = data.vat_percentage
    invoice.vat_amount = data.vat_amount
    invoice.discount = data.discount
    invoice.total_amount = data.total_amount

    # Sync supplier and customer names inside relation tables
    if invoice.supplier:
        invoice.supplier.supplier_name = data.supplier_name
        if data.supplier_tax_number:
            invoice.supplier.tax_number = data.supplier_tax_number
        if data.supplier_address:
            invoice.supplier.address = data.supplier_address
            
    if invoice.customer:
        invoice.customer.customer_name = data.customer_name
        if data.customer_tax_number:
            invoice.customer.tax_number = data.customer_tax_number
        if data.customer_address:
            invoice.customer.address = data.customer_address

    db.commit()
    db.refresh(invoice)

    audit_repository.create(
        db,
        user_id=current_user.id,
        action="INVOICE_MODIFIED",
        description=f"Manually updated details for invoice: {invoice.invoice_number}"
    )

    return invoice

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_invoice(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_accountant_or_admin)
):
    """Permanently delete an invoice, its uploaded files, and DB logs."""
    invoice = db.query(Invoice).filter(Invoice.invoice_id == id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice record not found")

    # Remove physical file if exists
    if invoice.file_path:
        # Remove leading slash to construct relative file path
        rel_path = invoice.file_path.lstrip("/")
        # Target upload directory is settings.UPLOAD_DIR/../rel_path or settings.UPLOAD_DIR/invoices/unique_fn
        # In our main configuration: mount "/uploads" mapping to settings.UPLOAD_DIR
        # So "/uploads/invoices/unique_fn" relative path maps to settings.UPLOAD_DIR + "/invoices/unique_fn"
        fn = os.path.basename(invoice.file_path)
        file_path_full = os.path.join(UPLOAD_INVOICE_DIR, fn)
        if os.path.exists(file_path_full):
            try:
                os.remove(file_path_full)
            except Exception:
                pass

    invoice_number = invoice.invoice_number
    db.delete(invoice)
    db.commit()

    audit_repository.create(
        db,
        user_id=current_user.id,
        action="INVOICE_DELETED",
        description=f"Deleted invoice record: {invoice_number}"
    )

    return {"message": "Invoice successfully deleted"}
