import decimal
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.invoices import Invoice, InvoiceStatus, RiskLevel
from app.models.validation import ValidationResult, ValidationStatus
from app.models.settings import SystemSettings
from app.models.notifications import Notification, NotificationStatus
from app.repositories.audit_repository import audit_repository

class ValidationService:
    def run_validation(self, db: Session, invoice_id: int) -> ValidationResult:
        """
        Executes business rules compliance checklists and fraud evaluations
        on an invoice, updating tables and generating AI audit explanations.
        """
        # 1. Fetch Invoice
        invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice ID {invoice_id} not found.")

        # 2. Fetch Rules Config
        rules_config = self._get_rules_config(db)
        
        # 3. Initial state parameters
        passed_rules: List[str] = []
        failed_rules: List[str] = []
        missing_fields: List[str] = []
        invalid_fields: Dict[str, Any] = {}
        fraud_flags: Dict[str, Any] = {
            "duplicate_invoice": False,
            "future_invoice": False,
            "modified_totals": False,
            "fake_supplier": False,
            "invalid_tax_number": False,
            "missing_mandatory_fields": False,
            "unusual_invoice_amount": False,
            "suspicious_supplier_activity": False
        }
        ai_recs: List[str] = []
        duplicate_detail = "Unique"
        
        # --- RULE 1: Invoice Number Checks ---
        inv_num = invoice.invoice_number
        if not inv_num or inv_num.strip() == "":
            failed_rules.append("Rule 1: Invoice Number Required")
            missing_fields.append("invoice_number")
            ai_recs.append("Add missing invoice number value.")
        else:
            # Check unique constraints (Rule 1 & Duplicate Check)
            dup_query = db.query(Invoice).filter(
                and_(
                    Invoice.invoice_id != invoice_id,
                    Invoice.invoice_number == inv_num,
                    Invoice.supplier_id == invoice.supplier_id
                )
            )
            duplicate_exists = dup_query.first()
            if duplicate_exists:
                failed_rules.append("Rule 1: Unique Invoice Number Required")
                fraud_flags["duplicate_invoice"] = True
                duplicate_detail = f"Duplicate found. Uploaded on {duplicate_exists.created_at.date()}"
                ai_recs.append(f"Invoice number {inv_num} already registered for this supplier.")
            else:
                # Format checks
                if not re_alphanumeric_dash(inv_num):
                    failed_rules.append("Rule 1: Invalid Characters in Invoice Number")
                    invalid_fields["invoice_number"] = "Should only contain alphanumeric characters and hyphens."
                    ai_recs.append("Remove special characters from invoice number.")
                else:
                    passed_rules.append("Rule 1: Invoice Number Valid")

        # --- RULE 2: Supplier Name Check ---
        supplier = invoice.supplier
        if not supplier or not supplier.supplier_name or supplier.supplier_name.strip() == "Unknown Supplier":
            failed_rules.append("Rule 2: Supplier Name Required")
            missing_fields.append("supplier_name")
            ai_recs.append("Identify and specify the supplier name.")
        else:
            passed_rules.append("Rule 2: Supplier Name Verified")

        # --- RULE 3: Supplier Tax Number Check ---
        tax_num = supplier.tax_number if supplier else None
        if not tax_num or tax_num.strip() == "" or tax_num.startswith("TEMP-"):
            failed_rules.append("Rule 3: Supplier Tax Number Required")
            missing_fields.append("supplier_tax_number")
            fraud_flags["fake_supplier"] = True
            ai_recs.append("Verify and fill Supplier Tax registration number.")
        else:
            # Validate tax number length and format (Rule 3 format rules)
            cleaned_tax = tax_num.replace(" ", "").replace("-", "")
            if len(cleaned_tax) < 6 or len(cleaned_tax) > 20:
                failed_rules.append("Rule 3: Invalid Supplier Tax Number Length")
                invalid_fields["supplier_tax_number"] = "Tax ID length must be between 6 and 20 digits."
                fraud_flags["invalid_tax_number"] = True
                ai_recs.append("Review Supplier Tax Number digit length.")
            else:
                passed_rules.append("Rule 3: Supplier Tax ID Valid")

        # --- RULE 4: Invoice Date Check ---
        inv_date = invoice.invoice_date
        if not inv_date:
            failed_rules.append("Rule 4: Invoice Date Required")
            missing_fields.append("invoice_date")
            ai_recs.append("Configure the invoice creation date.")
        else:
            # Reject future date
            if inv_date > date.today():
                failed_rules.append("Rule 4: Future Dates Rejected")
                invalid_fields["invoice_date"] = "Invoice date cannot be in the future."
                fraud_flags["future_invoice"] = True
                ai_recs.append("Correct future invoice date.")
            else:
                # Invoice age check
                age_days = (date.today() - inv_date).days
                max_age = rules_config.get("max_invoice_age_days", 365)
                if age_days > max_age:
                    failed_rules.append("Rule 4: Invoice Older than Allowed Limit")
                    invalid_fields["invoice_date"] = f"Invoice date is older than {max_age} days."
                    ai_recs.append("Verify if old invoice should be accepted for payment.")
                else:
                    passed_rules.append("Rule 4: Invoice Date Valid")

        # --- RULE 5: Due Date Check ---
        due_date = invoice.due_date
        if due_date and inv_date and due_date < inv_date:
            failed_rules.append("Rule 5: Due Date Must Fall After Invoice Date")
            invalid_fields["due_date"] = "Due date is prior to invoice date."
            ai_recs.append("Correct due date parameter.")
        else:
            passed_rules.append("Rule 5: Due Date Valid")

        # --- RULE 6: Subtotal Check ---
        subtotal = float(invoice.subtotal)
        if subtotal <= 0:
            failed_rules.append("Rule 6: Subtotal Must Be Greater Than Zero")
            invalid_fields["subtotal"] = "Invoice subtotal must be positive."
            ai_recs.append("Ensure invoice subtotal is greater than zero.")
        else:
            passed_rules.append("Rule 6: Subtotal Valid")

        # --- RULE 7: VAT Recalculation Check ---
        vat_pct = float(invoice.vat_percentage)
        vat_amt = float(invoice.vat_amount)
        expected_vat = round(subtotal * (vat_pct / 100.00), 2)
        variance = abs(vat_amt - expected_vat)
        tolerance = float(rules_config.get("vat_tolerance", 0.05))
        
        vat_detail = f"Expected VAT: {expected_vat}, actual: {vat_amt} (tolerance: {tolerance})"
        if rules_config.get("rule_vat_recalculate", True) and variance > tolerance:
            failed_rules.append("Rule 7: VAT Calculation Discrepancy")
            invalid_fields["vat_amount"] = f"Calculated VAT is {expected_vat} but invoice has {vat_amt}."
            fraud_flags["modified_totals"] = True
            ai_recs.append(f"Correct mismatched VAT amount (Variance: {round(variance, 2)}).")
        else:
            passed_rules.append("Rule 7: VAT Calculations Valid")

        # --- RULE 8: Grand Total Math Check ---
        discount = float(invoice.discount)
        total_amt = float(invoice.total_amount)
        calculated_total = round(subtotal - discount + vat_amt, 2)
        total_diff = abs(total_amt - calculated_total)
        
        if total_diff > 0.01:
            failed_rules.append("Rule 8: Grand Total Calculation Error")
            invalid_fields["total_amount"] = f"Sum of Subtotal - Discount + VAT is {calculated_total} but invoice has {total_amt}."
            fraud_flags["modified_totals"] = True
            ai_recs.append(f"Resolve grand total calculation error. (Variance: {round(total_diff, 2)})")
        else:
            passed_rules.append("Rule 8: Grand Total Valid")

        # --- RULE 9: Supported Currencies Check ---
        supported = ['USD', 'EUR', 'GBP', 'ZAR']
        if invoice.currency not in supported:
            failed_rules.append("Rule 9: Unsupported Currency Code")
            invalid_fields["currency"] = f"System doesn't support {invoice.currency}."
            ai_recs.append(f"Exchange invoice currency to supported codes: {supported}.")
        else:
            passed_rules.append("Rule 9: Currency Code Supported")

        # --- RULE 10: Purchase Order Check ---
        po = invoice.extracted_json.get("po_number") if invoice.extracted_json else None
        if rules_config.get("rule_po_required", False) and (not po or po.strip() == ""):
            failed_rules.append("Rule 10: Purchase Order Required")
            missing_fields.append("po_number")
            ai_recs.append("Enter missing Purchase Order number.")
        else:
            passed_rules.append("Rule 10: PO Code Valid")

        # --- ADDITIONAL FRAUD & RISK CALCULATIONS ---
        # Unusual invoice amount check (> $10k triggers caution)
        if total_amt > 10000.00:
            fraud_flags["unusual_invoice_amount"] = True
            
        # Suspicious supplier check (if no tax number and large total)
        if fraud_flags["fake_supplier"] and total_amt > 1000.00:
            fraud_flags["suspicious_supplier_activity"] = True

        # Risk Score Gauge Math
        risk_score = 0
        if failed_rules:
            risk_score += len(failed_rules) * 10
        if fraud_flags["duplicate_invoice"]:
            risk_score += 40
        if fraud_flags["future_invoice"]:
            risk_score += 20
        if fraud_flags["modified_totals"]:
            risk_score += 25
        if fraud_flags["suspicious_supplier_activity"]:
            risk_score += 20
            
        risk_score = min(100.0, max(0.0, float(risk_score)))
        
        # Determine risk level category
        risk_level = RiskLevel.LOW
        if risk_score > 80:
            risk_level = RiskLevel.HIGH  # Critical maps to High enum
        elif risk_score > 50:
            risk_level = RiskLevel.HIGH
        elif risk_score > 20:
            risk_level = RiskLevel.MEDIUM

        # Determine compliance validation score
        failed_count = len(failed_rules)
        validation_score = max(0.0, 100.0 - (failed_count * 10))

        # 4. Generate AI explanations
        ai_exp = self._generate_ai_explanation(failed_rules, invalid_fields, fraud_flags, duplicate_detail)

        # Determine status badge
        validation_status = ValidationStatus.PASSED
        invoice_status = InvoiceStatus.VALIDATED
        
        if failed_rules:
            # If critical issues exist (duplicates, fraud, totals discrepancy) -> INVALID
            if fraud_flags["duplicate_invoice"] or fraud_flags["modified_totals"] or fraud_flags["future_invoice"] or total_amt <= 0:
                validation_status = ValidationStatus.FAILED
                invoice_status = InvoiceStatus.REJECTED
            else:
                validation_status = ValidationStatus.WARNING
                invoice_status = InvoiceStatus.FLAGGED

        # 5. Insert / Update ValidationResult Row
        val_result = db.query(ValidationResult).filter(ValidationResult.invoice_id == invoice_id).first()
        if not val_result:
            val_result = ValidationResult(invoice_id=invoice_id)
            db.add(val_result)
            
        val_result.validation_status = validation_status
        val_result.missing_fields = missing_fields
        val_result.invalid_fields = invalid_fields
        val_result.vat_validation = vat_detail
        val_result.duplicate_status = duplicate_detail
        val_result.fraud_score = decimal.Decimal(str(risk_score * 0.8)) # Fraud sub-index
        val_result.risk_score = decimal.Decimal(str(risk_score))
        val_result.validation_score = decimal.Decimal(str(validation_score))
        val_result.ai_explanation = ai_exp
        val_result.ai_recommendations = ai_recs
        val_result.fraud_flags = fraud_flags
        val_result.validation_notes = f"System check completed. Rules passed: {10 - len(failed_rules)}/10."
        
        # Update Invoice row statuses
        invoice.invoice_status = invoice_status
        invoice.risk_level = risk_level
        invoice.confidence_score = decimal.Decimal(str(validation_score))
        
        db.commit()
        db.refresh(val_result)

        # Audit rule failures
        if failed_rules:
            audit_repository.create(
                db,
                user_id=None,
                action="VALIDATION_WARNING",
                description=f"Invoice {invoice.invoice_number} failed {len(failed_rules)} compliance checks: {', '.join(failed_rules)}"
            )

        # Notifications
        notif_title = "Invoice Validated" if validation_status == ValidationStatus.PASSED else "Validation Failed"
        notif_msg = f"Audit compliance review for invoice {invoice.invoice_number} completed. Rating: {validation_status.value} ({validation_score}% Score)."
        
        db.add(
            Notification(
                user_id=invoice.uploaded_by or 1,
                title=notif_title,
                message=notif_msg,
                status=NotificationStatus.UNREAD
            )
        )
        db.commit()

        return val_result

    def _get_rules_config(self, db: Session) -> Dict[str, Any]:
        """Load business rules switches from system settings database table."""
        settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
        if settings and settings.rules_config:
            return settings.rules_config
        # Fallback default configurations
        return {
            "rule_invoice_number_required": True,
            "rule_invoice_number_unique": True,
            "rule_supplier_name_required": True,
            "rule_supplier_exists": True,
            "rule_supplier_tax_number_required": True,
            "rule_supplier_tax_number_format": True,
            "rule_invoice_date_required": True,
            "rule_invoice_date_past": True,
            "rule_due_date_after_invoice": True,
            "rule_subtotal_positive": True,
            "rule_vat_recalculate": True,
            "rule_grand_total_calculate": True,
            "rule_currency_supported": True,
            "rule_po_required": False,
            "vat_tolerance": 0.05,
            "max_invoice_age_days": 365
        }

    def _generate_ai_explanation(
        self,
        failed_rules: List[str],
        invalid_fields: Dict[str, Any],
        fraud_flags: Dict[str, Any],
        duplicate_detail: str
    ) -> str:
        """Construct a high-quality summary explaining audit findings in plain English."""
        if not failed_rules:
            return "Invoice passed validation successfully. All 10 compliance checklist criteria are satisfied, VAT and grand totals calculations are accurate, and no duplicate records were identified in archives."
        
        explanations = []
        if fraud_flags["duplicate_invoice"]:
            explanations.append(f"A duplicate invoice check failed: {duplicate_detail}.")
        
        if "Rule 7: VAT Calculation Discrepancy" in failed_rules and "vat_amount" in invalid_fields:
            explanations.append(f"VAT math discrepancies flagged: {invalid_fields['vat_amount']}")
            
        if "Rule 8: Grand Total Calculation Error" in failed_rules and "total_amount" in invalid_fields:
            explanations.append(f"Arithmetic grand total mismatch flagged: {invalid_fields['total_amount']}")
            
        if fraud_flags["future_invoice"]:
            explanations.append("Invoice contains an illegal future creation date.")

        if fraud_flags["fake_supplier"]:
            explanations.append("Supplier TAX ID is blank or missing registration identifiers.")

        other_errors = [r for r in failed_rules if "Rule 7" not in r and "Rule 8" not in r and "Rule 1" not in r and "Rule 4" not in r]
        if other_errors:
            explanations.append(f"Additional checklist checks failed: {', '.join(other_errors)}.")

        return "Invoice validation failed: " + " ".join(explanations)

def re_alphanumeric_dash(val: str) -> bool:
    """Validate character formats (Rule 1)."""
    import re
    return bool(re.match(r'^[A-Za-z0-9\-]+$', val))

validation_service = ValidationService()
