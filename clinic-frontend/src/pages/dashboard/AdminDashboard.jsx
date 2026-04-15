import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, FileText, CheckCircle } from 'lucide-react';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { Card }         from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/Spinner';
import { reportsApi }   from '../../api/reports';
import { formatCurrency, toInputDate } from '../../utils/format';

export default function AdminDashboard() {
  const navigate  = useNavigate();
  const today     = toInputDate(new Date());
  const now       = new Date();

  const [daily,   setDaily]   = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;

    Promise.all([
      reportsApi.daily(today),
      reportsApi.monthly(year, month),
      reportsApi.doctors(today, today),
    ]).then(([d, m, doc]) => {
      setDaily(d.data.data);
      setMonthly(m.data.data?.daily || []);
      setDoctors(doc.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const rev  = daily?.revenue  || {};
  const appt = daily?.appointments || {};

  const eodLabel = (() => {
    if (!daily) return '—';
    if (parseFloat(rev.outstanding || 0) === 0 && parseInt(appt.total || 0) > 0) return 'Clear';
    if (parseFloat(rev.outstanding || 0) > 0) return 'Open';
    return '—';
  })();

  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title="Admin Overview"
        subtitle={`Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
          >
            Full Reports →
          </button>
        }
      />

      {loading ? <LoadingState message="Loading dashboard..." /> : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={TrendingUp} iconColor="text-blue-600" iconBg="bg-blue-50"
              label="Total Billed" value={formatCurrency(rev.total_billed)} sub="Today"
            />
            <StatCard
              icon={CheckCircle} iconColor="text-green-600" iconBg="bg-green-50"
              label="Collected" value={formatCurrency(rev.total_collected)} sub="Today"
            />
            <StatCard
              icon={Users} iconColor="text-purple-600" iconBg="bg-purple-50"
              label="Patients Today" value={appt.total || '0'} sub={`${appt.completed || 0} completed`}
            />
            <StatCard
              icon={FileText} iconColor="text-amber-600" iconBg="bg-amber-50"
              label="EOD Status" value={eodLabel}
              sub={parseFloat(rev.outstanding || 0) > 0 ? `${formatCurrency(rev.outstanding)} outstanding` : 'All settled'}
            />
          </div>

          <div className="grid grid-cols-5 gap-6">
            {/* Monthly chart */}
            <div className="col-span-3">
              <Card title={`Revenue — ${now.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}`}>
                {monthly.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No invoices this month yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={50}
                        tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                      <Tooltip
                        formatter={(v, name) => [formatCurrency(v), name === 'billed' ? 'Billed' : 'Collected']}
                        labelFormatter={l => `Day ${l}`}
                        contentStyle={{ fontSize: 11, borderRadius: 6 }}
                      />
                      <Bar dataKey="billed"    name="billed"    fill="#bfdbfe" radius={[2,2,0,0]} />
                      <Bar dataKey="collected" name="collected" fill="#2563eb" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>

            {/* Doctor performance */}
            <div className="col-span-2">
              <Card title="Doctors Today">
                {doctors.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No consultations today.</p>
                ) : (
                  <div className="flex flex-col divide-y divide-[var(--color-border)]">
                    {doctors.map(dr => (
                      <div key={dr.doctor_id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">{dr.doctor_name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{dr.consultations} consults · {dr.patients_seen} patients</p>
                        </div>
                        <p className="text-sm font-bold text-[var(--color-success)]">{formatCurrency(dr.revenue_collected)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Today's appointment summary strip */}
          {parseInt(appt.total || 0) > 0 && (
            <div className="mt-4 grid grid-cols-5 gap-3">
              {[
                { label: 'Total',     value: appt.total     || 0, color: 'text-[var(--color-text)]' },
                { label: 'Waiting',   value: appt.waiting   || 0, color: 'text-amber-600' },
                { label: 'Arrived',   value: appt.arrived   || 0, color: 'text-blue-600' },
                { label: 'Completed', value: appt.completed || 0, color: 'text-green-600' },
                { label: 'Cancelled', value: appt.cancelled || 0, color: 'text-red-500' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[var(--color-surface)] rounded-[var(--radius)] border border-[var(--color-border)] px-4 py-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-[var(--radius)] ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{sub}</p>}
    </div>
  );
}
