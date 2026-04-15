import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../store/AuthContext';
import api from '../../api';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    try {
      const res = await api.post('/auth/login', data);
      const { token, user, flags, clinic } = res.data.data;
      login(token, user, flags, clinic);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.message;
      if (err.response?.status === 401) {
        toast.error('Incorrect email or password.');
      } else if (err.response?.status === 403) {
        toast.error(message || 'Your account has been suspended. Contact support.');
      } else if (!err.response) {
        toast.error('No connection. Check your internet and try again.');
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] flex items-center justify-center mb-3">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">ClinicPOS</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Sign in to your account</p>
        </div>

        {/* Form card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

            <Input
              label="Email address"
              type="email"
              placeholder="you@clinic.com"
              autoComplete="email"
              required
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Password<span className="text-[var(--color-danger)] ml-0.5">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 pr-10 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)]
                    text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]
                    focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent
                    ${errors.password ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                  {...register('password', { required: 'Password is required' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-xs text-[var(--color-danger)]">{errors.password.message}</span>
              )}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full mt-1">
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--color-text-secondary)] mt-6">
          Doctor POS — Clinic Management System
        </p>
      </div>
    </div>
  );
}
