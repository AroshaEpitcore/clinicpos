import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, FlaskConical, Pill, AlertTriangle, Zap,
  Globe, Clock, CheckCircle2, User, RefreshCw, ChevronRight,
} from 'lucide-react';
import { PageLayout }        from '../../components/layout/PageLayout';
import { PageHeader }        from '../../components/ui/PageHeader';
import { AnnouncementBanner }from '../../components/ui/AnnouncementBanner';
import { LoadingState }      from '../../components/ui/Spinner';
import { appointmentsApi }   from '../../api/appointments';

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 86_400_000);
  if (diff === 0) return 'today';
  if (diff === 1) return '1 day ago';
  return `${diff} days ago`;
}

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const STATUS_STYLE = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  confirmed: 'bg-blue-100  text-blue-700  dark:bg-blue-900/30  dark:text-blue-400',
  arrived:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const LAB_STATUS_STYLE = {
  pending:   'bg-amber-100 text-amber-700',
  collected: 'bg-blue-100  text-blue-700',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-[var(--color-primary)]" />
        <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
        {count != null && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            {count}
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

function AppointmentCard({ appt }) {
  const isEmergency = appt.type === 'emergency';
  const isOnline    = appt.booked_online || appt.booking_source === 'online';
  const hasSeen     = !!appt.consultation_id;
  const hasRx       = !!appt.prescription_id;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border transition-colors
      ${isEmergency
        ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
        : appt.status === 'arrived'
          ? 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
      }`}
    >
      {/* Token */}
      <div className={`w-10 h-10 rounded-[var(--radius)] flex items-center justify-center text-sm font-bold shrink-0
        ${isEmergency ? 'bg-red-500 text-white' : 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'}`}
      >
        {appt.token_number ?? '—'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-[var(--color-text)] truncate">{appt.patient_name}</span>
          <span className="text-xs text-[var(--color-text-secondary)]">{appt.patient_code}</span>
          {isEmergency && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-red-500 text-white">
              <Zap className="w-3 h-3" /> Emergency
            </span>
          )}
          {isOnline && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              <Globe className="w-3 h-3" /> Online
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {appt.appointment_time && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
              <Clock className="w-3 h-3" />{fmtTime(appt.appointment_time)}
            </span>
          )}
          {appt.reason && (
            <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[200px]">
              {appt.reason}
            </span>
          )}
        </div>

        {appt.patient_allergies && (
          <div className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="truncate">{appt.patient_allergies}</span>
          </div>
        )}

        {appt.notes && (
          <p className="mt-1 text-xs text-[var(--color-text-secondary)] italic truncate">
            Note: {appt.notes}
          </p>
        )}
      </div>

      {/* Status + indicators */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[appt.status] || ''}`}>
          {appt.status}
        </span>
        <div className="flex gap-1">
          {hasSeen && (
            <span title="Consultation done" className="p-1 rounded bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
            </span>
          )}
          {hasRx && (
            <span title="Prescription written" className="p-1 rounded bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Pill className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyDayPage() {
  const navigate = useNavigate();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apptFilter, setApptFilter] = useState('all');

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const load = useCallback(async (silent = false) => {
    try {
      const res = await appointmentsApi.myDay();
      setData(res.data.data);
      setLastUpdate(new Date());
    } catch {
      // keep stale data on silent refresh error
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const appointments = data?.appointments || [];
  const labPending   = data?.lab_pending  || [];
  const rxToday      = data?.rx_today     || [];

  const apptCounts = {
    all:       appointments.length,
    waiting:   appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
    arrived:   appointments.filter(a => a.status === 'arrived').length,
    completed: appointments.filter(a => a.status === 'completed').length,
  };

  const filteredAppts = appointments.filter(a => {
    if (apptFilter === 'waiting')   return a.status === 'pending' || a.status === 'confirmed';
    if (apptFilter === 'arrived')   return a.status === 'arrived';
    if (apptFilter === 'completed') return a.status === 'completed';
    return true;
  });

  const APPT_TABS = [
    { key: 'all',       label: 'All' },
    { key: 'waiting',   label: 'Waiting' },
    { key: 'arrived',   label: 'Ready' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <PageLayout title="My Day">
      <AnnouncementBanner />
      <PageHeader
        title="My Day"
        subtitle={today}
        actions={
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        }
      />

      {lastUpdate && (
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
          Last updated {lastUpdate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          {' · '}auto-refreshes every 30s
        </p>
      )}

      {loading ? (
        <LoadingState />
      ) : (
        <div className="flex flex-col gap-6">

          {/* ── Today's Schedule ─────────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={Calendar}
              title="Today's Schedule"
              count={apptCounts.all}
            />

            {/* Status tabs */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {APPT_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setApptFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    apptFilter === tab.key
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-75">{apptCounts[tab.key]}</span>
                </button>
              ))}
            </div>

            {filteredAppts.length === 0 ? (
              <div className="py-10 text-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                {apptCounts.all === 0 ? 'No appointments scheduled for today' : 'No appointments in this category'}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredAppts.map(appt => (
                  <AppointmentCard key={appt.id} appt={appt} />
                ))}
              </div>
            )}

            {apptCounts.all > 0 && (
              <button
                onClick={() => navigate('/appointments')}
                className="mt-3 flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
              >
                Open Appointments page <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </section>

          {/* ── Pending Lab Results ───────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={FlaskConical}
              title="Awaiting Lab Results"
              count={labPending.length}
              action={
                labPending.length > 0 && (
                  <button
                    onClick={() => navigate('/lab')}
                    className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View in Lab <ChevronRight className="w-3 h-3" />
                  </button>
                )
              }
            />

            {labPending.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No pending lab results
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {labPending.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[var(--color-text)]">{item.test_name}</span>
                        {item.test_code && (
                          <span className="text-xs text-[var(--color-text-secondary)]">{item.test_code}</span>
                        )}
                        {item.category && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">{item.patient_name}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">·</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{item.patient_code}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${LAB_STATUS_STYLE[item.status] || ''}`}>
                        {item.status}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{daysAgo(item.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Today's Prescriptions ────────────────────────────────────── */}
          <section>
            <SectionHeader
              icon={Pill}
              title="Today's Prescriptions"
              count={rxToday.length}
              action={
                rxToday.length > 0 && (
                  <button
                    onClick={() => navigate('/prescriptions')}
                    className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                )
              }
            />

            {rxToday.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                <Pill className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No prescriptions written today
              </div>
            ) : (
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {rxToday.map(rx => (
                  <div key={rx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
                      <Pill className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--color-text)]">{rx.rx_number}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">
                          {rx.item_count} medicine{rx.item_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-[var(--color-text-secondary)]">{rx.patient_name}</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">·</span>
                        <span className="text-xs text-[var(--color-text-secondary)]">{rx.patient_code}</span>
                      </div>
                      {rx.notes && (
                        <p className="text-xs text-[var(--color-text-secondary)] italic mt-0.5 truncate">{rx.notes}</p>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)] shrink-0">
                      {new Date(rx.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </PageLayout>
  );
}
