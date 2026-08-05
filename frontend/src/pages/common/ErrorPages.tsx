import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, FileQuestion, ServerCrash, AlertOctagon } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const Page404: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 p-6">
      <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-full animate-bounce">
        <FileQuestion size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">404 - Page Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
          The dashboard link you are seeking does not exist or has been relocated to another workspace.
        </p>
      </div>
      <Button onClick={() => navigate('/dashboard')}>
        Return to Dashboard
      </Button>
    </div>
  );
};

export const Page403: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 p-6">
      <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-full animate-pulse">
        <ShieldX size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">403 - Forbidden Access</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
          You do not possess the role permissions required to view this panel.
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </Button>
    </div>
  );
};

export const Page401: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 p-6">
      <div className="p-4 bg-warning/10 border border-warning/20 text-warning rounded-full">
        <AlertOctagon size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">401 - Unauthorized</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
          Your session tokens are invalid or expired. Please sign in to verify credentials.
        </p>
      </div>
      <Button onClick={() => navigate('/login')}>
        Login Now
      </Button>
    </div>
  );
};

export const Page500: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-6 p-6">
      <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-full">
        <ServerCrash size={48} />
      </div>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100">500 - Server Error</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-sm">
          An unexpected error occurred in the service backend. Please refresh the connection.
        </p>
      </div>
      <Button variant="secondary" onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </div>
  );
};
