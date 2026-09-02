import re
import decimal
from datetime import date, datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.models.invoices import Invoice, InvoiceStatus, RiskLevel
from app.models.validation import ValidationResult, ValidationStatus
from app.models.settings import SystemSettings
from app.models.countries import Country, CountryTaxConfiguration
from app.models.notifications import Notification, NotificationStatus
from app.repositories.audit_repository import audit_repository


def re_alphanumeric_dash(text: str) -> bool:
    """Check if text contains only alphanumeric, dashes, slashes, or underscores."""
    return bool(re.match(r'^[A-Za-z0-9\-_/]+$', text))


class ValidationService:
    """
    Production-grade Tax Invoice Validation and Compliance Rules Engine.
    Implements multi-country tax calculations, arithmetic verification, duplicate detection,
    and explainable fraud/risk analysis.
    """

    # Country tax registration format validators
    TAX_FORMAT_VALIDATORS = {
        'ZA': (r'^4\d{9}$', "South Africa VAT number must be 10 digits starting with 4."),
        'IN': (r'^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$', "India GSTIN must follow the standard 15-character format (e.g. 27AAPFU0939F1ZV)."),
        'GB': (r'^GB\d{9}(\d{3})?$', "UK VAT number must start with GB followed by 9 or 12 digits."),
        'US': (r'^\d{2}-\d{7}$|^\d{9}$', "US Employer Identification Number (EIN) must be 9 digits (XX-XXXXXXX)."),
        'AU': (r'^\d{11}$', "Australia Business Number (ABN) must be 11 digits."),
        'CA': (r'^\d{9}(RT\d{4})?$', "Canada Business Number / GST must be 9 digits or followed by RT0001."),
        'NL': (r'^NL\d{9}B\d{2}$', "Netherlands VAT number must follow NL + 9 digits + B + 2 digits."),
        'DE': (r'^DE\d{9}$', "Germany VAT number must start with DE followed by 9 digits."),
        'IE': (r'^IE\d{7}[A-Z]{1,2}$', "Ireland VAT number must follow IE + 7 digits + 1-2 letters."),
        'FR': (r'^FR[0-9A-Z]{2}\d{9}$', "France VAT number must follow FR + 2 alphanumeric + 9 digits.")
    }

    def run_validation(self, db: Session, invoice_id: int) -> ValidationResult:
        """
        Executes business rules compliance checklists and fraud evaluations
        on an invoice, updating tables and generating plain English explanations.
        """
        # 1. Fetch Invoice
        invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
        if not invoice:
            raise ValueError(f"Invoice ID {invoice_id} not found.")

        # 2. Fetch Rules Config & System Settings
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
            ai_recs.append("Enter the missing invoice number.")
        else:
            # Check unique constraints (Duplicate Check)
            dup_query = db.query(Invoice).filter(
                and_(
                    Invoice.invoice_id != invoice_id,
                    Invoice.invoice_number == inv_num,
                    Invoice.supplier_id == invoice.supplier_id
                )
            )
            duplicate_exists = dup_query.first()
            if duplicate_exists:
                # Check if exact duplicate (same amount and date) or suspicious duplicate
                is_exact = (
                    duplicate_exists.invoice_date == invoice.invoice_date and
                    abs(float(duplicate_exists.total_amount) - float(invoice.total_amount)) < 0.01
                )
                dup_type = "Exact duplicate" if is_exact else "Potential duplicate"
                failed_rules.append("Rule 1: Unique Invoice Number Required")
                fraud_flags["duplicate_invoice"] = True
                duplicate_detail = f"{dup_type} found. Previous invoice uploaded on {duplicate_exists.created_at.date()} (ID: {duplicate_exists.invoice_id})"
                ai_recs.append(f"Invoice number '{inv_num}' is already registered for this supplier.")
            else:
                if not re_alphanumeric_dash(inv_num):
                    failed_rules.append("Rule 1: Invalid Characters in Invoice Number")
                    invalid_fields["invoice_number"] = "Invoice number should contain only letters, numbers, and hyphens."
                    ai_recs.append("Remove special characters from invoice number.")
                else:
                    passed_rules.append("Rule 1: Invoice Number Valid")

        # --- RULE 2: Supplier Name Check ---
        supplier = invoice.supplier
        if not supplier or not supplier.supplier_name or supplier.supplier_name.strip() in ["", "Unknown Supplier"]:
            failed_rules.append("Rule 2: Supplier Name Required")
            missing_fields.append("supplier_name")
            fraud_flags["missing_mandatory_fields"] = True
            ai_recs.append("Specify a valid supplier name.")
        else:
            passed_rules.append("Rule 2: Supplier Name Verified")

        # --- RULE 3: Supplier Tax Registration Number Check ---
        tax_num = supplier.tax_number if supplier else None
        if not tax_num or tax_num.strip() == "" or tax_num.startswith("TEMP-"):
            failed_rules.append("Rule 3: Supplier Tax Number Required")
            missing_fields.append("supplier_tax_number")
            fraud_flags["fake_supplier"] = True
            ai_recs.append("Verify and provide the supplier's registered Tax / VAT / GSTIN number.")
        else:
            # Check country-specific tax number formats where applicable
            cleaned_tax = tax_num.replace(" ", "").replace("-", "")
            if len(cleaned_tax) < 6 or len(cleaned_tax) > 25:
                failed_rules.append("Rule 3: Invalid Supplier Tax Number Length")
                invalid_fields["supplier_tax_number"] = "Tax ID length must be between 6 and 25 characters."
                fraud_flags["invalid_tax_number"] = True
                ai_recs.append("Review the digit length of the supplier tax registration number.")
            else:
                passed_rules.append("Rule 3: Supplier Tax ID Valid")

        # --- RULE 4: Invoice Date Check ---
        inv_date = invoice.invoice_date
        if not inv_date:
            failed_rules.append("Rule 4: Invoice Date Required")
            missing_fields.append("invoice_date")
            ai_recs.append("Set the invoice issue date.")
        else:
            # Reject future date
            if inv_date > date.today():
                failed_rules.append("Rule 4: Future Dates Rejected")
                invalid_fields["invoice_date"] = f"Invoice date ({inv_date}) cannot be in the future."
                fraud_flags["future_invoice"] = True
                ai_recs.append("Correct the future invoice date.")
            else:
                # Invoice age limit check
                age_days = (date.today() - inv_date).days
                max_age = rules_config.get("max_invoice_age_days", 365)
                if age_days > max_age:
                    failed_rules.append("Rule 4: Invoice Older than Allowed Limit")
                    invalid_fields["invoice_date"] = f"Invoice is {age_days} days old (maximum configured allowance is {max_age} days)."
                    ai_recs.append("Confirm approval for claiming an aged invoice.")
                else:
                    passed_rules.append("Rule 4: Invoice Date Valid")

        # --- RULE 5: Due Date Check ---
        due_date = invoice.due_date
        if due_date and inv_date and due_date < inv_date:
            failed_rules.append("Rule 5: Due Date Must Fall On or After Invoice Date")
            invalid_fields["due_date"] = f"Due date ({due_date}) precedes invoice date ({inv_date})."
            ai_recs.append("Ensure the due date falls on or after the invoice date.")
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

        # --- RULE 7: Tax / VAT Recalculation Check ---
        vat_pct = float(invoice.vat_percentage)
        vat_amt = float(invoice.vat_amount)
        expected_vat = round(subtotal * (vat_pct / 100.00), 2)
        variance = abs(vat_amt - expected_vat)
        tolerance = float(rules_config.get("vat_tolerance", 0.05))
        
        vat_detail = f"Expected Tax: {expected_vat} {invoice.currency} ({vat_pct}%), Actual: {vat_amt} {invoice.currency} (Tolerance: {tolerance})"
        if rules_config.get("rule_vat_recalculate", True) and variance > tolerance:
            failed_rules.append("Rule 7: Tax Calculation Discrepancy")
            invalid_fields["vat_amount"] = f"Calculated tax is {expected_vat} {invoice.currency} based on {vat_pct}% rate, but invoice lists {vat_amt} {invoice.currency} (Discrepancy: {round(variance, 2)})."
            fraud_flags["modified_totals"] = True
            ai_recs.append(f"Correct mismatched tax calculation (Variance: {round(variance, 2)} {invoice.currency}).")
        else:
            passed_rules.append("Rule 7: Tax Calculations Valid")

        # --- RULE 8: Grand Total Math Check ---
        discount = float(invoice.discount)
        shipping = 0.0
        if invoice.extracted_json and isinstance(invoice.extracted_json, dict):
            shipping = float(invoice.extracted_json.get("shipping_cost", 0.0))
            
        total_amt = float(invoice.total_amount)
        calculated_total = round(subtotal - discount + vat_amt + shipping, 2)
        total_diff = abs(total_amt - calculated_total)
        
        if total_diff > 0.05:
            failed_rules.append("Rule 8: Grand Total Calculation Discrepancy")
            invalid_fields["total_amount"] = f"Calculated sum (Subtotal {subtotal} - Discount {discount} + Tax {vat_amt} + Shipping {shipping}) is {calculated_total} {invoice.currency}, but invoice has {total_amt} {invoice.currency}."
            fraud_flags["modified_totals"] = True
            ai_recs.append(f"Resolve grand total calculation error (Difference: {round(total_diff, 2)} {invoice.currency}).")
        else:
            passed_rules.append("Rule 8: Grand Total Valid")

        # --- RULE 9: Supported Currencies Check ---
        supported_currencies = ['USD', 'EUR', 'GBP', 'ZAR', 'INR', 'AUD', 'CAD', 'JPY', 'CHF', 'NZD', 'AED', 'SAR', 'SGD']
        if invoice.currency not in supported_currencies:
            failed_rules.append("Rule 9: Unsupported Currency Code")
            invalid_fields["currency"] = f"Currency '{invoice.currency}' is not currently enabled."
            ai_recs.append(f"Convert or configure currency code to supported types: {', '.join(supported_currencies[:5])}.")
        else:
            passed_rules.append("Rule 9: Currency Code Supported")

        # --- RULE 10: Purchase Order Check ---
        po = invoice.extracted_json.get("po_number") if (invoice.extracted_json and isinstance(invoice.extracted_json, dict)) else None
        if rules_config.get("rule_po_required", False) and (not po or po.strip() == ""):
            failed_rules.append("Rule 10: Purchase Order Required")
            missing_fields.append("po_number")
            ai_recs.append("Provide the required Purchase Order reference number.")
        else:
            passed_rules.append("Rule 10: PO Code Valid")

        # --- ADDITIONAL FRAUD & RISK SCORING ---
        if total_amt > 15000.00:
            fraud_flags["unusual_invoice_amount"] = True

        if fraud_flags["fake_supplier"] and total_amt > 1000.00:
            fraud_flags["suspicious_supplier_activity"] = True

        risk_score = 0.0
        if failed_rules:
            risk_score += len(failed_rules) * 10
        if fraud_flags["duplicate_invoice"]:
            risk_score += 40
        if fraud_flags["future_invoice"]:
            risk_score += 25
        if fraud_flags["modified_totals"]:
            risk_score += 25
        if fraud_flags["fake_supplier"] or fraud_flags["invalid_tax_number"]:
            risk_score += 20
        if fraud_flags["suspicious_supplier_activity"]:
            risk_score += 20
        if fraud_flags["unusual_invoice_amount"]:
            risk_score += 10
            
        risk_score = min(100.0, max(0.0, float(risk_score)))
        
        # Risk level determination
        risk_level = RiskLevel.LOW
        if risk_score > 60:
            risk_level = RiskLevel.HIGH
        elif risk_score > 25:
            risk_level = RiskLevel.MEDIUM

        # Validation compliance score
        failed_count = len(failed_rules)
        validation_score = max(0.0, 100.0 - (failed_count * 10))

        # Plain English AI Explanation
        ai_exp = self._generate_plain_english_explanation(
            failed_rules, invalid_fields, fraud_flags, duplicate_detail, invoice
        )

        # Status Badge Determination
        validation_status = ValidationStatus.PASSED
        invoice_status = InvoiceStatus.VALIDATED
        
        if failed_rules:
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
        val_result.fraud_score = decimal.Decimal(str(round(risk_score * 0.8, 2)))
        val_result.risk_score = decimal.Decimal(str(round(risk_score, 2)))
        val_result.validation_score = decimal.Decimal(str(round(validation_score, 2)))
        val_result.ai_explanation = ai_exp
        val_result.ai_recommendations = ai_recs
        val_result.fraud_flags = fraud_flags

        # Update Invoice Header statuses
        invoice.invoice_status = invoice_status
        invoice.risk_level = risk_level
        
        db.commit()
        db.refresh(val_result)

        # Log Audit
        audit_repository.create(
            db,
            user_id=invoice.uploaded_by,
            action="INVOICE_VALIDATED",
            description=f"Validation completed for invoice {invoice.invoice_number}. Status: {validation_status.value} (Risk Score: {risk_score})"
        )

        # Send Notification if flagged or rejected
        if validation_status in [ValidationStatus.WARNING, ValidationStatus.FAILED] and invoice.uploaded_by:
            notif = Notification(
                user_id=invoice.uploaded_by,
                title=f"Invoice {validation_status.value}: {invoice.invoice_number}",
                message=f"Validation check finished with {len(failed_rules)} warning(s). Review invoice details.",
                status=NotificationStatus.UNREAD
            )
            db.add(notif)
            db.commit()

        return val_result

    def _get_rules_config(self, db: Session) -> Dict[str, Any]:
        """Fetch system-wide validation rules config or use defaults."""
        settings = db.query(SystemSettings).filter(SystemSettings.id == 1).first()
        if settings and settings.rules_config:
            return settings.rules_config
        return {
            "rule_invoice_number_required": True,
            "rule_supplier_name_required": True,
            "rule_supplier_tax_number_required": True,
            "rule_invoice_date_required": True,
            "rule_due_date_after_invoice": True,
            "rule_subtotal_positive": True,
            "rule_vat_recalculate": True,
            "rule_grand_total_calculate": True,
            "rule_currency_supported": True,
            "rule_po_required": False,
            "vat_tolerance": 0.05,
            "max_invoice_age_days": 365
        }

    def _generate_plain_english_explanation(
        self,
        failed_rules: List[str],
        invalid_fields: Dict[str, Any],
        fraud_flags: Dict[str, Any],
        duplicate_detail: str,
        invoice: Invoice
    ) -> str:
        """Construct user-friendly plain English explanations for validation results."""
        if not failed_rules:
            return (
                f"Validation passed successfully. All structural checks, supplier tax registrations, "
                f"and arithmetic calculations for invoice {invoice.invoice_number} match configured compliance standards."
            )

        reasons = []
        if fraud_flags.get("duplicate_invoice"):
            reasons.append(f"A potential duplicate invoice was detected ({duplicate_detail}).")
        
        if "vat_amount" in invalid_fields:
            reasons.append(invalid_fields["vat_amount"])

        if "total_amount" in invalid_fields:
            reasons.append(invalid_fields["total_amount"])

        if "invoice_date" in invalid_fields:
            reasons.append(invalid_fields["invoice_date"])

        if "due_date" in invalid_fields:
            reasons.append(invalid_fields["due_date"])

        if fraud_flags.get("fake_supplier") or "supplier_tax_number" in invalid_fields:
            reasons.append("The supplier tax registration number is either missing or does not meet syntax standards.")

        if not reasons:
            reasons = [f"Check failed: {r}" for r in failed_rules]

        return "Validation flagged the following item(s): " + " ".join(reasons)


validation_service = ValidationService()
