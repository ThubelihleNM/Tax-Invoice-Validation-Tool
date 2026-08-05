import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { 
  Table, Badge, Button, Input, Dropdown, Modal, 
  ConfirmationDialog, toast, Spinner 
} from '../../components/common';
import { 
  Search, UserPlus, ShieldAlert, Key, Edit, 
  Slash, Trash2, ShieldX, RefreshCw 
} from 'lucide-react';

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'Administrator' | 'Accountant' | 'Auditor';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  profile_photo?: string;
  last_login?: string;
  created_at: string;
}

interface CreateUserInputs {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: 'Administrator' | 'Accountant' | 'Auditor';
  password?: string;
  confirm_password?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
}

interface EditUserInputs {
  phone?: string;
  role: 'Administrator' | 'Accountant' | 'Auditor';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Table state (Search, Filter, Paging, Sort)
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals visibility toggles
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Selected item states
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Forms setup
  const { register: regCreate, handleSubmit: handleCreateSubmit, reset: resetCreate, setValue: setCreateValue, watch: watchCreate, formState: { errors: errorsCreate } } = useForm<CreateUserInputs>();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: errorsEdit } } = useForm<EditUserInputs>();
  const { register: regReset, handleSubmit: handleResetSubmit, reset: resetReset, formState: { errors: errorsReset } } = useForm<{ new_pw: string }>();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const skip = (currentPage - 1) * pageSize;
      const params: Record<string, any> = {
        skip,
        limit: pageSize,
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined
      };
      
      const res = await axios.get('/api/users', { params });
      setUsers(res.data.users);
      setTotalUsers(res.data.total);
    } catch (err: any) {
      toast('danger', 'Error', 'Failed to retrieve user accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users list upon filter changes
  useEffect(() => {
    fetchUsers();
  }, [currentPage, search, roleFilter, statusFilter, sortField, sortOrder]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Generate a random temporary password helper
  const handleGenerateTempPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let generated = "";
    for (let i = 0; i < 12; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateValue('password', generated);
    setCreateValue('confirm_password', generated);
    toast('info', 'Password Generated', 'A temporary password was written to the fields.');
  };

  // Create User
  const onCreateSubmit = async (data: CreateUserInputs) => {
    if (data.password !== data.confirm_password) {
      toast('danger', 'Error', 'Passwords do not match.');
      return;
    }
    
    setSubmittingAction(true);
    try {
      await axios.post('/api/users', {
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        role: data.role,
        status: data.status,
        password: data.password
      });
      toast('success', 'User Created', 'New user account has been registered.');
      setIsCreateOpen(false);
      resetCreate();
      fetchUsers();
    } catch (err: any) {
      toast('danger', 'Creation Failed', err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Edit User modal with loaded fields
  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    resetEdit({
      phone: user.phone || '',
      role: user.role,
      status: user.status
    });
    setIsEditOpen(true);
  };

  const onEditSubmit = async (data: EditUserInputs) => {
    if (!selectedUser) return;
    setSubmittingAction(true);
    try {
      await axios.put(`/api/users/${selectedUser.id}`, data);
      toast('success', 'User Updated', 'Account modifications saved successfully.');
      setIsEditOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast('danger', 'Update Failed', err.response?.data?.detail || 'Failed to edit user.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Admin Override Reset Password
  const onResetSubmit = async (data: { new_pw: string }) => {
    if (!selectedUser) return;
    setSubmittingAction(true);
    try {
      await axios.post(`/api/users/${selectedUser.id}/reset-password`, {
        new_password: data.new_pw
      });
      toast('success', 'Password Overridden', `Successfully reset password for ${selectedUser.email}.`);
      setIsResetOpen(false);
      resetReset();
    } catch (err: any) {
      toast('danger', 'Reset Failed', err.response?.data?.detail || 'Failed to override password.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Deactivate User Action
  const handleDeactivate = async () => {
    if (!selectedUser) return;
    setSubmittingAction(true);
    try {
      await axios.put(`/api/users/${selectedUser.id}`, {
        role: selectedUser.role,
        status: 'Inactive'
      });
      toast('success', 'User Deactivated', 'The user status has been updated to Inactive.');
      setIsDeactivateOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast('danger', 'Action Failed', 'Failed to deactivate account.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Delete User Action
  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmittingAction(true);
    try {
      await axios.delete(`/api/users/${selectedUser.id}`);
      toast('success', 'User Deleted', 'The account has been removed from database.');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast('danger', 'Deletion Failed', err.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Role Badge mapper
  const renderRoleBadge = (role: string) => {
    const roleMap = {
      Administrator: { variant: 'danger', label: 'Administrator' },
      Accountant: { variant: 'primary', label: 'Accountant' },
      Auditor: { variant: 'success', label: 'Auditor' }
    } as const;
    const meta = roleMap[role as keyof typeof roleMap] || { variant: 'gray', label: role };
    return <Badge variant={meta.variant}>{meta.label}</Badge>;
  };

  // Status Badge mapper
  const renderStatusBadge = (status: string) => {
    const statusMap = {
      Active: { variant: 'success', label: 'Active' },
      Inactive: { variant: 'gray', label: 'Inactive' },
      Suspended: { variant: 'warning', label: 'Suspended' },
      Pending: { variant: 'info', label: 'Pending' }
    } as const;
    const meta = statusMap[status as keyof typeof statusMap] || { variant: 'gray', label: status };
    return <Badge variant={meta.variant}>{meta.label}</Badge>;
  };

  // Define Table Columns config
  const columns = [
    {
      key: 'profile_photo',
      title: 'User',
      render: (_: any, row: UserData) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-primary flex-shrink-0">
            {row.profile_photo ? (
              <img src={row.profile_photo} alt="Avatar" className="h-full w-full rounded-full object-cover" />
            ) : (
              `${row.first_name[0]}${row.last_name[0]}`
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{row.first_name} {row.last_name}</p>
            <p className="text-[10px] text-slate-400 font-medium">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      title: 'Role',
      render: (val: string) => renderRoleBadge(val)
    },
    {
      key: 'status',
      title: 'Status',
      render: (val: string) => renderStatusBadge(val)
    },
    {
      key: 'last_login',
      title: 'Last Login',
      render: (val?: string) => val ? new Date(val).toLocaleString() : <span className="text-slate-400 italic text-xs">Never</span>
    },
    {
      key: 'created_at',
      title: 'Created Date',
      render: (val: string) => new Date(val).toLocaleDateString()
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: UserData) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(row)}
            className="p-1 text-slate-400 hover:text-primary transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Edit Details"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => { setSelectedUser(row); setIsResetOpen(true); }}
            className="p-1 text-slate-400 hover:text-warning-dark transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Reset Password"
          >
            <Key size={14} />
          </button>
          {row.status === 'Active' && (
            <button
              onClick={() => { setSelectedUser(row); setIsDeactivateOpen(true); }}
              className="p-1 text-slate-400 hover:text-warning transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Deactivate Account"
            >
              <ShieldX size={14} />
            </button>
          )}
          <button
            onClick={() => { setSelectedUser(row); setIsDeleteOpen(true); }}
            className="p-1 text-slate-400 hover:text-danger transition-colors rounded hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Delete User"
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Provision roles, manage statuses, reset passwords, and audit account access details.
          </p>
        </div>
        <Button
          onClick={() => { resetCreate(); setIsCreateOpen(true); }}
          className="flex items-center gap-1.5 shadow-md shadow-primary/10"
        >
          <UserPlus size={16} />
          <span>Create User</span>
        </Button>
      </div>

      {/* Filter panel card */}
      <div className="glass-panel p-4 bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/80 rounded-xl flex flex-wrap gap-4 items-center justify-between backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 relative max-w-sm w-full">
          <Search size={16} className="absolute left-3 text-slate-450 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={handleRoleFilterChange}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-300"
          >
            <option value="">All Roles</option>
            <option value="Administrator">Administrator</option>
            <option value="Accountant">Accountant</option>
            <option value="Auditor">Auditor</option>
          </select>

          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 py-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/20 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-slate-700 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
            <option value="Pending">Pending</option>
          </select>

          <button
            onClick={fetchUsers}
            className="p-2 border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table list */}
      <Table
        columns={columns}
        data={users}
        isLoading={isLoading}
        totalItems={totalUsers}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(p) => setCurrentPage(p)}
      />

      {/* ================= CREATE USER MODAL ================= */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create System User">
        <form onSubmit={handleCreateSubmit(onCreateSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              error={errorsCreate.first_name?.message}
              {...regCreate('first_name', { required: 'First name is required' })}
            />
            <Input
              label="Last Name"
              error={errorsCreate.last_name?.message}
              {...regCreate('last_name', { required: 'Last name is required' })}
            />
          </div>
          <Input
            label="Email Address"
            type="email"
            placeholder="user@enterprise.com"
            error={errorsCreate.email?.message}
            {...regCreate('email', { required: 'Email address is required' })}
          />
          <Input
            label="Phone Number"
            error={errorsCreate.phone?.message}
            {...regCreate('phone')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              label="System Role"
              options={[
                { value: 'Accountant', label: 'Accountant' },
                { value: 'Administrator', label: 'Administrator' },
                { value: 'Auditor', label: 'Auditor' }
              ]}
              {...regCreate('role')}
            />
            <Dropdown
              label="Account Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Inactive', label: 'Inactive' }
              ]}
              {...regCreate('status')}
            />
          </div>

          <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Temporary Password
              </label>
              <button
                type="button"
                onClick={handleGenerateTempPassword}
                className="text-[10px] text-primary hover:underline font-bold"
              >
                Generate Password
              </button>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              error={errorsCreate.password?.message}
              {...regCreate('password', { 
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' }
              })}
            />
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-150 dark:border-slate-800/85">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)} disabled={submittingAction}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingAction}>
              Register User
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= EDIT USER MODAL ================= */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Modify User Account">
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
          {selectedUser && (
            <div className="bg-slate-50 dark:bg-slate-950/20 p-3 rounded-lg flex items-center gap-3 border border-slate-200/50 dark:border-slate-800 text-xs">
              <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-primary">
                {selectedUser.first_name[0]}{selectedUser.last_name[0]}
              </div>
              <div>
                <p className="font-bold">{selectedUser.first_name} {selectedUser.last_name}</p>
                <p className="text-slate-400">{selectedUser.email}</p>
              </div>
            </div>
          )}
          <Input
            label="Phone Number"
            error={errorsEdit.phone?.message}
            {...regEdit('phone')}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Dropdown
              label="System Role"
              options={[
                { value: 'Accountant', label: 'Accountant' },
                { value: 'Administrator', label: 'Administrator' },
                { value: 'Auditor', label: 'Auditor' }
              ]}
              {...regEdit('role')}
            />
            <Dropdown
              label="Account Status"
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
                { value: 'Suspended', label: 'Suspended' },
                { value: 'Pending', label: 'Pending' }
              ]}
              {...regEdit('status')}
            />
          </div>

          <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-150 dark:border-slate-800/85">
            <Button variant="outline" type="button" onClick={() => setIsEditOpen(false)} disabled={submittingAction}>
              Cancel
            </Button>
            <Button type="submit" isLoading={submittingAction}>
              Save Modifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= ADMIN OVERRIDE RESET PASSWORD MODAL ================= */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title="Force Reset Password">
        <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 flex gap-3 text-xs text-warning-dark">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <p>
              This override action forces a password replacement for the user without requiring their current credentials. Log audits are registered.
            </p>
          </div>
          <Input
            label="New Password Override"
            type="password"
            placeholder="••••••••"
            error={errorsReset.new_pw?.message}
            {...regReset('new_pw', { 
              required: 'New password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' }
            })}
          />
          <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-150 dark:border-slate-800/85">
            <Button variant="outline" type="button" onClick={() => setIsResetOpen(false)} disabled={submittingAction}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submittingAction}>
              Override Password
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= DEACTIVATE CONFIRMATION DIALOG ================= */}
      <ConfirmationDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        title="Deactivate Account"
        message={`Are you sure you want to deactivate ${selectedUser?.first_name}'s account? This will block user access and terminate active sessions.`}
        confirmText="Deactivate"
        type="warning"
        isLoading={submittingAction}
      />

      {/* ================= DELETE CONFIRMATION DIALOG ================= */}
      <ConfirmationDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete User"
        message={`Are you sure you want to permanently delete user account ${selectedUser?.email}? This action is irreversible.`}
        confirmText="Delete Account"
        type="danger"
        isLoading={submittingAction}
      />
    </div>
  );
};
export default UserManagement;
