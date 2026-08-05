import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { toast } from '../../components/common/Toast';
import { Check, X, ShieldAlert, Key } from 'lucide-react';
import { motion } from 'framer-motion';

interface ResetPasswordInputs {
  new_password: string;
  confirm_password: string;
}

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  
  const token = searchParams.get('token') || '';

  const { register, handleSubmit, control, formState: { errors } } = useForm<ResetPasswordInputs>({
    mode: 'onChange'
  });

  const passwordVal = useWatch({ control, name: 'new_password', defaultValue: '' });
  const confirmPasswordVal = useWatch({ control, name: 'confirm_password', defaultValue: '' });

  // Validation rules check state
  const checks = {
    length: passwordVal.length >= 8,
    uppercase: /[A-Z]/.test(passwordVal),
    lowercase: /[a-z]/.test(passwordVal),
    number: /[0-9]/.test(passwordVal),
    special: /[^A-Za-z0-9]/.test(passwordVal)
  };

  // Calculate strength score (0 to 5)
  const score = Object.values(checks).filter(Boolean).length;
  
  const getStrengthMeta = () => {
    if (!passwordVal) return { label: 'Empty', color: 'bg-slate-200', width: 'w-0', text: 'text-slate-400' };
    if (score <= 2) return { label: 'Weak', color: 'bg-danger', width: 'w-1/4', text: 'text-danger' };
    if (score === 3) return { label: 'Medium', color: 'bg-warning', width: 'w-2/4', text: 'text-warning-dark' };
    if (score === 4) return { label: 'Strong', color: 'bg-primary-light', width: 'w-3/4', text: 'text-primary' };
    return { label: 'Excellent', color: 'bg-success', width: 'w-full', text: 'text-success-dark' };
  };

  const strength = getStrengthMeta();
  const isMatch = passwordVal && confirmPasswordVal && passwordVal === confirmPasswordVal;

  const onSubmit = async (data: ResetPasswordInputs) => {
    if (score < 5) {
      toast('danger', 'Password Weak', 'Please satisfy all password safety criteria.');
      return;
    }
    if (!isMatch) {
      toast('danger', 'Error', 'Passwords do not match.');
      return;
    }
    if (!token) {
      toast('danger', 'Invalid Token', 'Reset token is missing from URL parameters.');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('/api/auth/reset-password', {
        token: token,
        new_password: data.new_password
      });
      toast('success', 'Password Updated', 'Your password has been successfully reset. Please sign in.');
      navigate('/login');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to reset password.';
      toast('danger', 'Reset Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="col-span-1 md:col-span-12 flex flex-col justify-center items-center p-8 bg-white dark:bg-slate-900 transition-colors duration-200 min-h-[600px]">
      <div className="max-w-md w-full space-y-6">
        
        <div className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Key size={22} />
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-sans">Set New Password</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please configure your new secure access credentials below.
          </p>
        </div>

        {!token && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 flex gap-3 text-danger text-xs">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <p>
              <strong>Missing Token Warning:</strong> There is no reset token in the address URL. Make sure you initiate a password reset and navigate to this page using the link generated.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          
          {/* New password input */}
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            error={errors.new_password?.message}
            {...register('new_password', {
              required: 'Password is required'
            })}
          />

          {/* Strength Bar Gauge */}
          {passwordVal && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-550 font-medium">Password Strength:</span>
                <span className={`font-bold ${strength.text}`}>{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: score * 20 + '%' }}
                  className={`h-full ${strength.color} transition-all duration-300`}
                />
              </div>
            </div>
          )}

          {/* Criteria Checklist */}
          <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-800 rounded-lg p-3 space-y-2 text-xs">
            <h4 className="font-semibold text-slate-500 dark:text-slate-400">Security Checklist:</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-655 text-slate-600 dark:text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                {checks.length ? <Check size={14} className="text-success" /> : <X size={14} className="text-slate-350" />}
                <span>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                {checks.uppercase ? <Check size={14} className="text-success" /> : <X size={14} className="text-slate-350" />}
                <span>One uppercase letter</span>
              </div>
              <div className="flex items-center gap-1.5">
                {checks.lowercase ? <Check size={14} className="text-success" /> : <X size={14} className="text-slate-350" />}
                <span>One lowercase letter</span>
              </div>
              <div className="flex items-center gap-1.5">
                {checks.number ? <Check size={14} className="text-success" /> : <X size={14} className="text-slate-350" />}
                <span>One number</span>
              </div>
              <div className="flex items-center gap-1.5">
                {checks.special ? <Check size={14} className="text-success" /> : <X size={14} className="text-slate-350" />}
                <span>One special character</span>
              </div>
            </div>
          </div>

          {/* Confirm password input */}
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirm_password?.message}
            {...register('confirm_password', {
              required: 'Confirm password is required'
            })}
          />

          {/* Passwords Match indicator */}
          {confirmPasswordVal && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              {isMatch ? (
                <span className="text-success flex items-center gap-1">
                  <Check size={14} /> Passwords match
                </span>
              ) : (
                <span className="text-danger flex items-center gap-1">
                  <X size={14} /> Passwords do not match
                </span>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full py-2.5"
            isLoading={isLoading}
            disabled={score < 5 || !isMatch || !token}
          >
            Save Password
          </Button>
        </form>
      </div>
    </div>
  );
};
export default ResetPassword;
