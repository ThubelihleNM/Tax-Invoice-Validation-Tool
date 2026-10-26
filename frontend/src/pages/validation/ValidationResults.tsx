import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { 
  FileText, ShieldCheck, ShieldAlert, ShieldX, ChevronLeft, 
  Download, Edit3, MessageSquare, AlertCircle, CheckCircle, 
  HelpCircle, Sparkles, Send, Check, X, ClipboardCheck, ArrowRight,
  Save, RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { toast } from '../../components/common/Toast';
import { Spinner } from '../../components/common/Spinner';
import { Input } from '../../components/common/Input';
import { Dropdown } from '../../components/common/Dropdown';
import { useAuth } from '../../contexts/AuthContext';

interface ValidationResultData {
  validation_id: number;
  validation_status: 'Passed' | 'Failed' | 'Warning';
  risk_score: number;
  validation_score: number;
  ai_explanation: string;
  ai_recommendations: string[];
  duplicate_status: string;
  fraud_score: number;
  fraud_flags: {
    duplicate_invoice: boolean;
    future_invoice: boolean;
    modified_totals: boolean;
    fake_supplier: boolean;
    invalid_tax_number: boolean;
    missing_mandatory_fields: boolean;
    unusual_invoice_amount: boolean;
    suspicious_supplier_activity: boolean;
  };
  missing_fields: string[];
  invalid_fields: Record<string, string>;
  comments_json: Array<{
    user: string;
    role: string;
    text: string;
    time: string;
  }>;
}

interface InvoiceData {
  invoice_id: number;
  invoice_number: string;
  invoice_date?: string;
  due_date?: string;
  currency: string;
  subtotal?: number | string;
  vat_percentage?: number | string;
  vat_amount?: number | string;
  discount?: number | string;
  total_amount: number;
  risk_level?: any;
  file_path?: string;
  supplier?: {
    supplier_name: string;
    tax_number?: string;
    address?: string;
  };
  customer?: {
    customer_name: string;
    tax_number?: string;
    address?: string;
  };
}

export const ValidationResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const invoiceId = searchParams.get('id');

  const isAdmin = user?.role === 'Administrator';
  const isAuditor = user?.role === 'Auditor';

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [result, setResult] = useState<ValidationResultData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [revalidating, setRevalidating] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  
  // Overrides modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<'Passed' | 'Rejected'>('Passed');
  const [overrideComment, setOverrideComment] = useState('');
  const [overriding, setOverriding] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (formData: any) => {
    if (!invoiceId) return;
    setSaving(true);
    try {
      await axios.put(`/api/invoices/${invoiceId}`, formData);
      toast('success', 'Updated', 'Invoice fields updated successfully.');
      navigate(`/validation?id=${invoiceId}`);
      fetchData();
    } catch (err) {
      toast('danger', 'Update Failed', 'Failed to update invoice fields.');
    } finally {
      setSaving(false);
    }
  };

  const fetchData = async () => {
    if (!invoiceId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const resInv = await axios.get(`/api/invoices/${invoiceId}`);
      setInvoice(resInv.data);
      reset({
        supplier_name: resInv.data.supplier?.supplier_name || '',
        supplier_tax_number: resInv.data.supplier?.tax_number || '',
        supplier_address: resInv.data.supplier?.address || '',
        customer_name: resInv.data.customer?.customer_name || '',
        customer_tax_number: resInv.data.customer?.tax_number || '',
        customer_address: resInv.data.customer?.address || '',
        invoice_number: resInv.data.invoice_number || '',
        invoice_date: resInv.data.invoice_date || '',
        due_date: resInv.data.due_date || '',
        currency: resInv.data.currency || 'USD',
        payment_method: '',
        reference_number: '',
        subtotal: resInv.data.subtotal || 0,
        vat_percentage: resInv.data.vat_percentage || 0,
        vat_amount: resInv.data.vat_amount || 0,
        discount: resInv.data.discount || 0,
        total_amount: resInv.data.total_amount || 0,
      });

      const resVal = await axios.get(`/api/validation/${invoiceId}`);
      setResult(resVal.data);
    } catch (err) {
      toast('danger', 'Error', 'Failed to retrieve invoice validation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [invoiceId]);

  const handleRevalidate = async () => {
    if (!invoiceId) return;
    setRevalidating(true);
    try {
      await axios.post(`/api/validation/run/${invoiceId}`);
      toast('success', 'Validation Complete', 'Engine successfully re-evaluated the invoice data.');
      fetchData();
    } catch (err) {
      toast('danger', 'Revalidation Failed', 'Failed to execute rules checks.');
    } finally {
      setRevalidating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !invoiceId) return;
    setCommenting(true);
    try {
      await axios.post(`/api/validation/comment/${invoiceId}`, { comment: commentText });
      toast('success', 'Comment Logged', 'Auditing comment added to validation history.');
      setCommentText('');
      fetchData();
    } catch (err) {
      toast('danger', 'Comment Failed', 'Failed to write comment notes.');
    } finally {
      setCommenting(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!overrideComment.trim() || !invoiceId) {
      toast('warning', 'Override comment required', 'Provide a short justification rationale.');
      return;
    }
    setOverriding(true);
    try {
      await axios.post(`/api/validation/override/${invoiceId}`, {
        status: overrideStatus,
        comment: overrideComment
      });
      toast('success', 'Override Applied', `Status updated manually to ${overrideStatus}.`);
      setShowOverrideModal(false);
      setOverrideComment('');
      fetchData();
    } catch (err) {
      toast('danger', 'Override Failed', 'Manual status override action failed.');
    } finally {
      setOverriding(false);
    }
  };

  const downloadPDFReport = async () => {
    if (!invoiceId) return;
    setDownloadingReport(true);
    try {
      const response = await axios.get(`/api/validation/report/${invoiceId}`, {
        responseType: 'blob'
      });
      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(pdfBlob);
      const downloadLink = document.createElement('a');
      const safeInvoiceNumber = (invoice?.invoice_number || invoiceId).replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadLink.href = downloadUrl;
      downloadLink.download = `Invoice_Audit_${safeInvoiceNumber}.pdf`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 1000);
      toast('success', 'Report Downloaded', 'The tax audit PDF report has been downloaded.');
    } catch (err) {
      toast('danger', 'Download Failed', 'Could not download the audit report. Run the audit again and retry.');
    } finally {
      setDownloadingReport(false);
    }
  };

  // Helper colors mapping
  const getRiskColor = (score: number) => {
    if (score <= 20) return 'text-success stroke-success';
    if (score <= 50) return 'text-warning stroke-warning';
    return 'text-danger stroke-danger';
  };

  const getRiskBg = (score: number) => {
    if (score <= 20) return 'bg-success/10 text-success border-success/20';
    if (score <= 50) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-danger/10 text-danger border-danger/20';
  };

  const getStatusBadge = (status: string) => {
    const map = {
      Passed: 'success',
      Warning: 'warning',
      Failed: 'danger'
    } as const;
    return <Badge variant={map[status as keyof typeof map] || 'gray'}>{status.toUpperCase()}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Compiling validation findings...</p>
      </div>
    );
  }

  if (!invoiceId || !invoice || !result) {
    return (
      <div className="max-w-md mx-auto min-h-[50vh] flex flex-col justify-center items-center text-center space-y-4">
        <div className="p-4 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800 text-slate-400 rounded-full">
          <FileText size={40} />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No Compliance Records</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The validation results for this invoice are not present. Select a valid invoice from the Logs registry.
        </p>
        <Button size="sm" className="text-xs" onClick={() => navigate('/history')}>
          Go to History
        </Button>
      </div>
    );
  }

  // Draw rules checklist check status helper
  const missingSet = new Set(result.missing_fields || []);
  const invalidSet = new Set(Object.keys(result.invalid_fields || {}));

  const rulesChecklist = [
    { rule: "Rule 1", title: "Invoice Number Presence", passed: !missingSet.has("invoice_number") && !invalidSet.has("invoice_number"), desc: "Identifier cannot be blank and must satisfy alphanumeric formats." },
    { rule: "Rule 2", title: "Supplier Identification", passed: !missingSet.has("supplier_name"), desc: "Supplier name must resolve cleanly from text OCR scans." },
    { rule: "Rule 3", title: "Supplier Tax Number Registration", passed: !missingSet.has("supplier_tax_number") && !invalidSet.has("supplier_tax_number"), desc: "Supplier tax code length (6-20 digits) format must be valid." },
    { rule: "Rule 4", title: "Invoice Date Validation", passed: !missingSet.has("invoice_date") && !invalidSet.has("invoice_date"), desc: "Invoice cannot carry a future date or exceed age limit thresholds." },
    { rule: "Rule 5", title: "Invoice Due Date Ordering", passed: !invalidSet.has("due_date"), desc: "Due date must fall on or after the issuance date." },
    { rule: "Rule 6", title: "Subtotal Boundaries Check", passed: !invalidSet.has("subtotal"), desc: "Subtotal amounts must exceed zero." },
    { rule: "Rule 7", title: "VAT Recalculation Check", passed: !invalidSet.has("vat_amount"), desc: "Re-calculated VAT compared with invoice values aligns within tolerance." },
    { rule: "Rule 8", title: "Grand Total Math Balance", passed: !invalidSet.has("total_amount"), desc: "Subtotal - Discount + VAT sums match the invoice total amount." },
    { rule: "Rule 9", title: "Currency Support Checklist", passed: !invalidSet.has("currency"), desc: "Invoice currency matches standard codes (INR, USD, EUR, GBP, ZAR, CAD, AUD, AED)." },
    { rule: "Rule 10", title: "PO Code References", passed: !missingSet.has("po_number"), desc: "Checks for required corporate Purchase Order referencing." }
  ];

  const riskVal = Number(result.risk_score);
  const scoreVal = Number(result.validation_score);
  const fileUrl = invoice.file_path || '';
  const isImage = /\.(png|jpg|jpeg)$/i.test(fileUrl);

  const isEditing = searchParams.get('edit') === 'true';

  const getFieldHighlightStyle = (val: any, fieldName: string) => {
    if (missingSet.has(fieldName) || val === undefined || val === null || String(val).trim() === '') {
      return 'border-danger focus:ring-danger text-danger bg-danger/5';  // Missing field: Red
    }
    if (invalidSet.has(fieldName)) {
      return 'border-warning focus:ring-warning text-warning bg-warning/5'; // Low confidence: Yellow
    }
    return 'border-success/40 focus:ring-success dark:border-success/20 text-slate-800 dark:text-slate-100 focus:border-transparent'; // High confidence: Green
  };

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/validation?id=${invoiceId}`)}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-550 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
              Edit Extracted Fields: {invoice.invoice_number}
            </h1>
            <p className="text-xs text-slate-400">
              Modify values parsed during OCR before recalculating compliance metrics.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 h-[70vh] flex">
            <Card className="w-full h-full flex flex-col p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Document Preview</h3>
              <div className="flex-grow rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 overflow-hidden flex items-center justify-center p-2">
                {isImage ? (
                  <img src={fileUrl} alt="Invoice Scanned Scan" className="max-w-full max-h-full object-contain rounded shadow-lg" />
                ) : (
                  <iframe src={fileUrl + "#toolbar=0&navpanes=0"} title="PDF Invoice Preview" className="w-full h-full border-none rounded bg-white" />
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-sans">Extracted Fields Form</h3>
                      <p className="text-[10px] text-slate-400 font-sans">Correct fields highlighted with warnings.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
                  
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b dark:border-slate-800 pb-1">Supplier Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Supplier Name" className={getFieldHighlightStyle(invoice.supplier?.supplier_name, 'supplier_name')} {...register('supplier_name', { required: 'Supplier name is required' })} />
                      <Input label="Supplier Tax Number" className={getFieldHighlightStyle(invoice.supplier?.tax_number, 'supplier_tax_number')} {...register('supplier_tax_number')} />
                    </div>
                    <Input label="Supplier Address" className={getFieldHighlightStyle(invoice.supplier?.address, 'supplier_address')} {...register('supplier_address')} />
                  </div>

                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b dark:border-slate-800 pb-1">Customer Details</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input label="Customer Name" className={getFieldHighlightStyle(invoice.customer?.customer_name, 'customer_name')} {...register('customer_name', { required: 'Customer name is required' })} />
                      <Input label="Customer Tax ID" className={getFieldHighlightStyle(invoice.customer?.tax_number, 'customer_tax_number')} {...register('customer_tax_number')} />
                    </div>
                    <Input label="Customer Address" className={getFieldHighlightStyle(invoice.customer?.address, 'customer_address')} {...register('customer_address')} />
                  </div>

                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b dark:border-slate-800 pb-1">Invoice Metadata</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Input label="Invoice Number" className={getFieldHighlightStyle(invoice.invoice_number, 'invoice_number')} {...register('invoice_number', { required: 'Invoice number is required' })} />
                      <Input label="Invoice Date" type="date" className={getFieldHighlightStyle(invoice.invoice_date, 'invoice_date')} {...register('invoice_date')} />
                      <Input label="Due Date" type="date" className={getFieldHighlightStyle(invoice.due_date, 'due_date')} {...register('due_date')} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Dropdown 
                        label="Currency" 
                        options={[
                          { value: 'INR', label: 'INR - Indian Rupee (₹)' },
                          { value: 'USD', label: 'USD - US Dollar ($)' },
                          { value: 'EUR', label: 'EUR - Euro (€)' },
                          { value: 'GBP', label: 'GBP - British Pound (£)' },
                          { value: 'ZAR', label: 'ZAR - South African Rand (R)' },
                          { value: 'CAD', label: 'CAD - Canadian Dollar ($)' },
                          { value: 'AUD', label: 'AUD - Australian Dollar ($)' },
                          { value: 'AED', label: 'AED - UAE Dirham' },
                          { value: 'NGN', label: 'NGN - Nigerian Naira (₦)' },
                          { value: 'KES', label: 'KES - Kenyan Shilling (KSh)' },
                          { value: 'ZWG', label: 'ZWG - Zimbabwe Gold (ZiG)' }
                        ]} 
                        {...register('currency')} 
                      />
                      <Input label="Payment Method" className={getFieldHighlightStyle(result.fraud_flags?.duplicate_invoice, 'payment_method')} {...register('payment_method')} />
                      <Input label="Reference Number" className={getFieldHighlightStyle(result.fraud_flags?.duplicate_invoice, 'reference_number')} {...register('reference_number')} />
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b dark:border-slate-800 pb-1">Financial Summary</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <Input label="Subtotal" type="number" step="0.01" className={getFieldHighlightStyle(invoice.subtotal, 'subtotal')} {...register('subtotal', { required: 'Subtotal is required', valueAsNumber: true })} />
                      <Input label="VAT Rate (%)" type="number" step="0.1" className={getFieldHighlightStyle(invoice.vat_percentage, 'vat_percentage')} {...register('vat_percentage', { valueAsNumber: true })} />
                      <Input label="VAT Amount" type="number" step="0.01" className={getFieldHighlightStyle(invoice.vat_amount, 'vat_amount')} {...register('vat_amount', { valueAsNumber: true })} />
                      <Input label="Discount" type="number" step="0.01" className={getFieldHighlightStyle(invoice.discount, 'discount')} {...register('discount', { valueAsNumber: true })} />
                      <Input label="Grand Total" type="number" step="0.01" className={getFieldHighlightStyle(invoice.total_amount, 'total_amount')} {...register('total_amount', { required: 'Total amount is required', valueAsNumber: true })} />
                    </div>
                  </div>

                </CardContent>
                <CardFooter className="flex justify-between border-t dark:border-slate-850 pt-4">
                  <Button variant="outline" type="button" onClick={() => navigate(`/validation?id=${invoiceId}`)}>
                    Cancel
                  </Button>
                  <Button type="submit" isLoading={saving} className="flex items-center gap-1.5">
                    <Save size={16} />
                    <span>Save and Revalidate</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/history')}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-550 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Audit Compliance Report: {invoice.invoice_number}
              </h1>
              {getStatusBadge(result.validation_status)}
            </div>
            <p className="text-xs text-slate-400">
              Audit logs generated by validation engine rules thresholds.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {!isAuditor && (
            <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5" onClick={() => navigate(`/validation?id=${invoiceId}&edit=true`)}>
              <Edit3 size={14} />
              <span>Correct OCR Fields</span>
            </Button>
          )}
          <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5" onClick={downloadPDFReport} isLoading={downloadingReport}>
            <Download size={14} />
            <span>Download PDF Report</span>
          </Button>
          {!isAuditor && (
            <Button size="sm" className="text-xs flex items-center gap-1.5" onClick={handleRevalidate} isLoading={revalidating}>
              <RefreshCw size={14} className={revalidating ? 'animate-spin' : ''} />
              <span>Run Rules Engine</span>
            </Button>
          )}
        </div>
      </div>

      {/* Validation timeline progress bar */}
      <Card className="p-4 bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-850">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2 text-primary"><span className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-[10px]">1</span> <span>Uploaded</span></div>
          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-grow max-w-[50px] hidden sm:block" />
          <div className="flex items-center gap-2 text-primary"><span className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-[10px]">2</span> <span>OCR Complete</span></div>
          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-grow max-w-[50px] hidden sm:block" />
          <div className="flex items-center gap-2 text-primary"><span className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-[10px]">3</span> <span>Validation Running</span></div>
          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-grow max-w-[50px] hidden sm:block" />
          <div className={`flex items-center gap-2 ${result.duplicate_status ? 'text-primary' : ''}`}><span className="h-4 w-4 bg-primary/25 rounded-full flex items-center justify-center text-[10px]">4</span> <span>Duplicate check</span></div>
          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-grow max-w-[50px] hidden sm:block" />
          <div className="flex items-center gap-2 text-primary"><span className="h-4 w-4 bg-primary/20 rounded-full flex items-center justify-center text-[10px]">5</span> <span>Fraud Evaluated</span></div>
          <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-grow max-w-[50px] hidden sm:block" />
          <div className="flex items-center gap-2 text-success"><ClipboardCheck size={16} /> <span>Report Generated</span></div>
        </div>
      </Card>

      {/* Main content grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: PDF Document frame */}
        <div className="lg:col-span-5 h-[70vh] flex">
          <Card className="w-full h-full flex flex-col p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Invoice Document Preview</h3>
            <div className="flex-grow rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 overflow-hidden flex items-center justify-center p-2">
              {isImage ? (
                <img 
                  src={fileUrl} 
                  alt="Invoice Scanned Scan" 
                  className="max-w-full max-h-full object-contain rounded shadow-lg"
                />
              ) : (
                <iframe
                  src={fileUrl + "#toolbar=0&navpanes=0"}
                  title="PDF Invoice Preview"
                  className="w-full h-full border-none rounded bg-white"
                />
              )}
            </div>
          </Card>
        </div>

        {/* Right column: Audit board dashboards */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Risk and validation rating cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Risk radial gauge score */}
            <Card className="flex flex-col items-center p-6 text-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Invoice Risk Score</h3>
              <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                  <circle cx="64" cy="64" r="50" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="10" fill="none" />
                  <circle 
                    cx="64" cy="64" r="50" 
                    className={getRiskColor(riskVal)} 
                    strokeWidth="10" 
                    fill="none" 
                    strokeDasharray="314.16" 
                    strokeDashoffset={314.16 - (314.16 * riskVal / 100)}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                  />
                </svg>
                <div className="text-center z-10">
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{riskVal}</span>
                  <span className="text-xs text-slate-400 font-bold">/100</span>
                </div>
              </div>
              <div className={`mt-4 px-3 py-1 rounded-full text-xs font-bold border ${getRiskBg(riskVal)}`}>
                {invoice.total_amount > 10000 && riskVal <= 20 ? 'LOW RISK (High Amount)' : (typeof invoice.risk_level === 'object' && invoice.risk_level !== null ? invoice.risk_level.value : String(invoice.risk_level || 'MEDIUM')).toUpperCase()} RISK
              </div>
            </Card>

            {/* Validation score card */}
            <Card className="p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Compliance Score</h3>
                <p className="text-[10px] text-slate-400">Total compliance rate calculated by passed rules parameters.</p>
              </div>
              <div className="py-4">
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-3xl font-black text-primary">{scoreVal}%</span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">{10 - missingSet.size - invalidSet.size}/10 Rules Passed</span>
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${scoreVal}%` }} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold italic">
                {result.validation_status === 'Passed' 
                  ? 'Invoice is fully compliant for vendor disbursement.' 
                  : 'Bypassed parameters require accountant review.'}
              </p>
            </Card>

          </div>

          {/* 2. AI validation assistant explains details */}
          <Card className="border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-2 border-b dark:border-slate-850 bg-primary/10 py-3">
              <Sparkles size={16} className="text-primary animate-pulse" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">AI Validation Assistant</h3>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {result.ai_explanation}
              </p>
              {result.ai_recommendations && result.ai_recommendations.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-primary/20">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Recommended Actions:</p>
                  <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-450 font-semibold list-inside list-disc">
                    {result.ai_recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Validation rule checklist table */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Business Rules checklist</h3>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 dark:divide-slate-850/80 p-0">
              {rulesChecklist.map((row) => (
                <div key={row.rule} className="flex items-start justify-between px-6 py-3.5 hover:bg-slate-50/10 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{row.rule}</span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{row.title}</h4>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{row.desc}</p>
                  </div>
                  <div className="flex-shrink-0 pt-0.5">
                    {row.passed ? (
                      <div className="p-1 bg-success/10 text-success rounded-full border border-success/20">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="p-1 bg-danger/10 text-danger rounded-full border border-danger/20">
                        <X size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 4. Manual override tools (Admin only) */}
          {isAdmin && (
            <Card className="border-2 border-warning bg-warning/5 dark:bg-warning/10">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-warning-dark">
                  <AlertCircle size={18} />
                  <h3 className="text-sm font-bold">Administrative Override Controls</h3>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-350">
                  Force manual validation overrides to update the status in audit logs database.
                </p>
                <div className="flex gap-3">
                  <Button 
                    className="bg-success text-white hover:bg-success/90 text-xs flex-1"
                    onClick={() => { setOverrideStatus('Passed'); setShowOverrideModal(true); }}
                  >
                    Force Approve Validation
                  </Button>
                  <Button 
                    className="bg-danger text-white hover:bg-danger/90 text-xs flex-1"
                    onClick={() => { setOverrideStatus('Rejected'); setShowOverrideModal(true); }}
                  >
                    Force Reject Invoice
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. Validation comments section */}
          <Card>
            <CardHeader>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Comments History</h3>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              
              {/* History logs comments list */}
              <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
                {(!result.comments_json || result.comments_json.length === 0) ? (
                  <p className="text-xs text-slate-450 text-center italic py-2">No comments logged. Add a verification note below.</p>
                ) : (
                  result.comments_json.map((c, i) => (
                    <div key={i} className="flex flex-col gap-1 border-b dark:border-slate-850 pb-2.5 text-xs">
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className="text-slate-800 dark:text-slate-205">{c.user} <span className="text-slate-400 font-semibold font-sans">({c.role})</span></span>
                        <span className="text-slate-400">{c.time}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Submit text input */}
              <form onSubmit={handleAddComment} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Write auditor comment notes..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-grow px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
                />
                <button
                  type="submit"
                  disabled={commenting || !commentText.trim()}
                  className="p-2.5 bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-sm"
                >
                  <Send size={14} />
                </button>
              </form>

            </CardContent>
          </Card>

        </div>

      </div>

      {/* Manual Override modal dialog */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-b dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">
                Confirm Manual Override: {overrideStatus.toUpperCase()}
              </h3>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provide audit notes justifying this override action. Rationale overrides will be logged in reports.
              </p>
              
              <textarea
                value={overrideComment}
                onChange={(e) => setOverrideComment(e.target.value)}
                placeholder="Enter justification comment rationale..."
                rows={4}
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-805 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t dark:border-slate-800/80 flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApplyOverride}
                isLoading={overriding}
                className={`text-xs ${overrideStatus === 'Passed' ? 'bg-success hover:bg-success/90 text-white' : 'bg-danger hover:bg-danger/90 text-white'}`}
              >
                Apply status Override
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default ValidationResults;
