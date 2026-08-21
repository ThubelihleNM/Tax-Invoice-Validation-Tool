import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { ToastContainer } from './components/common/Toast';
import { DashboardLayout } from './layouts/DashboardLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { AIAssistantDrawer } from './components/ai/AIAssistantDrawer';
import {
  Landing, Register, Login, ForgotPassword, ResetPassword, Dashboard, Upload, History,
  ValidationResults, FraudDetection, ReportsList, AnalyticsPanel,
  SystemSettings, Profile, UserManagement, Page401, Page403, Page404, Page500
} from './pages';

// Protected Route Guard Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  roles?: string[]; 
  accountTypes?: ('PERSONAL' | 'COMPANY')[];
}> = ({ children, roles, accountTypes }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Redirect to Login if not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to 403 if role is not authorized
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  // Redirect to 403 if account type is not authorized
  if (accountTypes && !accountTypes.includes(user.account_type)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

// Dashboard Router Redirector
const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.account_type === 'PERSONAL') {
    return <Navigate to="/personal-dashboard" replace />;
  } else {
    return <Navigate to="/company-dashboard" replace />;
  }
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <Routes>
              
              {/* ================= PUBLIC PATHS ================= */}
              <Route path="/" element={<Landing />} />
              
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              {/* ================= PROTECTED DASHBOARD PATHS ================= */}
              <Route element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<DashboardRedirect />} />
                
                {/* Personal Dashboard */}
                <Route path="/personal-dashboard" element={
                  <ProtectedRoute accountTypes={['PERSONAL']}>
                    <Dashboard />
                  </ProtectedRoute>
                } />

                {/* Company Dashboard */}
                <Route path="/company-dashboard" element={
                  <ProtectedRoute accountTypes={['COMPANY']}>
                    <Dashboard />
                  </ProtectedRoute>
                } />

                <Route path="/profile" element={<Profile />} />
                
                {/* Upload - Shared */}
                <Route path="/upload" element={
                  <ProtectedRoute roles={['Administrator', 'Accountant']}>
                    <Upload />
                  </ProtectedRoute>
                } />

                {/* Reports - Shared */}
                <Route path="/reports" element={<ReportsList />} />

                {/* Validation Results - Shared */}
                <Route path="/validation" element={<ValidationResults />} />

                {/* Company User settings */}
                <Route path="/settings" element={
                  <ProtectedRoute accountTypes={['COMPANY']} roles={['Administrator']}>
                    <SystemSettings />
                  </ProtectedRoute>
                } />

                {/* Company User history */}
                <Route path="/history" element={
                  <ProtectedRoute accountTypes={['COMPANY']} roles={['Administrator', 'Accountant']}>
                    <History />
                  </ProtectedRoute>
                } />

                {/* Company User analytics */}
                <Route path="/analytics" element={
                  <ProtectedRoute accountTypes={['COMPANY']}>
                    <AnalyticsPanel />
                  </ProtectedRoute>
                } />

                {/* Company User fraud */}
                <Route path="/fraud" element={
                  <ProtectedRoute accountTypes={['COMPANY']} roles={['Administrator']}>
                    <FraudDetection />
                  </ProtectedRoute>
                } />

                {/* Company User management */}
                <Route path="/users" element={
                  <ProtectedRoute accountTypes={['COMPANY']} roles={['Administrator']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
              </Route>

              {/* ================= SYSTEM & ERROR REDIRECTS ================= */}
              <Route path="/401" element={<Page401 />} />
              <Route path="/403" element={<Page403 />} />
              <Route path="/500" element={<Page500 />} />
              <Route path="*" element={<Page404 />} />

            </Routes>
          </Router>
          {/* Toast container notification overlay */}
          <ToastContainer />
          <AIAssistantDrawer />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
