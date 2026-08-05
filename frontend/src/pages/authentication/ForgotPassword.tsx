import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';
import { ChevronLeft, ShieldAlert } from 'lucide-react';

interface ForgotPasswordInputs {
  email: string;
}

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordInputs>();

  const onSubmit = async (data: ForgotPasswordInputs) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/auth/forgot-password', { email: data.email });
      toast('success', 'Reset Request Sent', 'A password reset token was generated successfully.');
      if (res.data.reset_token) {
        setResetToken(res.data.reset_token);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to request password reset.';
      toast('danger', 'Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="col-span-1 md:col-span-12 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-900 transition-colors duration-200 min-h-[600px]">
      <div className="max-w-md w-full space-y-6">
        
        {/* Back navigation button */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium"
        >
          <ChevronLeft size={16} />
          <span>Back to Login</span>
        </button>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-sans">Forgot Password</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Enter your registered email below, and we will generate a password reset token.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="name@enterprise.com"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email address is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // simple fix regex
                message: 'Please enter a valid email'
              }
            })}
          />

          <Button
            type="submit"
            className="w-full py-2.5"
            isLoading={isLoading}
          >
            Generate Reset Token
          </Button>
        </form>

        {/* Demo verification helper box for reset token copy paste */}
        {resetToken && (
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-warning">
              <ShieldAlert size={16} />
              <h4 className="text-xs font-semibold">Sandbox Helper (SMTP Stub):</h4>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Since no email server is connected in this dev environment, copy your token below and click the button to navigate to the reset screen:
            </p>
            <div className="bg-white dark:bg-slate-950 p-2 text-xs select-all text-center rounded border border-slate-250 dark:border-slate-800 font-mono tracking-wider text-slate-800 dark:text-slate-100 font-bold">
              {resetToken}
            </div>
            <Button
              className="w-full py-1.5 text-xs"
              variant="secondary"
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
            >
              Go to Password Reset Page
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
export default ForgotPassword;
