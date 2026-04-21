import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Users } from 'lucide-react';
import { PageLayout }       from '../../components/layout/PageLayout';
import { PageHeader }       from '../../components/ui/PageHeader';
import { Card }             from '../../components/ui/Card';
import { LoadingState }     from '../../components/ui/Spinner';
import { appointmentsApi }  from '../../api/appointments';
import { toInputDate }      from '../../utils/format';

export default function NurseDashboard() {
  const navigate = useNavigate();
  const today    = toInputDate(new Date());

  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await appointmentsApi.list({ date: today });
      setAppointments(res.data.data || []);
    } catch {
      if (!silent) setAppointments([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Arrived = waiting for doctor → nurse can prepare vitals
  const arrived   = appointments.filter(a => a.status === 'arrived');
  const waiting   = appointments.filter(a => ['pending','confirmed'].includes(a.status));
  const completed = appointments.filter(a => a.status === 'completed');

  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title="Nurse Station"
        subtitle={`Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Users}         iconColor="text-purple-600" iconBg="bg-purple-50" label="With Doctor" value={arrived.length} />
        <StatCard icon={ClipboardList} iconColor="text-amber-600"  iconBg="bg-amber-50"  label="Waiting"     value={waiting.length} />
        <StatCard icon={Users}         iconColor="text-green-600"  iconBg="bg-green-50"  label="Completed"   value={completed.length} />
      </div>

      <Card title="Patients In Clinic Today">
        {loading ? (
          <LoadingState message="Loading patients..." />
        ) : appointments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No patients today.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {appointments.map(appt => (
              <div
                key={appt.id}
                className="flex items-center gap-4 py-3 cursor-pointer hover:bg-[var(--color-bg)] -mx-4 px-4 transition-colors"
                onClick={() => navigate(`/patients/${appt.patient_id}`)}
              >
                {/* Token */}
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[var(--color-primary)]">{appt.token_number}</span>
                </div>
                {/* Patient */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors">
                    {appt.first_name} {appt.last_name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {appt.patient_code} · {appt.doctor_name}
                  </p>
                </div>
                {/* Time */}
                {appt.appointment_time && (
                  <p className="text-xs text-[var(--color-text-secondary)] shrink-0">
                    {appt.appointment_time.slice(0, 5)}
                  </p>
                )}
                {/* Status */}
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                  appt.status === 'arrived'   ? 'bg-purple-50 text-purple-700' :
                  appt.status === 'completed' ? 'bg-green-50 text-green-700'   :
                  'bg-amber-50 text-amber-700'
                }`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageLayout>
  );
}

function StatCard({ icon: Icon, iconColor, iconBg, label, value }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-[var(--color-text-secondary)] font-medium">{label}</p>
        <div className={`w-8 h-8 rounded-[var(--radius)] ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
    </div>
  );
}
