import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Ban, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminDashboardApi, adminTenantsApi } from '../api/admin';
import { StatCard, Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/Spinner';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats,   setStats]   = useState(null);
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [dashRes, clinicRes] = await Promise.all([
        adminDashboardApi.get(),
        adminTenantsApi.list(),
      ]);
      setStats(dashRes.data.data);
      setClinics(clinicRes.data.data.slice(0, 8));
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
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
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
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

      {/* Recent Clinics */}
      <Card
        title="Recent Clinics"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/clinics')}>
            View all →
          </Button>
        }
      >
        {loading ? (
          <LoadingState message="Loading clinics..." />
        ) : clinics.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400">
            <Building2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No clinics yet</p>
            <p className="text-xs mt-1">Create your first clinic to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 -mx-5">
            {clinics.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2.5 px-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => navigate(`/clinics/${c.id}`)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.clinic_name}</p>
                  <p className="text-xs text-gray-400">{c.subdomain}.clinicpos.com · {c.active_flags} module{c.active_flags !== '1' ? 's' : ''} on</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                  <Badge label={c.status} variant={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
