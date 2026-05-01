import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { usePatientAuth } from '../../store/PatientAuthContext';
import { patientPortalApi } from '../../api/patientPortal';
import { mediaUrl } from '../../utils/mediaUrl';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-primary)' }}>

      {/* ── Hero branding area ───────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-12 pb-6 text-white min-h-[220px]">
        <div className="mb-4">
          {clinic?.logo_url
            ? <img src={mediaUrl(clinic.logo_url)} alt=""
                className="h-16 w-16 object-contain rounded-2xl shadow-xl border-2 border-white/30 mx-auto" />
            : <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-xl">
                {clinic?.clinic_name?.[0]?.toUpperCase() || 'C'}
              </div>
          }
        </div>
        <h1 className="text-2xl font-black text-white text-center leading-tight">
          {clinic?.clinic_name || 'Patient Portal'}
        </h1>
        <p className="text-blue-100 text-sm mt-1.5 text-center">Your health records, anytime</p>
      </div>

      {/* ── White login sheet ────────────────────────────────────────────── */}
      <div className="bg-white rounded-t-[2rem] px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-xl font-black text-[var(--color-ink)] mb-0.5">Welcome back</h2>
        <p className="text-sm text-[var(--color-ink-light)] mb-7">Sign in with your registered phone number</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] mb-2">Phone Number</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="07X XXX XXXX"
              required
              className="w-full px-4 py-3.5 text-base border-2 border-[var(--color-border)] rounded-2xl bg-gray-50 focus:outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all placeholder:text-gray-300"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] mb-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                required
                className="w-full px-4 pr-12 py-3.5 text-base border-2 border-[var(--color-border)] rounded-2xl bg-gray-50 focus:outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all placeholder:text-gray-300"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--color-ink)] transition-colors rounded-lg">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-4 rounded-2xl bg-[var(--color-primary)] text-white text-base font-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in…</span>
              : <span className="flex items-center gap-2">Sign In <ArrowRight className="w-5 h-5" /></span>
            }
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-sm text-[var(--color-ink-light)]">
            Don't have an account?{' '}
            <Link to="/patient/register" className="text-[var(--color-primary)] font-bold hover:underline">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[0.65rem] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Your health data is private and encrypted
        </div>
      </div>
    </div>
  );
}
