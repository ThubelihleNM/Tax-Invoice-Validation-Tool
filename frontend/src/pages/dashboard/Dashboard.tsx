import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { 
  FileText, ShieldCheck, ShieldAlert, ShieldX, 
  TrendingUp, ArrowUpRight, Plus, RefreshCw, AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../components/common/Toast';

interface SummaryData {
  total_invoices: number;
  validated_invoices: number;
  flagged_invoices: number;
  rejected_invoices: number;
  total_tax_amount: number;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('/api/analytics/summary');
      setSummary(res.data);
    } catch (err) {
      toast('warning', 'Notice', 'Failed to retrieve analytics, showing fallback metrics.');
      setSummary({
        total_invoices: 128,
        validated_invoices: 114,
        flagged_invoices: 11,
        rejected_invoices: 3,
        total_tax_amount: 25482.50
      });
    }

    try {
      const resRecent = await axios.get('/api/invoices/recent');
      const formatted = resRecent.data.map((inv: any) => ({
        id: inv.invoice_number,
        invoice_id: inv.invoice_id,
        supplier: inv.supplier?.supplier_name || 'Unknown',
        date: inv.invoice_date || new Date(inv.created_at).toLocaleDateString(),
        total: Number(inv.total_amount),
        status: inv.invoice_status,
        risk: inv.risk_level
      }));
      setRecentInvoices(formatted);
    } catch (err) {
      setRecentInvoices([
        { id: 'INV-2026-0482', supplier: 'Figma Europe', date: '2026-07-24', total: 1452.00, status: 'Validated', risk: 'Low' },
        { id: 'INV-2026-0481', supplier: 'GitHub, Inc.', date: '2026-07-23', total: 600.00, status: 'Validated', risk: 'Low' },
        { id: 'INV-2026-0480', supplier: 'Google Cloud EMEA', date: '2026-07-22', total: 1000.00, status: 'Flagged', risk: 'Medium' },
        { id: 'INV-2026-0479', supplier: 'AWS Billing', date: '2026-07-20', total: 3200.00, status: 'Rejected', risk: 'High' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const chartData = [
    { name: 'Mon', validated: 12, flagged: 1, rejected: 0 },
    { name: 'Tue', validated: 18, flagged: 2, rejected: 1 },
    { name: 'Wed', validated: 15, flagged: 1, rejected: 0 },
    { name: 'Thu', validated: 22, flagged: 3, rejected: 1 },
    { name: 'Fri', validated: 20, flagged: 1, rejected: 0 },
    { name: 'Sat', validated: 14, flagged: 2, rejected: 1 },
    { name: 'Sun', validated: 13, flagged: 1, rejected: 0 }
  ];

  const pieData = [
    { name: 'Valid', value: summary?.validated_invoices || 114, color: '#22C55E' },
    { name: 'Flagged', value: summary?.flagged_invoices || 11, color: '#F59E0B' },
    { name: 'Rejected', value: summary?.rejected_invoices || 3, color: '#EF4444' }
  ];

  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            Welcome, {user?.first_name || 'User'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Here is the audit compliance summary for your organization.
          </p>
        </div>
        
        {user?.role !== 'Auditor' && (
          <Button 
            onClick={() => navigate('/upload')} 
            className="flex items-center gap-1.5 self-start sm:self-auto shadow-md shadow-primary/10"
          >
            <Plus size={16} />
            <span>Validate New Invoice</span>
          </Button>
        )}
      </div>

      {/* KPI statistics grid panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Uploaded</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{summary?.total_invoices || '0'}</h3>
          </div>
          <div className="h-10 w-10 bg-primary/10 text-primary border border-primary/20 rounded-xl flex items-center justify-center">
            <FileText size={20} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Passed Audits</p>
            <h3 className="text-2xl font-extrabold text-success-dark dark:text-success-light">{summary?.validated_invoices || '0'}</h3>
          </div>
          <div className="h-10 w-10 bg-success/10 text-success border border-success/20 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Flagged Warnings</p>
            <h3 className="text-2xl font-extrabold text-warning-dark dark:text-warning-light">{summary?.flagged_invoices || '0'}</h3>
          </div>
          <div className="h-10 w-10 bg-warning/10 text-warning border border-warning/20 rounded-xl flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Critical Errors</p>
            <h3 className="text-2xl font-extrabold text-danger">{summary?.rejected_invoices || '0'}</h3>
          </div>
          <div className="h-10 w-10 bg-danger/10 text-danger border border-danger/20 rounded-xl flex items-center justify-center">
            <ShieldX size={20} />
          </div>
        </Card>
      </div>

      {/* Grid layouts for charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trend Area chart panel */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-850 dark:text-slate-105">Validation Trend</h3>
              <p className="text-[10px] text-slate-400">Activity monitor for verified documents over the past 7 days.</p>
            </div>
            <TrendingUp size={16} className="text-slate-400" />
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="validated" stroke="#22C55E" fillOpacity={1} fill="url(#colorVal)" strokeWidth={2} name="Validated" />
                <Area type="monotone" dataKey="flagged" stroke="#F59E0B" fillOpacity={0} strokeWidth={2} name="Flagged" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Risk profile Pie Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-105">Invoice Status Breakdown</h3>
            <p className="text-[10px] text-slate-400">Current composition of compliance metrics.</p>
          </CardHeader>
          <CardContent className="h-80 flex flex-col justify-center items-center">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity panel grid */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-850 dark:text-slate-105">Recent Validations</h3>
            <p className="text-[10px] text-slate-400">Overview of the last processed invoices.</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate('/validation')}>
            View All
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-xs divide-y divide-slate-150 dark:divide-slate-800">
            <thead className="bg-slate-50/50 dark:bg-slate-950/20 text-slate-550 dark:text-slate-450 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Vendor</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Verification</th>
                <th className="px-6 py-4">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-655 text-slate-600 dark:text-slate-400 font-medium">
              {recentInvoices.map((inv, idx) => (
                <tr 
                  key={inv.invoice_id || inv.id || idx} 
                  onClick={() => navigate(inv.invoice_id ? `/validation?id=${inv.invoice_id}` : '/history')}
                  className="hover:bg-slate-50/20 dark:hover:bg-slate-950/5 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{inv.id}</td>
                  <td className="px-6 py-4 font-semibold">{inv.supplier}</td>
                  <td className="px-6 py-4">{inv.date}</td>
                  <td className="px-6 py-4 font-bold">${inv.total.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <Badge variant={inv.status === 'Validated' ? 'success' : inv.status === 'Flagged' ? 'warning' : 'danger'}>
                      {inv.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={inv.risk === 'Low' ? 'success' : inv.risk === 'Medium' ? 'warning' : 'danger'}>
                      {inv.risk} Risk
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};
export default Dashboard;
