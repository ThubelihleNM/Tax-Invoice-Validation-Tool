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
  Login, ForgotPassword, ResetPassword, Dashboard, Upload, History,
  ValidationResults, FraudDetection, ReportsList, AnalyticsPanel,
  SystemSettings, Profile, UserManagement, Page401, Page403, Page404, Page500
} from './pages';

// Protected Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({ children, roles }) => {
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

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Router>
            <Routes>
              
              {/* ================= PUBLIC AUTH PATHS ================= */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              </Route>

              {/* ================= PROTECTED DASHBOARD PATHS ================= */}
              <Route element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                
                {/* Accountant & Admin only */}
                <Route path="/upload" element={
                  <ProtectedRoute roles={['Administrator', 'Accountant']}>
                    <Upload />
                  </ProtectedRoute>
                } />
                <Route path="/history" element={
                  <ProtectedRoute roles={['Administrator', 'Accountant']}>
                    <History />
                  </ProtectedRoute>
                } />

                {/* Validation & Reports & Analytics - All roles */}
                <Route path="/validation" element={<ValidationResults />} />
                <Route path="/reports" element={<ReportsList />} />
                <Route path="/analytics" element={<AnalyticsPanel />} />

                {/* Admin Only Paths */}
                <Route path="/fraud" element={
                  <ProtectedRoute roles={['Administrator']}>
                    <FraudDetection />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute roles={['Administrator']}>
                    <UserManagement />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute roles={['Administrator']}>
                    <SystemSettings />
                  </ProtectedRoute>
                } />
              </Route>

              {/* ================= SYSTEM & ERROR REDIRECTS ================= */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
