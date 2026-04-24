import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Users, Calendar, Receipt, Activity } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../store/AuthContext';
import api from '../../api';

const FEATURES = [
  { icon: Users,    label: 'Patient Queue',  desc: 'Real-time queue tracking'    },
  { icon: Calendar, label: 'Appointments',   desc: 'Book & manage all visits'     },
  { icon: Receipt,  label: 'Billing',        desc: 'Invoices & payment records'   },
];

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
    <div className="min-h-screen flex bg-[var(--color-bg)]">

      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col p-14"
        style={{ background: 'linear-gradient(135deg, #07548E 0%, #0a6ab0 50%, #053f6a 100%)' }}>

        {/* Decorative background circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.03]" />
        <div className="absolute top-1/3 right-12 w-40 h-40 rounded-full bg-white/[0.04]" />

        {/* Ping accent ring */}
        <div className="absolute bottom-28 right-16 w-14 h-14">
          <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
          <span className="relative flex rounded-full w-14 h-14 bg-white/10 items-center justify-center">
            <Activity className="w-5 h-5 text-white/60" />
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">

          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <img src="/logosmall.png" alt="ClinicPOS" className="w-10 h-10 object-contain shrink-0" />
            <span className="text-white text-lg font-bold tracking-tight">ClinicPOS</span>
          </div>

          {/* Headline */}
          <div className="my-auto py-12">
            <h1 className="text-white text-4xl font-bold leading-snug mb-4">
              Your clinic,<br />running smarter.
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-xs">
              From patient registration to end-of-day closing — manage your entire clinic workflow from one dashboard.
            </p>

            {/* Animated stat pill */}
            <div className="mt-8 inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-white/80 text-xs font-medium">Live system — active now</span>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-white text-xs font-semibold mb-0.5">{label}</p>
                <p className="text-white/50 text-[11px] leading-tight">{desc}</p>
              </div>
            ))}
          </div>

          <p className="text-white/25 text-xs mt-6">
            ClinicPOS &copy; {new Date().getFullYear()} &middot; HealthCenter.lk
          </p>
        </div>
      </div>

      {/* ── Right login panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">

        {/* Mobile logo — hidden on desktop */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <img src="/logosmall.png" alt="ClinicPOS" className="w-12 h-12 object-contain mb-3" />
          <h1 className="text-xl font-semibold text-[var(--color-text)]">ClinicPOS</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Sign in to your account</p>
        </div>

        <div className="w-full max-w-sm">

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">Welcome back</h2>
            <p className="text-sm text-[var(--color-text-secondary)] mt-1">Sign in to your account to continue</p>
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
            ClinicPOS &middot; Clinic Management System
          </p>
        </div>
      </div>

    </div>
  );
}
