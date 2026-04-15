import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, User } from 'lucide-react';
import { PageLayout }       from '../../components/layout/PageLayout';
import { PageHeader }       from '../../components/ui/PageHeader';
import { Card }             from '../../components/ui/Card';
import { LoadingState }     from '../../components/ui/Spinner';
import { appointmentsApi }  from '../../api/appointments';
import { useAuth }          from '../../store/AuthContext';
import { toInputDate }      from '../../utils/format';

const STATUS_STYLES = {
  pending:   'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  arrived:   'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
};

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today    = toInputDate(new Date());

  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.list({ date: today, doctor_id: user?.id });
      setAppointments(res.data.data || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [today, user?.id]);

  useEffect(() => { load(); }, [load]);

  const total     = appointments.length;
  const arrived   = appointments.filter(a => a.status === 'arrived').length;
  const completed = appointments.filter(a => a.status === 'completed').length;
  const waiting   = appointments.filter(a => ['pending','confirmed'].includes(a.status)).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <PageLayout title="Dashboard">
      <PageHeader
        title={`${greeting}, Dr. ${user?.name}`}
        subtitle={`Today — ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        actions={
          <button
            onClick={() => navigate('/appointments')}
            className="px-4 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
          >
            Full Queue →
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar}     iconColor="text-blue-600"   iconBg="bg-blue-50"   label="Total Today"  value={total} />
        <StatCard icon={Clock}        iconColor="text-amber-600"  iconBg="bg-amber-50"  label="Waiting"      value={waiting} />
        <StatCard icon={User}         iconColor="text-purple-600" iconBg="bg-purple-50" label="Arrived"       value={arrived} />
        <StatCard icon={CheckCircle}  iconColor="text-green-600"  iconBg="bg-green-50"  label="Completed"     value={completed} />
      </div>

      <Card title="Today's Queue">
        {loading ? (
          <LoadingState message="Loading appointments..." />
        ) : appointments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">No appointments scheduled for today.</p>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--color-border)]">
            {appointments.map(appt => (
              <div
                key={appt.id}
                className="flex items-center gap-4 py-3 cursor-pointer hover:bg-[var(--color-bg)] -mx-4 px-4 transition-colors"
                onClick={() => navigate('/appointments')}
              >
                {/* Token */}
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[var(--color-primary)]">{appt.token_number}</span>
                </div>
                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] truncate">
                    {appt.first_name} {appt.last_name}
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    {appt.patient_code}
                    {appt.last_complaint ? ` · ${appt.last_complaint}` : ''}
                  </p>
                </div>
                {/* Time */}
                {appt.appointment_time && (
                  <p className="text-xs text-[var(--color-text-secondary)] shrink-0">
                    {appt.appointment_time.slice(0, 5)}
                  </p>
                )}
                {/* Status badge */}
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_STYLES[appt.status] || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]'}`}>
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
