import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';
import { FileText, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginFormInputs {
  email: string;
  password: string;
  rememberMe: boolean;
}

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<LoginFormInputs>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  // Display session expiry notice if navigated from timeout redirect
  React.useEffect(() => {
    if (searchParams.get('expired')) {
      toast('warning', 'Session Expired', 'Your session has expired due to inactivity. Please login again.');
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginFormInputs) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password, data.rememberMe);
      toast('success', 'Welcome Back', 'Successfully logged in to your account.');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid email or password. Please try again.';
      toast('danger', 'Authentication Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ================= LEFT SIDE: PREMIUM BRANDING & FLOATING ANIMATIONS ================= */}
      <div className="hidden md:flex md:col-span-5 bg-gradient-to-tr from-slate-900 via-primary-dark to-primary p-12 flex-col justify-between relative overflow-hidden">
        
        {/* Floating invoice svg models in background */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute top-[20%] left-[10%] animate-float-slow">
            <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white fill-current">
              <rect width="120" height="150" rx="8" fill="white" fillOpacity="0.1" />
              <rect x="15" y="20" width="90" height="8" rx="2" fill="white" />
              <rect x="15" y="36" width="50" height="6" rx="2" fill="white" />
              <line x1="15" y1="60" x2="105" y2="60" stroke="white" strokeWidth="2" strokeDasharray="4 4" />
              <rect x="15" y="75" width="30" height="6" rx="2" fill="white" />
              <rect x="85" y="75" width="20" height="6" rx="2" fill="white" />
              <rect x="15" y="90" width="40" height="6" rx="2" fill="white" />
              <rect x="85" y="90" width="20" height="6" rx="2" fill="white" />
            </svg>
          </div>
          <div className="absolute bottom-[20%] right-[10%] animate-float-fast">
            <svg width="100" height="130" viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white fill-current">
              <rect width="100" height="130" rx="6" fill="white" fillOpacity="0.1" />
              <rect x="12" y="16" width="76" height="8" rx="2" fill="white" />
              <rect x="12" y="30" width="40" height="6" rx="2" fill="white" />
              <line x1="12" y1="50" x2="88" y2="50" stroke="white" strokeWidth="2" />
              <rect x="12" y="65" width="30" height="6" rx="2" fill="white" />
              <rect x="12" y="80" width="20" height="6" rx="2" fill="white" />
            </svg>
          </div>
        </div>

        {/* Branding header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
            <Shield size={22} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg tracking-wide">TaxAudit SaaS</span>
        </div>

        {/* Dynamic graphics and slogan */}
        <div className="space-y-6 relative z-10 my-auto">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-primary-light bg-primary/10 border border-primary/20 px-3 py-1 rounded-full w-max block">
              Enterprise Grade
            </span>
            <h2 className="text-3xl font-extrabold text-white leading-tight">
              Smart Tax Invoice Validation Tool
            </h2>
          </div>
          <p className="text-slate-350 text-sm leading-relaxed max-w-sm">
            Leverage OCR parsing, arithmetic validation algorithms, and machine fraud rating assessments to safeguard invoice flows instantly.
          </p>
          
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
              <CheckCircle size={16} className="text-success" />
              <span>Automated VAT Compliance checks</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
              <CheckCircle size={16} className="text-success" />
              <span>Suspicious/Duplicate invoice detection</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 text-xs font-medium">
              <CheckCircle size={16} className="text-success" />
              <span>Professional audit logging tracking</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 relative z-10 flex items-center justify-between">
          <span>Secure • Intelligent • Accurate</span>
          <span>v2.0.0</span>
        </div>
      </div>

      {/* ================= RIGHT SIDE: MODERN GLASSMORPHISM CARD ================= */}
      <div className="col-span-1 md:col-span-7 flex flex-col justify-center p-8 sm:p-12 md:p-16 bg-white dark:bg-slate-900 transition-colors duration-200">
        <div className="max-w-md w-full mx-auto space-y-8">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Welcome back</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Please enter your credentials to access your validation dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Email Field */}
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
                  message: 'Please enter a valid email address'
                }
              })}
            />

            {/* Password Field */}
            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required'
                })}
              />
            </div>

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 select-none cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-350 text-primary focus:ring-primary h-4 w-4 bg-transparent dark:border-slate-700"
                  {...register('rememberMe')}
                />
                <span className="text-xs text-slate-650 text-slate-650 dark:text-slate-400 font-medium">Remember me</span>
              </label>
              
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Login button */}
            <Button
              type="submit"
              className="w-full py-2.5 shadow-lg shadow-primary/10"
              isLoading={isLoading}
              disabled={!isValid}
            >
              Sign In
            </Button>
          </form>

          {/* Test Credentials Sandbox guide */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Sandbox Test Users:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-500 dark:text-slate-400">
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Admin Account</p>
                <p>Email: admin@enterprise.com</p>
                <p>Pass: Admin@123</p>
              </div>
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Accountant Account</p>
                <p>Email: accountant@enterprise.com</p>
                <p>Pass: Accountant@123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default Login;
