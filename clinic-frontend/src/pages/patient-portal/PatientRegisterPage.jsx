import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { patientPortalApi } from '../../api/patientPortal';
import { mediaUrl } from '../../utils/mediaUrl';
import { formatPhoneInput, validatePhone } from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Eye, EyeOff, ShieldCheck, Info, Sun, Moon } from 'lucide-react';

export default function PatientRegisterPage() {
  const { clinic } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errors,   setErrors]   = useState({});

  function validate() {
    const errs = {};
    const phoneErr = validatePhone(phone);
    if (phoneErr) errs.phone = phoneErr;
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!confirm) errs.confirm = 'Please confirm your password';
    else if (password !== confirm) errs.confirm = 'Passwords do not match';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await patientPortalApi.register({ phone: phone.replace(/\D/g, ''), password });
      toast.success('Account created! Please sign in.');
      navigate('/patient/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-4">

      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggle}
          className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Branding */}
      <div className="flex flex-col items-center mb-6">
        {clinic?.logo_url
          ? <img src={mediaUrl(clinic.logo_url)} alt="" className="h-14 w-14 object-contain rounded-[var(--radius-lg)] mb-3" />
          : <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-2xl mb-3">
              {clinic?.clinic_name?.[0]?.toUpperCase() || 'C'}
            </div>
        }
        <h1 className="text-lg font-bold text-[var(--color-text)]">{clinic?.clinic_name || 'Patient Portal'}</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Patient Portal</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-6">
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Create account</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">Use the phone number registered at the clinic</p>

        {/* Info notice */}
        <div className="flex items-start gap-2 bg-[var(--color-primary-light)] border border-blue-100 rounded-[var(--radius)] px-3 py-2.5 mb-5">
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--color-primary)] leading-relaxed">
            Your phone number must already be registered with the clinic. Contact clinic staff if you're unsure.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Phone Number <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={e => { setPhone(formatPhoneInput(e.target.value)); setErrors(v => ({ ...v, phone: undefined })); }}
              placeholder="077 123 4567"
              className={`w-full px-3 py-2 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:border-transparent ${
                errors.phone
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
              }`}
            />
            {errors.phone && <span className="text-xs text-[var(--color-danger)]">{errors.phone}</span>}
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Password <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: undefined })); }}
                placeholder="Min. 6 characters"
                className={`w-full px-3 py-2 pr-10 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:border-transparent ${
                  errors.password
                    ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                    : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
                }`}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <span className="text-xs text-[var(--color-danger)]">{errors.password}</span>}
          </div>

          {/* Confirm */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Confirm Password <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setErrors(v => ({ ...v, confirm: undefined })); }}
              placeholder="Re-enter your password"
              className={`w-full px-3 py-2 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:border-transparent ${
                errors.confirm
                  ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                  : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
              }`}
            />
            {errors.confirm && <span className="text-xs text-[var(--color-danger)]">{errors.confirm}</span>}
          </div>

          <Button type="submit" loading={loading} className="w-full mt-1">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-5">
          Already have an account?{' '}
          <Link to="/patient/login" className="text-[var(--color-primary)] font-medium hover:underline">Sign in</Link>
        </p>
      </div>

      <div className="flex items-center gap-1.5 mt-5 text-xs text-[var(--color-text-secondary)]">
        <ShieldCheck className="w-3.5 h-3.5" />
        Your health data is private and encrypted
      </div>
    </div>
  );
}
