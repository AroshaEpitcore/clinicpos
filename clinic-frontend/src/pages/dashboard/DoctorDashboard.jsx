import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, User, Globe, ChevronRight, AlertTriangle, Zap } from 'lucide-react';
import { PageLayout }       from '../../components/layout/PageLayout';
import { PageHeader }       from '../../components/ui/PageHeader';
import { Card }             from '../../components/ui/Card';
import { LoadingState }     from '../../components/ui/Spinner';
import { appointmentsApi }  from '../../api/appointments';
import { useAuth }          from '../../store/AuthContext';
import { toInputDate }      from '../../utils/format';
import { AnnouncementBanner } from '../../components/ui/AnnouncementBanner';

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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await appointmentsApi.list({ date: today, doctor_id: user?.id });
      setAppointments(res.data.data || []);
    } catch {
      if (!silent) setAppointments([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [today, user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  // Derive queue state
  const allActive   = appointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const currentPt   = appointments.find(a => a.status === 'arrived');
  const waiting     = allActive.filter(a => ['pending', 'confirmed'].includes(a.status));
  const nextUp      = waiting[0] || null;
  const completed   = appointments.filter(a => a.status === 'completed').length;
  const total       = appointments.length;
  const onlineCount = appointments.filter(a => a.booked_online).length;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <PageLayout title="Dashboard">
      <AnnouncementBanner />
      <PageHeader
        title={`${greeting}, ${user?.name}`}
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Calendar}    iconColor="text-blue-600"   iconBg="bg-blue-50"   label="Total Today"  value={total} />
        <StatCard icon={Clock}       iconColor="text-amber-600"  iconBg="bg-amber-50"  label="Waiting"      value={waiting.length} />
        <StatCard icon={CheckCircle} iconColor="text-green-600"  iconBg="bg-green-50"  label="Completed"    value={completed} />
        <StatCard icon={Globe}       iconColor="text-indigo-600" iconBg="bg-indigo-50" label="Online Booked" value={onlineCount} />
      </div>

      {loading ? (
        <LoadingState message="Loading today's queue..." />
      ) : (
        <>
          {/* Current + Next row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Current patient */}
            <div className={`rounded-[var(--radius-lg)] border-2 p-5 ${
              currentPt
                ? 'border-purple-400 bg-purple-50'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${currentPt ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700">
                  {currentPt ? 'Now Seeing' : 'No Current Patient'}
                </p>
              </div>
              {currentPt ? (
                <PatientMini appt={currentPt} />
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Mark a patient as &quot;Arrived&quot; to see them here.
                </p>
              )}
            </div>

            {/* Next up */}
            <div className={`rounded-[var(--radius-lg)] border-2 p-5 ${
              nextUp
                ? 'border-amber-300 bg-amber-50'
                : 'border-[var(--color-border)] bg-[var(--color-surface)]'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <ChevronRight className={`w-3.5 h-3.5 ${nextUp ? 'text-amber-600' : 'text-gray-400'}`} />
                <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  {nextUp ? 'Next Up' : 'Queue Empty'}
                </p>
              </div>
              {nextUp ? (
                <PatientMini appt={nextUp} />
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {waiting.length === 0 && completed > 0
                    ? 'All patients seen for today.'
                    : 'No patients waiting.'}
                </p>
              )}
            </div>
          </div>

          {/* Remaining queue */}
          {waiting.length > 1 && (
            <Card title={`Waiting Queue (${waiting.length - 1} more after next)`}>
              <div className="flex flex-col divide-y divide-[var(--color-border)]">
                {waiting.slice(1).map(appt => (
                  <QueueRow key={appt.id} appt={appt} navigate={navigate} />
                ))}
              </div>
            </Card>
          )}

          {appointments.length === 0 && (
            <Card>
              <p className="text-sm text-[var(--color-text-secondary)] py-8 text-center">
                No appointments scheduled for today.
              </p>
            </Card>
          )}
        </>
      )}
    </PageLayout>
  );
}

function PatientMini({ appt }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <p className="font-bold text-[var(--color-text)]">{appt.patient_name}</p>
        {appt.booked_online && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            <Globe className="w-3 h-3" /> Online
          </span>
        )}
        {appt.type === 'emergency' && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            <Zap className="w-3 h-3" /> Emergency
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-secondary)]">{appt.patient_code}</p>
      <div className="flex items-center gap-3 mt-1.5">
        {appt.token_number && (
          <span className="text-xs font-semibold text-[var(--color-primary)]">#{appt.token_number}</span>
        )}
        {appt.appointment_time && (
          <span className="text-xs text-[var(--color-text-secondary)] flex items-center gap-0.5">
            <Clock className="w-3 h-3" />{appt.appointment_time.slice(0, 5)}
          </span>
        )}
        {appt.booking_reference && (
          <span className="text-xs font-mono text-blue-600">{appt.booking_reference}</span>
        )}
      </div>
      {appt.last_complaint && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-1 truncate" title={appt.last_complaint}>
          Last: {appt.last_complaint}
        </p>
      )}
      {appt.patient_allergies && (
        <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Allergies: {appt.patient_allergies}
        </p>
      )}
    </div>
  );
}

function QueueRow({ appt, navigate }) {
  return (
    <div
      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-[var(--color-bg)] -mx-4 px-4 transition-colors"
      onClick={() => navigate('/appointments')}
    >
      <div className="w-7 h-7 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-[var(--color-primary)]">
          {appt.type === 'emergency' ? '!' : (appt.token_number ?? '—')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{appt.patient_name}</p>
          {appt.booked_online && (
            <Globe className="w-3 h-3 text-blue-500 shrink-0" title="Online booking" />
          )}
        </div>
        {appt.appointment_time && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            <Clock className="w-3 h-3 inline mr-0.5" />{appt.appointment_time.slice(0, 5)}
          </p>
        )}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize shrink-0 ${
        STATUS_STYLES[appt.status] || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
      }`}>
        {appt.status}
      </span>
    </div>
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
