import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { CalendarDays, X, BookOpen } from 'lucide-react';

const STATUS_STYLE = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  arrived:   'bg-purple-100 text-purple-700 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
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
    a.status !== 'cancelled' && a.status !== 'completed'
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
        <h1 className="text-lg font-black text-[var(--color-text)]">Appointments</h1>

        {/* Tab switcher */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {[
            { key: 'upcoming', label: `Upcoming`, count: upcoming.length },
            { key: 'past',     label: `Past`,     count: past.length     },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.key
                  ? 'bg-white text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-text-secondary)]'
              }`}
            >
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.key ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]' : 'bg-gray-200 text-gray-500'
              }`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 animate-pulse flex gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-32" />
                  <div className="h-3 bg-gray-100 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">No {tab} appointments</p>
            {tab === 'upcoming' && (
              <a href="/book" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary)] hover:underline">
                <BookOpen className="w-4 h-4" /> Book an appointment
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(a => (
              <div key={a.id} className="bg-white rounded-2xl border border-[var(--color-border)] p-4 flex items-start gap-3">
                {/* Date badge */}
                <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                  style={{ background: 'var(--color-primary-light)' }}>
                  <span className="text-[0.6rem] font-bold leading-none" style={{ color: 'var(--color-primary)' }}>
                    {format(new Date(a.appointment_date), 'MMM').toUpperCase()}
                  </span>
                  <span className="text-lg font-black leading-tight" style={{ color: 'var(--color-primary)' }}>
                    {format(new Date(a.appointment_date), 'd')}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--color-text)]">Dr. {a.doctor_name}</p>
                  {a.specialization && (
                    <p className="text-xs text-[var(--color-text-secondary)]">{a.specialization}</p>
                  )}
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    {format(new Date(a.appointment_date), 'EEEE, d MMMM yyyy')}
                    {a.appointment_time ? ` · ${a.appointment_time.slice(0, 5)}` : ''}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {a.status}
                    </span>
                    {a.token_number && (
                      <span className="text-xs text-[var(--color-text-secondary)] bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
                        Token #{a.token_number}
                      </span>
                    )}
                    {a.booking_reference && (
                      <span className="text-xs text-[var(--color-text-secondary)]">{a.booking_reference}</span>
                    )}
                  </div>
                </div>

                {['pending', 'confirmed'].includes(a.status) &&
                  new Date(a.appointment_date).toISOString().split('T')[0] >= today && (
                  <button
                    onClick={() => handleCancel(a.id)}
                    disabled={cancelling === a.id}
                    className="shrink-0 w-8 h-8 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-50"
                    title="Cancel appointment"
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

