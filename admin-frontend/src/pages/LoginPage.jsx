import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthApi } from '../api/admin';
import { useAdminAuth } from '../store/AdminAuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function LoginPage() {
  const navigate      = useNavigate();
  const { login }     = useAdminAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all required fields'); return; }
    setLoading(true);
    try {
      const res = await adminAuthApi.login(email, password);
      const { token, ...userData } = res.data.data;
      login(token, userData);
      toast.success('Welcome back');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-[var(--color-primary)] rounded-[var(--radius-lg)] flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">ClinicPOS</h1>
          <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Super Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-6">Sign in to continue</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@clinicpos.com"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
          ClinicPOS &copy; {new Date().getFullYear()} — Super Admin Panel
        </p>
      </div>
    </div>
  );
}
