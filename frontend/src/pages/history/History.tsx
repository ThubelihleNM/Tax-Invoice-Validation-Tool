import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Table, Badge, Button, ConfirmationDialog, toast 
} from '../../components/common';
import { 
  Search, Eye, Download, Trash2, RefreshCw, FileSpreadsheet, FileText 
} from 'lucide-react';

interface InvoiceHistoryData {
  invoice_id: number;
  invoice_number: string;
  invoice_date?: string;
  currency: string;
  total_amount: number;
  confidence_score: number;
  invoice_status: 'Pending' | 'Validated' | 'Flagged' | 'Rejected';
  risk_level: 'Low' | 'Medium' | 'High';
  file_path?: string;
  ocr_text?: string;
  created_at: string;
  supplier?: { supplier_name: string };
  customer?: { customer_name: string };
  uploader?: { first_name: string, last_name: string };
}

export const History: React.FC = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Selected for deletion
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceHistoryData | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        status: statusFilter || undefined,
        risk: riskFilter || undefined
      };
      const res = await axios.get('/api/invoices', { params });
      setInvoices(res.data);
    } catch (err) {
      toast('danger', 'Error', 'Failed to retrieve invoice logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, riskFilter]);

  const handleDelete = async () => {
    if (!selectedInvoice) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/invoices/${selectedInvoice.invoice_id}`);
      toast('success', 'Deleted Successfully', `Invoice ${selectedInvoice.invoice_number} has been deleted.`);
      setIsDeleteOpen(false);
      fetchInvoices();
    } catch (err) {
      toast('danger', 'Deletion Failed', 'Failed to delete invoice from server.');
    } finally {
      setDeleting(false);
      setSelectedInvoice(null);
    }
  };

  // Download raw OCR text helper
  const downloadOcrText = (inv: InvoiceHistoryData) => {
    if (!inv.ocr_text) {
      toast('warning', 'Notice', 'No raw OCR text layer exists for this invoice.');
      return;
    }
    const blob = new Blob([inv.ocr_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.invoice_number}_ocr.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('success', 'Download Triggered', 'Raw OCR text file download started.');
  };

  const renderStatusBadge = (status: string) => {
    const map = {
      Pending: 'gray',
      Validated: 'success',
      Flagged: 'warning',
      Rejected: 'danger'
    } as const;
    return <Badge variant={map[status as keyof typeof map] || 'gray'}>{status}</Badge>;
  };

  const renderAccuracyBadge = (score: number) => {
    const num = Number(score);
    if (num >= 80) return <Badge variant="success">{num}% Accuracy</Badge>;
    return <Badge variant="warning">{num}% Accuracy</Badge>;
  };

  const columns = [
    {
      key: 'invoice_number',
      title: 'Invoice ID',
      render: (val: string, row: InvoiceHistoryData) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
          <p className="text-[10px] text-slate-400 font-medium">{row.supplier?.supplier_name || 'Unknown'}</p>
        </div>
      )
    },
    {
      key: 'created_at',
      title: 'Uploaded Date',
      render: (val: string) => new Date(val).toLocaleDateString()
    },
    {
      key: 'confidence_score',
      title: 'OCR Accuracy',
      render: (val: number) => renderAccuracyBadge(val)
    },
    {
      key: 'invoice_status',
      title: 'Audit Status',
      render: (val: string) => renderStatusBadge(val)
    },
    {
      key: 'uploaded_by',
      title: 'Uploaded By',
      render: (_: any, row: InvoiceHistoryData) => (
        <span className="text-xs font-medium">
          {row.uploader ? `${row.uploader.first_name} ${row.uploader.last_name[0]}.` : 'System'}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: InvoiceHistoryData) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/validation?id=${row.invoice_id}`)}
            className="p-1 text-slate-400 hover:text-primary transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Verify Details"
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => downloadOcrText(row)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Download Raw OCR Text"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => { setSelectedInvoice(row); setIsDeleteOpen(true); }}
            className="p-1 text-slate-400 hover:text-danger transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Delete Invoice"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">Invoice Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Query OCR extraction history, download raw text sheets, and launch details verifications.
          </p>
        </div>
        <Button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-1.5 shadow-md shadow-primary/10"
        >
          <span>Upload Invoice</span>
        </Button>
      </div>

      {/* Filter panel */}
      <div className="glass-panel p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl flex flex-wrap gap-4 items-center justify-between backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice ID, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-350"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Validated">Validated</option>
            <option value="Flagged">Flagged</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-350"
          >
            <option value="">All Risks</option>
            <option value="Low">Low Risk</option>
            <option value="Medium">Medium Risk</option>
            <option value="High">High Risk</option>
          </select>

          <button
            onClick={fetchInvoices}
            className="p-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid List */}
      <Table
        columns={columns}
        data={invoices}
        isLoading={loading}
        totalItems={invoices.length}
        pageSize={10}
      />

      {/* Delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Invoice Record"
        message={`Are you sure you want to permanently delete invoice ${selectedInvoice?.invoice_number}? This will delete the physical file and all database links.`}
        confirmText="Delete permanently"
        type="danger"
        isLoading={deleting}
      />

    </div>
  );
};
export default History;
