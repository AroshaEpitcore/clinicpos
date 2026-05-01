import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { CalendarDays, X } from 'lucide-react';

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  arrived:   'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [cancelling,   setCancelling]   = useState(null);
  const [tab,          setTab]          = useState('upcoming');

  async function load() {
    try {
      const r = await patientPortalApi.getAppointments();
      setAppointments(r.data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = appointments.filter(a =>
    new Date(a.appointment_date).toISOString().split('T')[0] >= today &&
    a.status !== 'cancelled'
  );
  const past = appointments.filter(a =>
    new Date(a.appointment_date).toISOString().split('T')[0] < today ||
    a.status === 'cancelled' || a.status === 'completed'
  );

  async function handleCancel(id) {
    if (!confirm('Cancel this appointment?')) return;
    setCancelling(id);
    try {
      await patientPortalApi.cancelAppointment(id);
      toast.success('Appointment cancelled');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel');
    } finally {
      setCancelling(null);
    }
  }

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-ink)]">Appointments</h1>

        <div className="flex gap-1 bg-[var(--color-surface-alt)] rounded-lg p-1 w-fit">
          {['upcoming', 'past'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                tab === t ? 'bg-white text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-light)]'
              }`}
            >
              {t} {t === 'upcoming' ? `(${upcoming.length})` : `(${past.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <CalendarDays className="w-8 h-8 text-[var(--color-ink-faint)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-ink-light)]">No {tab} appointments</p>
            {tab === 'upcoming' && (
              <a href="/book" className="mt-3 inline-block text-sm text-[var(--color-primary)] font-semibold hover:underline">
                Book an appointment
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[var(--color-primary)] leading-none">
                    {format(new Date(a.appointment_date), 'MMM')}
                  </span>
                  <span className="text-lg font-black text-[var(--color-primary)] leading-none">
                    {format(new Date(a.appointment_date), 'd')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">Dr. {a.doctor_name}</span>
                    {a.specialization && <span className="text-xs text-[var(--color-ink-faint)]">· {a.specialization}</span>}
                  </div>
                  <p className="text-xs text-[var(--color-ink-light)] mt-0.5">
                    {format(new Date(a.appointment_date), 'EEEE, d MMMM yyyy')}
                    {a.appointment_time && ` · ${a.appointment_time.slice(0, 5)}`}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-600'}`}>
                      {a.status}
                    </span>
                    {a.token_number && (
                      <span className="text-xs text-[var(--color-ink-faint)]">Token #{a.token_number}</span>
                    )}
                    {a.booking_reference && (
                      <span className="text-xs text-[var(--color-ink-faint)]">{a.booking_reference}</span>
                    )}
                  </div>
                </div>
                {['pending', 'confirmed'].includes(a.status) &&
                  new Date(a.appointment_date).toISOString().split('T')[0] >= today && (
                  <button
                    onClick={() => handleCancel(a.id)}
                    disabled={cancelling === a.id}
                    className="shrink-0 p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
