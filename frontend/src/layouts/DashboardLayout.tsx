import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LayoutDashboard, UploadCloud, History, CheckSquare, ShieldAlert, 
  FileBarChart, BarChart3, Users, Settings, LogOut, Menu, Bell, 
  Sun, Moon, User as UserIcon, Lock, ChevronLeft, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/common/Button';

export const DashboardLayout: React.FC = () => {
  const { user, loading, logout, showSessionWarning, extendSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  // Session Warning Countdown timer
  useEffect(() => {
    let timer: number;
    if (showSessionWarning) {
      setCountdown(60);
      timer = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showSessionWarning]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Route protection
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role;

  // Sidebar navigation menu options filtered by role permissions
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['Administrator', 'Accountant', 'Auditor'] },
    { path: '/upload', label: 'Upload Invoice', icon: <UploadCloud size={20} />, roles: ['Administrator', 'Accountant'] },
    { path: '/history', label: 'Invoice History', icon: <History size={20} />, roles: ['Administrator', 'Accountant'] },
    { path: '/validation', label: 'Validation Results', icon: <CheckSquare size={20} />, roles: ['Administrator', 'Accountant', 'Auditor'] },
    { path: '/fraud', label: 'Fraud Detection', icon: <ShieldAlert size={20} />, roles: ['Administrator'] },
    { path: '/reports', label: 'Reports', icon: <FileBarChart size={20} />, roles: ['Administrator', 'Accountant', 'Auditor'] },
    { path: '/analytics', label: 'Analytics', icon: <BarChart3 size={20} />, roles: ['Administrator', 'Accountant', 'Auditor'] },
    { path: '/users', label: 'User Management', icon: <Users size={20} />, roles: ['Administrator'] },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} />, roles: ['Administrator'] },
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* ================= INACTIVITY POPUP ================= */}
      <AnimatePresence>
        {showSessionWarning && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6"
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center text-warning animate-bounce">
                <ShieldCheck size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inactivity Timeout</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Your session is about to expire due to inactivity. You will be automatically logged out in:
                </p>
                <div className="text-4xl font-extrabold text-danger animate-pulse">{countdown}s</div>
              </div>
              <div className="flex gap-4 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleLogout}>
                  Logout Now
                </Button>
                <Button className="flex-1" onClick={extendSession}>
                  Stay Logged In
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= SIDEBAR ================= */}
      <aside 
        className={`hidden md:flex flex-col bg-slate-900 dark:bg-slate-950 border-r border-slate-800 text-slate-300 transition-all duration-300 relative z-25 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-base flex-shrink-0 shadow-lg">
              T
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-white text-base tracking-wide truncate">
                TaxAudit SaaS
              </span>
            )}
          </div>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-500 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} className={`transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-grow py-6 px-3 space-y-1 overflow-y-auto">
          {allowedMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'hover:bg-slate-800 hover:text-white text-slate-400'
                }`
              }
            >
              <div className="flex-shrink-0">{item.icon}</div>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User Card info footer */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-primary-light flex-shrink-0">
            {user.profile_photo ? (
              <img src={user.profile_photo} alt="Avatar" className="h-full w-full rounded-full object-cover" />
            ) : (
              `${user.first_name[0]}${user.last_name[0]}`
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-grow min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.first_name} {user.last_name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          )}
        </div>
      </aside>

      {/* ================= MOBILE NAVIGATION DRAWER ================= */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-64 bg-slate-900 text-slate-300 flex flex-col h-full z-10"
            >
              <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-base">T</div>
                <span className="font-bold text-white text-base tracking-wide">TaxAudit SaaS</span>
              </div>
              <nav className="flex-grow py-6 px-4 space-y-1 overflow-y-auto">
                {allowedMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={({ isActive }) => 
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        isActive ? 'bg-primary text-white' : 'hover:bg-slate-800 text-slate-400'
                      }`
                    }
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-4 border-t border-slate-800 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-primary-light">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    `${user.first_name[0]}${user.last_name[0]}`
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.first_name} {user.last_name}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MAIN CONTAINER ================= */}
      <div className="flex-grow flex flex-col min-w-0">
        
        {/* Sticky Header Bar */}
        <header className="h-16 bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/80 flex items-center justify-between px-6 sticky top-0 backdrop-blur-md z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-64 bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-slate-200 dark:focus:border-slate-700 focus:bg-white dark:focus:bg-slate-900 text-xs rounded-lg px-3.5 py-1.5 focus:outline-none transition-all duration-200 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Dark Mode toggle */}
            <button
              onClick={toggleTheme}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Notification bell dropdown */}
            <div className="relative">
              <button 
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-white dark:ring-slate-900" />
              </button>
              
              <AnimatePresence>
                {notifDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNotifDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-2xl z-40 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Notifications</span>
                        <span className="text-[10px] text-primary hover:underline cursor-pointer">Mark all read</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-64 overflow-y-auto">
                        <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Invoice Validated</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Invoice INV-2026-0482 has been successfully validated.</p>
                          <span className="text-[8px] text-slate-400 mt-1 block">5 minutes ago</span>
                        </div>
                        <div className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors cursor-pointer">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Duplicate Tax ID Detected</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Supplier TAX number conflict found on uploaded file.</p>
                          <span className="text-[8px] text-slate-400 mt-1 block">1 hour ago</span>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 border border-slate-200/50 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-full pl-1.5 pr-3 py-1 hover:bg-slate-50 dark:hover:bg-slate-850 transition-all duration-200"
              >
                <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-primary">
                  {user.profile_photo ? (
                    <img src={user.profile_photo} alt="Avatar" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    `${user.first_name[0]}${user.last_name[0]}`
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline truncate max-w-[100px]">
                  {user.first_name}
                </span>
              </button>

              <AnimatePresence>
                {profileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileDropdownOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-52 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-xl shadow-2xl z-40 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/10">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{user.first_name} {user.last_name}</p>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary mt-0.5 block">{user.role}</span>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={() => { setProfileDropdownOpen(false); navigate('/profile'); }}
                          className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-medium text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors text-slate-600 dark:text-slate-400 dark:hover:text-white"
                        >
                          <UserIcon size={14} />
                          <span>My Profile</span>
                        </button>
                        <button
                          onClick={() => { setProfileDropdownOpen(false); navigate('/profile?tab=password'); }}
                          className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-medium text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition-colors text-slate-600 dark:text-slate-400 dark:hover:text-white"
                        >
                          <Lock size={14} />
                          <span>Change Password</span>
                        </button>
                        <hr className="my-1 border-slate-100 dark:border-slate-800" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 text-xs font-semibold text-danger hover:bg-danger/5 rounded-lg transition-colors"
                        >
                          <LogOut size={14} />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content wrapper */}
        <main className="flex-grow p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
