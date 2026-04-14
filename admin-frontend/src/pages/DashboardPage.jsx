import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, Clock, Ban, DollarSign, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminDashboardApi, adminTenantsApi } from '../api/admin';
import { StatCard, Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats,    setStats]    = useState(null);
  const [clinics,  setClinics]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [dashRes, clinicRes] = await Promise.all([
        adminDashboardApi.get(),
        adminTenantsApi.list(),
      ]);
      setStats(dashRes.data.data);
      setClinics(clinicRes.data.data.slice(0, 8)); // show last 8
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of all clinics</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} loading={loading}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clinics"  value={stats?.total_clinics     ?? '—'} icon={Building2}    color="blue"   />
        <StatCard label="Active"         value={stats?.active_clinics    ?? '—'} icon={CheckCircle}  color="green"  sub="paid subscriptions" />
        <StatCard label="On Trial"       value={stats?.trial_clinics     ?? '—'} icon={Clock}        color="amber"  />
        <StatCard label="Suspended"      value={stats?.suspended_clinics ?? '—'} icon={Ban}          color="red"    />
      </div>

      {/* MRR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 opacity-80" />
            <span className="text-sm opacity-80">Monthly Recurring Revenue</span>
          </div>
          <p className="text-3xl font-bold">
            {stats ? `LKR ${Number(stats.mrr).toLocaleString()}` : '—'}
          </p>
          <p className="text-xs opacity-60 mt-1">from active subscriptions</p>
        </div>

        <div className="lg:col-span-2">
          <Card
            title="Recent Clinics"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/clinics')}>
                View all
              </Button>
            }
          >
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
            ) : clinics.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No clinics yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {clinics.map(c => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-gray-50 -mx-5 px-5 transition-colors"
                    onClick={() => navigate(`/clinics/${c.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.clinic_name}</p>
                      <p className="text-xs text-gray-400">{c.subdomain}.clinicpos.com</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge label={c.plan}   variant={c.plan} />
                      <Badge label={c.status} variant={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
