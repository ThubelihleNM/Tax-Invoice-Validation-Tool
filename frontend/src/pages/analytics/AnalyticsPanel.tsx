import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, ShieldCheck, ShieldAlert, Cpu, 
  Sparkles, RefreshCw, Zap, Server, Activity, Users 
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { toast } from '../../components/common/Toast';
import { Spinner } from '../../components/common/Spinner';

interface ExecutiveSummary {
  validation_success_rate: number;
  average_invoice_amount: number;
  highest_supplier: string;
  highest_supplier_amount: number;
  most_active_user: string;
  most_common_validation_error: string;
  highest_fraud_risk_supplier: string;
  monthly_revenue_processed: number;
  tax_compliance_score: number;
  overall_system_health: number;
}

interface ChartData {
  monthly_invoice_trend: any[];
  daily_validation_trend: any[];
  supplier_performance: any[];
  vat_collection_trend: any[];
  system_performance: any[];
}

export const AnalyticsPanel: React.FC = () => {
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [exec, setExec] = useState<ExecutiveSummary | null>(null);
  const [aiInsights, setAiInsights] = useState<{ insights: string[], recommendations: string[] }>({ insights: [], recommendations: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const resCharts = await axios.get('/api/analytics/charts');
      setCharts(resCharts.data);

      const resExec = await axios.get('/api/analytics/executive');
      setExec(resExec.data);

      const resAI = await axios.get('/api/analytics/insights');
      setAiInsights(resAI.data);
    } catch (err) {
      toast('warning', 'Notice', 'Failed to retrieve analytics, showing static sandbox summaries.');
      
      // Fallback mocks
      setCharts({
        monthly_invoice_trend: [
          { name: 'Feb', value: 24000 },
          { name: 'Mar', value: 32000 },
          { name: 'Apr', value: 18500 },
          { name: 'May', value: 45000 },
          { name: 'Jun', value: 38000 },
          { name: 'Jul', value: 48500 }
        ],
        daily_validation_trend: [
          { name: 'Mon', validated: 8, flagged: 1, rejected: 0 },
          { name: 'Tue', validated: 12, flagged: 2, rejected: 1 },
          { name: 'Wed', validated: 10, flagged: 0, rejected: 0 },
          { name: 'Thu', validated: 15, flagged: 3, rejected: 1 },
          { name: 'Fri', validated: 14, flagged: 1, rejected: 0 }
        ],
        supplier_performance: [
          { name: 'Figma Europe', invoices: 18, total: 24500, pass_rate: 100 },
          { name: 'GitHub, Inc.', invoices: 12, total: 7200, pass_rate: 91 },
          { name: 'Google EMEA', invoices: 15, total: 15800, pass_rate: 86 }
        ],
        vat_collection_trend: [
          { name: 'Feb', vat: 3600 },
          { name: 'Mar', vat: 4800 },
          { name: 'Apr', vat: 2775 },
          { name: 'May', vat: 6750 },
          { name: 'Jun', vat: 5700 },
          { name: 'Jul', vat: 7275 }
        ],
        system_performance: [
          { name: '09:00', cpu: 22, memory: 58, api_ms: 110 },
          { name: '12:00', cpu: 45, memory: 62, api_ms: 145 },
          { name: '15:00', cpu: 65, memory: 68, api_ms: 180 }
        ]
      });

      setExec({
        validation_success_rate: 94.5,
        average_invoice_amount: 1540.50,
        highest_supplier: 'Figma Europe BV',
        highest_supplier_amount: 24500.00,
        most_active_user: 'Sarah Accountant',
        most_common_validation_error: 'Rule 7: VAT Calculation Discrepancy',
        highest_fraud_risk_supplier: 'Amazon Web Services',
        monthly_revenue_processed: 48500.00,
        tax_compliance_score: 96.2,
        overall_system_health: 98.4
      });

      setAiInsights({
        insights: [
          "Validation accuracy improved by 7% this month.",
          "Most validation failures are caused by incorrect VAT calculations.",
          "Supplier Figma Europe has generated the highest number of duplicate invoices."
        ],
        recommendations: [
          "Review VAT rates tolerance rules.",
          "Inspect duplicate upload sequences."
        ]
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading || !charts || !exec) {
    return (
      <div className="min-h-[70vh] flex flex-col justify-center items-center gap-3">
        <Spinner size="lg" />
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider animate-pulse">Running calculations...</p>
      </div>
    );
  }

  const COLORS = ['#22C55E', '#F59E0B', '#EF4444'];

  const execKPIs = [
    { title: 'Validation Success Rate', value: `${exec.validation_success_rate}%`, icon: <ShieldCheck size={20} className="text-success" /> },
    { title: 'Avg Invoice Value', value: `$${exec.average_invoice_amount.toLocaleString(undefined, {maximumFractionDigits: 2})}`, icon: <TrendingUp size={20} className="text-primary" /> },
    { title: 'Tax Compliance Score', value: `${exec.tax_compliance_score}%`, icon: <Activity size={20} className="text-success" /> },
    { title: 'Overall System Health', value: `${exec.overall_system_health}%`, icon: <Cpu size={20} className="text-primary" /> }
  ];

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">Business Intelligence Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time compliance monitoring, supplier audit metrics, tax calculations trends, and performance parameters.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={refreshing}
          className="p-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 transition-colors shadow-sm bg-white dark:bg-slate-900"
          title="Refresh Data"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Executive KPIs grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {execKPIs.map((kpi, i) => (
          <Card key={i} className="p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider">{kpi.title}</span>
              <div>{kpi.icon}</div>
            </div>
            <span className="text-lg font-black text-slate-850 dark:text-slate-105 mt-3">{kpi.value}</span>
          </Card>
        ))}
      </div>

      {/* Charts split grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Monthly invoice value trend */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Monthly Invoice Value Trend</h3>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthly_invoice_trend}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Total Value']} />
                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Executive summary metadata details */}
        <Card className="lg:col-span-4 flex flex-col justify-between">
          <CardHeader>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Executive Intelligence</h3>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b dark:border-slate-850">
              <span className="text-slate-450 font-semibold">Highest Supplier Billing</span>
              <span className="font-bold text-slate-800 dark:text-slate-205">{exec.highest_supplier}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b dark:border-slate-850">
              <span className="text-slate-450 font-semibold">Most Common Error</span>
              <span className="font-bold text-slate-800 dark:text-slate-205">Rule 7 - VAT Mismatch</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b dark:border-slate-850">
              <span className="text-slate-450 font-semibold">Highest Risk Supplier</span>
              <Badge variant="warning">{exec.highest_fraud_risk_supplier}</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b dark:border-slate-850">
              <span className="text-slate-450 font-semibold">Most Active User</span>
              <span className="font-bold text-slate-805 dark:text-slate-205">{exec.most_active_user}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-450 font-semibold">Compliance Rating</span>
              <span className="text-success font-black text-sm">{exec.tax_compliance_score}%</span>
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Daily audit status distribution stacked bar chart */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Compliance Status Breakdown</h3>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.daily_validation_trend} stackOffset="sign">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="validated" name="Valid" stackId="a" fill="#22C55E" radius={[2, 2, 0, 0]} />
                <Bar dataKey="flagged" name="Flagged" stackId="a" fill="#F59E0B" />
                <Bar dataKey="rejected" name="Rejected" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* VAT collection trend */}
        <Card className="lg:col-span-6">
          <CardHeader>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">VAT Tax Accumulations</h3>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.vat_collection_trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`, 'VAT Collected']} />
                <Line type="monotone" dataKey="vat" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Supplier Performance Metrics Chart */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top Supplier Validation Success Rates</h3>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.supplier_performance}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v) => [`${v}%`, 'Pass Rate']} />
                <Bar dataKey="pass_rate" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI smart business insights card */}
        <div className="lg:col-span-5">
          <Card className="border-l-4 border-l-primary bg-primary/5 dark:bg-primary/10 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center gap-2 border-b dark:border-slate-850 bg-primary/10 py-3">
              <Sparkles size={16} className="text-primary" />
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">AI Operations Analyst</h3>
            </CardHeader>
            <CardContent className="p-5 flex-grow space-y-5 text-xs">
              <div className="space-y-3">
                {aiInsights.insights.map((insight, idx) => (
                  <div key={idx} className="flex gap-2 leading-relaxed">
                    <span className="text-primary font-bold">•</span>
                    <p className="text-slate-700 dark:text-slate-355 font-semibold">{insight}</p>
                  </div>
                ))}
              </div>
              
              {aiInsights.recommendations.length > 0 && (
                <div className="pt-4 border-t border-primary/20 space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-primary">Strategic Recommendations:</h4>
                  {aiInsights.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-white/40 dark:bg-slate-900/40 p-2 border dark:border-slate-850 rounded-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                      <Zap size={12} className="text-warning mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* System loads dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Server size={14} className="text-slate-400" />
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">System & Storage Performance Monitoring</h3>
          </div>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={charts.system_performance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-slate-800" />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line type="monotone" dataKey="cpu" name="CPU Usage (%)" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="memory" name="Memory Usage (%)" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="api_ms" name="API Response (ms)" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

    </div>
  );
};
export default AnalyticsPanel;
