import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { usePatientAuth } from '../../store/PatientAuthContext';
import { patientPortalApi } from '../../api/patientPortal';
import { mediaUrl } from '../../utils/mediaUrl';
import { formatPhoneInput } from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function PatientLoginPage() {
  const { clinic } = useAuth();
  const { loginPatient } = usePatientAuth();
  const navigate = useNavigate();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await patientPortalApi.login({ phone: phone.replace(/\D/g, ''), password });
      const { token, first_name } = r.data.data;
      loginPatient(token, first_name);
      navigate('/patient/dashboard');
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Patient portal is not available at this clinic');
      } else {
        toast.error(err.response?.data?.message || 'Invalid phone number or password');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-4">

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
        <h2 className="text-base font-semibold text-[var(--color-text)] mb-1">Welcome back</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-5">Sign in with your registered phone number</p>

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
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              placeholder="077 123 4567"
              required
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">
              Password <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full px-3 py-2 pr-10 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full mt-1">
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-[var(--color-text-secondary)] mt-5">
          Don't have an account?{' '}
          <Link to="/patient/register" className="text-[var(--color-primary)] font-medium hover:underline">
            Register here
          </Link>
        </p>
      </div>

      <div className="flex items-center gap-1.5 mt-5 text-xs text-[var(--color-text-secondary)]">
        <ShieldCheck className="w-3.5 h-3.5" />
        Your health data is private and encrypted
      </div>
    </div>
  );
}
