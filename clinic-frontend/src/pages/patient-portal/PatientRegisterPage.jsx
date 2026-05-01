import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../store/AuthContext';
import { patientPortalApi } from '../../api/patientPortal';
import { mediaUrl } from '../../utils/mediaUrl';
import { Phone, Lock, Eye, EyeOff } from 'lucide-react';

export default function PatientRegisterPage() {
  const { clinic } = useAuth();
  const navigate   = useNavigate();

  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await patientPortalApi.register({ phone: phone.replace(/\D/g, ''), password });
      toast.success('Account created! Please sign in.');
      navigate('/patient/login');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          {clinic?.logo_url
            ? <img src={mediaUrl(clinic.logo_url)} alt="" className="h-14 w-14 object-contain rounded-xl mb-3" />
            : <div className="h-14 w-14 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-xl mb-3">P</div>
          }
          <h1 className="text-xl font-black text-[var(--color-ink)]">Create Account</h1>
          <p className="text-sm text-[var(--color-ink-light)] mt-1 text-center">
            Use the phone number registered at the clinic
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[var(--color-border)] p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-faint)]" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07X XXX XXXX"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <p className="text-[0.65rem] text-[var(--color-ink-faint)] mt-1">Must match the number the clinic has on file</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-faint)]" />
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="w-full pl-9 pr-9 py-2.5 text-sm border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)] hover:text-[var(--color-ink)]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-faint)]" />
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                required
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--color-ink-light)] mt-5">
          Already have an account?{' '}
          <Link to="/patient/login" className="text-[var(--color-primary)] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
