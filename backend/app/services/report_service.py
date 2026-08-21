import os
from datetime import datetime
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from app.models.invoices import Invoice
from app.models.validation import ValidationResult, ValidationStatus
from app.config.config import settings

REPORTS_DIR = os.path.join(settings.UPLOAD_DIR, "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

class ReportService:
    def generate_validation_pdf(self, db: Session, invoice_id: int) -> str:
        """
        Generates a professional compliance audit report in PDF format using ReportLab.
        Returns the relative file download path.
        """
        # 1. Fetch relations
        invoice = db.query(Invoice).filter(Invoice.invoice_id == invoice_id).first()
        if not invoice:
            raise ValueError("Invoice not found.")
            
        val = invoice.validation_result
        if not val:
            raise ValueError("Validation results have not been generated for this invoice.")

        filename = f"validation_report_{invoice_id}.pdf"
        dest_path = os.path.join(REPORTS_DIR, filename)

        # 2. Setup document
        doc = SimpleDocTemplate(
            dest_path,
            pagesize=letter,
            rightMargin=40, leftMargin=40,
            topMargin=40, bottomMargin=40
        )

        styles = getSampleStyleSheet()
        
        # Define clean corporate text styles
        title_style = ParagraphStyle(
            name='DocTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor('#1E3A8A'), # Corporate Blue
            spaceAfter=12
        )
        
        section_style = ParagraphStyle(
            name='SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#2563EB'),
            spaceBefore=14,
            spaceAfter=6
        )

        normal_bold = ParagraphStyle(
            name='NormalBold',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=9,
            leading=12
        )

        normal_small = ParagraphStyle(
            name='NormalSmall',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=9,
            leading=12
        )

        story = []

        # 3. Logo placeholder / Header
        header_data = [
            [
                Paragraph("<b>SMART TAX INVOICE VALIDATION TOOL</b>", normal_bold),
                Paragraph(f"Report Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}", normal_small)
            ]
        ]
        header_table = Table(header_data, colWidths=[350, 180])
        header_table.setStyle(TableStyle([
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('LINEBELOW', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
            ('ALIGN', (1,0), (1,0), 'RIGHT')
        ]))
        story.append(header_table)
        story.append(Spacer(1, 15))

        # Title
        story.append(Paragraph("TAX INVOICE COMPLIANCE AUDIT REPORT", title_style))
        
        # Meta info grid
        meta_data = [
            [Paragraph("<b>Invoice Number:</b>", normal_bold), Paragraph(invoice.invoice_number, normal_small),
             Paragraph("<b>Audit Status:</b>", normal_bold), Paragraph(val.validation_status.value.upper(), normal_bold)],
            [Paragraph("<b>Supplier:</b>", normal_bold), Paragraph(invoice.supplier.supplier_name if invoice.supplier else 'N/A', normal_small),
             Paragraph("<b>Invoice Date:</b>", normal_bold), Paragraph(str(invoice.invoice_date or 'N/A'), normal_small)],
            [Paragraph("<b>Customer Name:</b>", normal_bold), Paragraph(invoice.customer.customer_name if invoice.customer else 'N/A', normal_small),
             Paragraph("<b>Total Amount:</b>", normal_bold), Paragraph(f"{invoice.currency} {float(invoice.total_amount):,.2f}", normal_bold)],
            [Paragraph("<b>Risk Rating:</b>", normal_bold), Paragraph(f"{val.risk_score}/100 ({invoice.risk_level.value.upper()})", normal_bold),
             Paragraph("<b>Compliance score:</b>", normal_bold), Paragraph(f"{val.validation_score}%", normal_bold)]
        ]
        meta_table = Table(meta_data, colWidths=[100, 160, 100, 170])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 15))

        # AI explanation Section
        story.append(Paragraph("AI Validation Executive Summary", section_style))
        summary_box = [
            [Paragraph(val.ai_explanation or 'No explanations compiled.', normal_small)]
        ]
        summary_table = Table(summary_box, colWidths=[530])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#EFF6FF')),
            ('PADDING', (0,0), (-1,-1), 10),
            ('LINELEFT', (0,0), (0,0), 3, colors.HexColor('#3B82F6')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 15))

        # Rule Checklist Table
        story.append(Paragraph("Compliance Checklist Results", section_style))
        
        # Re-map passed and failed checklist items visually
        missing_set = set(val.missing_fields or [])
        invalid_set = set((val.invalid_fields or {}).keys())
        
        checklist_rows = [
            ["Rule ID", "Compliance Description", "Check Status"]
        ]
        
        # 10 rules mappings
        rules_desc = [
            ("Rule 1", "Invoice Number presence and database uniqueness check"),
            ("Rule 2", "Supplier Name existence and matching registry check"),
            ("Rule 3", "Supplier Tax Number compliance format check"),
            ("Rule 4", "Invoice creation date boundaries check"),
            ("Rule 5", "Invoice Due Date validation check"),
            ("Rule 6", "Subtotal positive value check"),
            ("Rule 7", "VAT calculations recalculation variance audit"),
            ("Rule 8", "Grand Total arithmetic match check"),
            ("Rule 9", "Currency support checklist"),
            ("Rule 10", "Purchase Order code verification check")
        ]

        for rule_id, desc_text in rules_desc:
            is_passed = True
            # Simple rule mapping check based on model fields
            if rule_id == "Rule 1" and ("invoice_number" in missing_set or "invoice_number" in invalid_set):
                is_passed = False
            elif rule_id == "Rule 2" and "supplier_name" in missing_set:
                is_passed = False
            elif rule_id == "Rule 3" and ("supplier_tax_number" in missing_set or "supplier_tax_number" in invalid_set):
                is_passed = False
            elif rule_id == "Rule 4" and ("invoice_date" in missing_set or "invoice_date" in invalid_set):
                is_passed = False
            elif rule_id == "Rule 5" and "due_date" in invalid_set:
                is_passed = False
            elif rule_id == "Rule 6" and "subtotal" in invalid_set:
                is_passed = False
            elif rule_id == "Rule 7" and "vat_amount" in invalid_set:
                is_passed = False
            elif rule_id == "Rule 8" and "total_amount" in invalid_set:
                is_passed = False
            elif rule_id == "Rule 9" and "currency" in invalid_set:
                is_passed = False
            elif rule_id == "Rule 10" and "po_number" in missing_set:
                is_passed = False

            status_lbl = "PASSED" if is_passed else "FAILED"
            checklist_rows.append([rule_id, desc_text, status_lbl])

        checklist_table = Table(checklist_rows, colWidths=[70, 360, 100])
        
        # Generate cell table styling list
        t_style = [
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,0), 'LEFT'),
            ('PADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
        ]
        
        # Color highlight checklist cells
        for idx in range(1, len(checklist_rows)):
            lbl = checklist_rows[idx][2]
            if lbl == "PASSED":
                t_style.append(('TEXTCOLOR', (2, idx), (2, idx), colors.HexColor('#16A34A')))
                t_style.append(('FONTNAME', (2, idx), (2, idx), 'Helvetica-Bold'))
            else:
                t_style.append(('TEXTCOLOR', (2, idx), (2, idx), colors.HexColor('#DC2626')))
                t_style.append(('FONTNAME', (2, idx), (2, idx), 'Helvetica-Bold'))
                
        checklist_table.setStyle(TableStyle(t_style))
        story.append(checklist_table)
        story.append(Spacer(1, 15))

        # Recommendations block
        if val.ai_recommendations:
            story.append(Paragraph("System Recommendations", section_style))
            recs_bullets = []
            for r in val.ai_recommendations:
                recs_bullets.append(Paragraph(f"&bull; {r}", normal_small))
            
            recs_table = Table([[Paragraph("<br/>".join([f"&bull; {rec}" for rec in val.ai_recommendations]), normal_small)]], colWidths=[530])
            recs_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#FEF3C7')), # Yellow tint
                ('PADDING', (0,0), (-1,-1), 8),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F59E0B'))
            ]))
            story.append(recs_table)
            story.append(Spacer(1, 15))

        # Auditor comments / override history section
        story.append(Paragraph("Validation Override & Comments History", section_style))
        comments_list = val.comments_json or []
        if not comments_list:
            story.append(Paragraph("<i>No overrides or comments added.</i>", normal_small))
        else:
            comm_rows = []
            for c in comments_list:
                role = c.get('role', 'Auditor')
                txt = c.get('text', '')
                time_str = c.get('time', '')
                user_name = c.get('user', 'User')
                comm_rows.append([
                    Paragraph(f"<b>{user_name}</b> ({role})<br/><font color='gray'>{time_str}</font>", normal_small),
                    Paragraph(txt, normal_small)
                ])
            comm_table = Table(comm_rows, colWidths=[150, 380])
            comm_table.setStyle(TableStyle([
                ('PADDING', (0,0), (-1,-1), 6),
                ('LINEBELOW', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0,0), (-1,-1), 'TOP')
            ]))
            story.append(comm_table)

        story.append(Spacer(1, 30))

        # Bottom Signatures
        sig_data = [
            [Paragraph("_____________________________<br/>Auditor Signature", normal_small),
             Paragraph("_____________________________<br/>System Validation stamp", normal_small)]
        ]
        sig_table = Table(sig_data, colWidths=[265, 265])
        sig_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'TOP')
        ]))
        story.append(sig_table)

        # Build PDF Document
        doc.build(story)

        # Save generated report file path
        rel_pdf_path = f"/uploads/reports/{filename}"
        val.generated_report_path = rel_pdf_path
        db.commit()

        return rel_pdf_path

report_service = ReportService()
