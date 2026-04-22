import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Ban, RefreshCw, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { adminDashboardApi, adminTenantsApi, adminPlatformApi } from '../api/admin';
import { StatCard, Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats,           setStats]           = useState(null);
  const [clinics,         setClinics]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [landingEnabled,  setLandingEnabled]  = useState(true);
  const [landingToggling, setLandingToggling] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [dashRes, clinicRes, platformRes] = await Promise.all([
        adminDashboardApi.get(),
        adminTenantsApi.list(),
        adminPlatformApi.get(),
      ]);
      setStats(dashRes.data.data);
      setClinics(clinicRes.data.data.slice(0, 8));
      const settings = platformRes.data.data ?? {};
      setLandingEnabled(settings.landing_page_enabled !== 'false');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleLanding() {
    setLandingToggling(true);
    try {
      const next = !landingEnabled;
      await adminPlatformApi.set('landing_page_enabled', String(next));
      setLandingEnabled(next);
      toast.success(`Landing page ${next ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update landing page setting.');
    } finally {
      setLandingToggling(false);
    }
  }

  const allClinics = stats ? stats.total_clinics    ?? 0 : 0;
  const active     = stats ? stats.active_clinics   ?? 0 : 0;
  const suspended  = stats ? stats.suspended_clinics ?? 0 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Dashboard</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Clinics"
          value={loading ? '—' : allClinics}
          icon={Building2}
          color="blue"
          onClick={() => navigate('/clinics')}
        />
        <StatCard
          label="Active"
          value={loading ? '—' : active}
          icon={CheckCircle}
          color="green"
          onClick={() => navigate('/clinics?status=active')}
          sub={allClinics > 0 ? `${Math.round((active / allClinics) * 100)}% of total` : undefined}
        />
        <StatCard
          label="Suspended"
          value={loading ? '—' : suspended}
          icon={Ban}
          color={suspended > 0 ? 'red' : 'gray'}
          onClick={() => navigate('/clinics?status=suspended')}
          alert={suspended > 0}
          sub={suspended > 0 ? 'require attention' : 'all clear'}
        />
      </div>

      {/* Platform Settings */}
      <Card title="Platform Settings" subtitle="Control global platform behaviour">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--radius)] bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">Landing Page</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Show the public marketing page at healthcenter.lk
              </p>
            </div>
          </div>
          <button
            onClick={toggleLanding}
            disabled={landingToggling || loading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
              landingEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                landingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Recent Clinics */}
      <Card
        title="Recent Clinics"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/clinics')}>
            View all →
          </Button>
        }
        noPadding
      >
        {loading ? (
          <div className="p-5">
            <LoadingState message="Loading clinics..." />
          </div>
        ) : clinics.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clinics yet"
            description="Create your first clinic to get started."
          />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {clinics.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 px-5 cursor-pointer hover:bg-[var(--color-bg)] transition-colors"
                onClick={() => navigate(`/clinics/${c.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)] truncate">{c.clinic_name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {c.subdomain}.clinicpos.com · {c.active_flags} module{c.active_flags !== '1' ? 's' : ''} on
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-[var(--color-text-secondary)] hidden sm:inline">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <Badge status={c.status} label={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
