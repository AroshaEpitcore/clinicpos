import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { patientPortalApi } from '../../api/patientPortal';
import { mediaUrl } from '../../utils/mediaUrl';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Info } from 'lucide-react';

export default function PatientRegisterPage() {
  const { clinic } = useAuth();
  const navigate   = useNavigate();

  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const pwMatch = confirm && password !== confirm;

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) { toast.error('Passwords do not match'); return; }
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-primary)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 pt-10 pb-6 text-white min-h-[180px]">
        <div className="mb-4">
          {clinic?.logo_url
            ? <img src={mediaUrl(clinic.logo_url)} alt=""
                className="h-14 w-14 object-contain rounded-2xl shadow-xl border-2 border-white/30 mx-auto" />
            : <div className="h-14 w-14 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white font-black text-xl mx-auto shadow-xl">
                {clinic?.clinic_name?.[0]?.toUpperCase() || 'C'}
              </div>
          }
        </div>
        <h1 className="text-xl font-black text-white text-center">{clinic?.clinic_name || 'Patient Portal'}</h1>
        <p className="text-blue-100 text-sm mt-1 text-center">Create your health account</p>
      </div>

      {/* ── White register sheet ─────────────────────────────────────────── */}
      <div className="bg-white rounded-t-[2rem] px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-xl font-black text-[var(--color-ink)] mb-0.5">Create account</h2>
        <p className="text-sm text-[var(--color-ink-light)] mb-6">Use the phone number registered at the clinic</p>

        {/* Info notice */}
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-6">
          <Info className="w-4 h-4 text-[var(--color-primary)] shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            Your phone number must already be registered with the clinic. If you're unsure, please contact clinic staff.
          </p>
        </div>

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
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full px-4 pr-12 py-3.5 text-base border-2 border-[var(--color-border)] rounded-2xl bg-gray-50 focus:outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all placeholder:text-gray-300"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--color-ink)] rounded-lg transition-colors">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-xs font-bold text-[var(--color-ink)] mb-2">Confirm Password</label>
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter your password"
              required
              className={`w-full px-4 py-3.5 text-base border-2 rounded-2xl bg-gray-50 focus:outline-none focus:bg-white transition-all placeholder:text-gray-300 ${
                pwMatch
                  ? 'border-red-400 focus:border-red-500'
                  : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
              }`}
            />
            {pwMatch && <p className="text-xs text-red-500 mt-1.5 ml-1">Passwords do not match</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !!pwMatch}
            className="w-full mt-2 py-4 rounded-2xl bg-[var(--color-primary)] text-white text-base font-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
          >
            {loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Creating…</span>
              : <span className="flex items-center gap-2">Create Account <ArrowRight className="w-5 h-5" /></span>
            }
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--color-ink-light)]">
            Already have an account?{' '}
            <Link to="/patient/login" className="text-[var(--color-primary)] font-bold hover:underline">Sign in</Link>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[0.65rem] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Your health data is private and encrypted
        </div>
      </div>
    </div>
  );
}
