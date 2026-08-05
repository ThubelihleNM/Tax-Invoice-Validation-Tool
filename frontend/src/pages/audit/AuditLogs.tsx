import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Table, Badge, Button, toast 
} from '../../components/common';
import { 
  Search, RefreshCw, Filter, ShieldAlert, Monitor, Globe, Key 
} from 'lucide-react';

interface AuditLog {
  log_id: number;
  created_at: string;
  user: string;
  role: string;
  action: string;
  description: string;
  ip_address: string;
  browser: string;
  device: string;
  os: string;
  status: string;
}

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        action: actionFilter || undefined,
        status: statusFilter || undefined,
        role: roleFilter || undefined,
        limit: 100
      };
      const res = await axios.get('/api/audit', { params });
      setLogs(res.data.logs);
    } catch (err) {
      toast('danger', 'Error', 'Failed to retrieve audit log registers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter, statusFilter, roleFilter]);

  const renderActionBadge = (action: string) => {
    const actionUpper = action.toUpperCase();
    if (actionUpper.includes("FAILED") || actionUpper.includes("REJECT") || actionUpper.includes("DELETE")) {
      return <Badge variant="danger">{action}</Badge>;
    }
    if (actionUpper.includes("OVERRIDE") || actionUpper.includes("UPDATE") || actionUpper.includes("RESTORE")) {
      return <Badge variant="warning">{action}</Badge>;
    }
    if (actionUpper.includes("LOGIN") || actionUpper.includes("UPLOAD") || actionUpper.includes("BACKUP")) {
      return <Badge variant="success">{action}</Badge>;
    }
    return <Badge>{action}</Badge>;
  };

  const renderStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'Success' ? 'success' : 'danger'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const columns = [
    {
      key: 'created_at',
      title: 'Timestamp',
      render: (val: string) => {
        const d = new Date(val);
        return (
          <div className="font-semibold text-slate-800 dark:text-slate-205">
            <div>{d.toLocaleDateString()}</div>
            <div className="text-[10px] text-slate-400 font-sans mt-0.5">{d.toLocaleTimeString()}</div>
          </div>
        );
      }
    },
    {
      key: 'user',
      title: 'Account',
      render: (val: string, row: AuditLog) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
          <p className="text-[10px] text-slate-400 font-semibold">{row.role}</p>
        </div>
      )
    },
    {
      key: 'action',
      title: 'Action Category',
      render: (val: string) => renderActionBadge(val)
    },
    {
      key: 'description',
      title: 'Event Details Description',
      render: (val: string) => (
        <p className="text-slate-600 dark:text-slate-400 font-semibold leading-relaxed max-w-sm truncate" title={val}>
          {val}
        </p>
      )
    },
    {
      key: 'ip_address',
      title: 'Auditing IP',
      render: (val: string) => (
        <span className="font-mono text-[10px] text-slate-450 dark:text-slate-400 font-bold">{val}</span>
      )
    },
    {
      key: 'device',
      title: 'Client Details',
      render: (_: any, row: AuditLog) => (
        <div className="text-[10px] text-slate-400 space-y-0.5 font-semibold">
          <div className="flex items-center gap-1"><Monitor size={10} /> <span>{row.device} / {row.os}</span></div>
          <div className="flex items-center gap-1"><Globe size={10} /> <span className="truncate max-w-[100px]">{row.browser}</span></div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (val: string) => renderStatusBadge(val)
    }
  ];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100 font-sans">Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor real-time system activities, configuration overrides, database operations, and account authentications.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 transition-colors shadow-sm bg-white dark:bg-slate-900"
          title="Refresh Logs"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Query Filters */}
      <div className="glass-panel p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl flex flex-wrap gap-4 items-center justify-between backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search details descriptions, action type, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-705 text-slate-700 dark:text-slate-350"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">User Logins</option>
            <option value="FAILED_LOGIN">Failed Logins</option>
            <option value="INVOICE_UPLOAD">Invoice Uploads</option>
            <option value="OCR_COMPLETED">OCR Scans</option>
            <option value="MANUAL_OVERRIDE">Admin Overrides</option>
            <option value="SETTINGS_UPDATE">Settings Changes</option>
            <option value="DATABASE_BACKUP">Backups Run</option>
            <option value="DATABASE_RESTORE">Restorations</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-350"
          >
            <option value="">All Roles</option>
            <option value="Administrator">Administrators</option>
            <option value="Accountant">Accountants</option>
            <option value="Auditor">Auditors</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-350"
          >
            <option value="">All Statuses</option>
            <option value="Success">Success Logs</option>
            <option value="Failed">Failed Alerts</option>
          </select>
        </div>
      </div>

      {/* Datagrid Table list */}
      <Table
        columns={columns}
        data={logs}
        isLoading={loading}
        totalItems={logs.length}
        pageSize={15}
      />

    </div>
  );
};
export default AuditLogs;
