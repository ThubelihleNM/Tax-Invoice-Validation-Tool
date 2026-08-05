import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthLayout: React.FC = () => {
  const { user, loading } = useAuth();

  // Redirect authenticated users immediately to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <div className="w-full max-w-[1100px] min-h-[600px] grid grid-cols-1 md:grid-cols-12 rounded-2xl shadow-2xl overflow-hidden border border-slate-200/40 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-lg">
        <Outlet />
      </div>
    </div>
  );
};
export default AuthLayout;
