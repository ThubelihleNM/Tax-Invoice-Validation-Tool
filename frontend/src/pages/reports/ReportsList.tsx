import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, ShieldCheck, Mail, Calendar, Clock, Download, 
  Trash2, Search, Filter, Send, Play, BarChart2, Plus, X, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Table } from '../../components/common/Table';
import { toast } from '../../components/common/Toast';
import { Spinner } from '../../components/common/Spinner';

interface BISummary {
  total_reports_generated: number;
  invoices_validated: number;
  valid_invoices: number;
  invalid_invoices: number;
  flagged_invoices: number;
  duplicate_invoices: number;
  fraud_alerts: number;
  vat_collected: number;
  average_processing_time: number;
  monthly_invoice_value: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  category: string;
}

interface ScheduledReport {
  id: number;
  report_type: string;
  frequency: string;
  recipient_email: string;
  created_at: string;
}

export const ReportsList: React.FC = () => {
  const [summary, setSummary] = useState<BISummary | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Selected template for actions
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);

  // Email modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', subject: '', message: '' });
  const [emailing, setEmailing] = useState(false);

  // Schedule modal
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [schedForm, setSchedForm] = useState({ frequency: 'Monthly', email: '' });
  const [scheduling, setScheduling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const resSum = await axios.get('/api/analytics/summary');
      setSummary(resSum.data);

      const resTemp = await axios.get('/api/reports/templates');
      setTemplates(resTemp.data);

      const resSched = await axios.get('/api/reports/scheduled');
      setSchedules(resSched.data);
    } catch (err) {
      toast('danger', 'Error', 'Failed to retrieve business intelligence data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async (templateId: string, format: string) => {
    toast('info', 'Generating Export', `Compiling ${format} output sheet...`);
    try {
      const res = await axios.post('/api/reports/export', {
        report_type: templateId,
        export_format: format,
        invoice_status: statusFilter || undefined
      }, { responseType: 'blob' });

      // Direct file download trigger
      const blob = new Blob([res.data], { type: format === 'PDF' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateId}_report.${format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast('success', 'Export Completed', `Successfully downloaded report in ${format} format.`);
      fetchData(); // increment summary metrics
    } catch (err) {
      toast('danger', 'Export Failed', 'No compliant data records exist matching the selected parameters.');
    }
  };

  const handleEmailSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate || !emailForm.email) return;
    setEmailing(true);
    try {
      await axios.post('/api/reports/email', {
        recipient_email: emailForm.email,
        subject: emailForm.subject || `Compliance Report: ${activeTemplate.name}`,
        message: emailForm.message,
        report_type: activeTemplate.id
      });
      toast('success', 'Email Sent', `Report attachment successfully queued for ${emailForm.email}`);
      setShowEmailModal(false);
      setEmailForm({ email: '', subject: '', message: '' });
    } catch (err) {
      toast('danger', 'Email Failed', 'Mailing dispatch failed.');
    } finally {
      setEmailing(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate || !schedForm.email) return;
    setScheduling(true);
    try {
      await axios.post('/api/reports/schedule', {
        report_type: activeTemplate.name,
        frequency: schedForm.frequency,
        recipient_email: schedForm.email
      });
      toast('success', 'Schedule Set', `Configured recurring ${schedForm.frequency} reports for ${schedForm.email}`);
      setShowSchedModal(false);
      setSchedForm({ frequency: 'Monthly', email: '' });
      fetchData();
    } catch (err) {
      toast('danger', 'Scheduling Failed', 'Failed to register recurring report cron.');
    } finally {
      setScheduling(false);
    }
  };

  const handleCancelSchedule = async (id: number) => {
    try {
      await axios.delete(`/api/reports/scheduled/${id}`);
      toast('success', 'Schedule Cancelled', 'Recurring reporting schedule revoked.');
      fetchData();
    } catch (err) {
      toast('danger', 'Error', 'Failed to remove schedule.');
    }
  };

  // Filter templates list dynamically
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Loading reports dashboard...</p>
      </div>
    );
  }

  const cards = [
    { title: 'Reports Generated', value: summary?.total_reports_generated || 0, icon: <FileText size={20} />, color: 'text-primary' },
    { title: 'Invoices Validated', value: summary?.invoices_validated || 0, icon: <ClipboardCheckIcon size={20} />, color: 'text-primary' },
    { title: 'Valid Invoices', value: summary?.valid_invoices || 0, icon: <ShieldCheck size={20} />, color: 'text-success' },
    { title: 'Mismatched / Invalid', value: summary?.invalid_invoices || 0, icon: <AlertCircle size={20} />, color: 'text-danger' },
    { title: 'Duplicate Invoices', value: summary?.duplicate_invoices || 0, icon: <Trash2 size={20} />, color: 'text-warning' },
    { title: 'VAT Collected', value: `$${(summary?.vat_collected || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: <BarChart2 size={20} />, color: 'text-primary' },
    { title: 'Monthly Billing', value: `$${(summary?.monthly_invoice_value || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, icon: <Calendar size={20} />, color: 'text-primary' }
  ];

  return (
    <div className="space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">Business Intelligence & Reports</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Query compliance summaries, export CSV spreadsheets, configure automated schedules, and email validation attachments.
        </p>
      </div>

      {/* Summary KPIs cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <Card key={i} className="p-5 flex flex-col justify-between hover:-translate-y-0.5 transition-all">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">{card.title}</span>
              <div className={card.color}>{card.icon}</div>
            </div>
            <span className="text-lg font-black text-slate-850 dark:text-slate-100 mt-3">{card.value}</span>
          </Card>
        ))}
      </div>

      {/* Advanced search filters */}
      <div className="glass-panel p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl flex flex-wrap gap-4 items-center justify-between backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search report templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-805 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-350"
          >
            <option value="">Invoice Status Filter</option>
            <option value="Pending">Pending</option>
            <option value="Validated">Validated</option>
            <option value="Flagged">Flagged</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Templates List Grid */}
      <Card>
        <CardHeader>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Report Categories</h3>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-850">
          {filteredTemplates.map((t) => (
            <div key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/25 dark:hover:bg-slate-950/5 transition-colors">
              <div className="space-y-0.5">
                <Badge variant="gray">{t.category}</Badge>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.name}</h4>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => handleExport(t.id, 'PDF')}>
                  <FileText size={12} />
                  <span>PDF</span>
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => handleExport(t.id, 'CSV')}>
                  <Download size={12} />
                  <span>CSV</span>
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => { setActiveTemplate(t); setShowEmailModal(true); }}>
                  <Mail size={12} />
                  <span>Email</span>
                </Button>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1" onClick={() => { setActiveTemplate(t); setShowSchedModal(true); }}>
                  <Clock size={12} />
                  <span>Schedule</span>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Scheduled Reports Sub-table list */}
      <Card>
        <CardHeader>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled Auto Reports</h3>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-xs divide-y divide-slate-150 dark:divide-slate-800">
            <thead className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-550 dark:text-slate-450 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Report Type</th>
                <th className="px-6 py-4">Frequency</th>
                <th className="px-6 py-4">Recipient Email</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">No scheduled automated reports task crons active.</td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id}>
                    <td className="px-6 py-4 font-bold text-slate-850 dark:text-slate-200">{s.report_type}</td>
                    <td className="px-6 py-4"><Badge>{s.frequency}</Badge></td>
                    <td className="px-6 py-4 font-semibold">{s.recipient_email}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleCancelSchedule(s.id)} className="text-slate-400 hover:text-danger flex items-center gap-1 font-bold">
                        <Trash2 size={14} />
                        <span>Cancel</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 1. Send Email Modal dialog */}
      {showEmailModal && activeTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <form onSubmit={handleEmailSend} className="w-full max-w-md bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-b dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Email Report: {activeTemplate.name}</h3>
              <button type="button" onClick={() => setShowEmailModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Recipient Email</label>
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="name@enterprise.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Subject</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={`Compliance Audit: ${activeTemplate.name}`}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Message Body</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Enter message details to accompany the report attachment..."
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t dark:border-slate-800/80 flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowEmailModal(false)}>Cancel</Button>
              <Button type="submit" size="sm" isLoading={emailing} className="flex items-center gap-1.5 bg-primary text-white text-xs">
                <Send size={14} />
                <span>Send Attachment</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Schedule Report Modal dialog */}
      {showSchedModal && activeTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4">
          <form onSubmit={handleScheduleSubmit} className="w-full max-w-md bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-b dark:border-slate-800/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-200">Schedule report: {activeTemplate.name}</h3>
              <button type="button" onClick={() => setShowSchedModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Target Email Address</label>
                <input
                  type="email"
                  value={schedForm.email}
                  onChange={(e) => setSchedForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="recipient@enterprise.com"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-805 text-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-450">Frequencies</label>
                <select
                  value={schedForm.frequency}
                  onChange={(e) => setSchedForm(prev => ({ ...prev, frequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-350 font-sans"
                >
                  <option value="Daily">Daily Summary</option>
                  <option value="Weekly">Weekly Digest</option>
                  <option value="Monthly">Monthly Analytics</option>
                  <option value="Quarterly">Quarterly Audit</option>
                  <option value="Yearly">Yearly Reporting</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/20 border-t dark:border-slate-800/80 flex justify-end gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowSchedModal(false)}>Cancel</Button>
              <Button type="submit" size="sm" isLoading={scheduling} className="flex items-center gap-1.5 bg-primary text-white text-xs">
                <Plus size={14} />
                <span>Create Schedule Task</span>
              </Button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

// Reusable micro checkmark icon
const ClipboardCheckIcon: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-check">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="m9 14 2 2 4-4"/>
    </svg>
  );
};

export default ReportsList;
