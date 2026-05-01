import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import { usePatientAuth } from '../../store/PatientAuthContext';
import PatientLayout from './PatientLayout';
import { CalendarDays, Stethoscope, AlertCircle, ArrowRight } from 'lucide-react';

function formatCurrency(val) {
  return `LKR ${parseFloat(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

export default function PatientDashboard() {
  const { patientName } = usePatientAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientPortalApi.getSummary()
      .then(r => setSummary(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <PatientLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-black text-[var(--color-ink)]">{greeting}, {patientName} 👋</h1>
          <p className="text-sm text-[var(--color-ink-light)] mt-0.5">Your health summary at a glance</p>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Next appointment */}
            <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 flex flex-col gap-2 col-span-1 sm:col-span-2">
              <div className="flex items-center gap-2 text-[var(--color-primary)]">
                <CalendarDays className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Next Appointment</span>
              </div>
              {summary?.next_appointment ? (
                <>
                  <p className="text-lg font-black text-[var(--color-ink)]">
                    {format(new Date(summary.next_appointment.appointment_date), 'EEEE, d MMM yyyy')}
                  </p>
                  <p className="text-sm text-[var(--color-ink-light)]">
                    {summary.next_appointment.appointment_time
                      ? summary.next_appointment.appointment_time.slice(0, 5)
                      : 'Walk-in'
                    } · Dr. {summary.next_appointment.doctor_name}
                  </p>
                  <Link to="/patient/appointments"
                    className="mt-1 text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:underline">
                    View details <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-[var(--color-ink-light)]">No upcoming appointments</p>
                  <a href="/book" className="text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:underline">
                    Book now <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Outstanding balance */}
            <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-2 ${summary?.outstanding_balance > 0 ? 'border-amber-200 bg-amber-50' : 'border-[var(--color-border)]'}`}>
              <div className={`flex items-center gap-2 ${summary?.outstanding_balance > 0 ? 'text-amber-600' : 'text-[var(--color-ink-faint)]'}`}>
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">Balance Due</span>
              </div>
              <p className={`text-xl font-black ${summary?.outstanding_balance > 0 ? 'text-amber-700' : 'text-[var(--color-ink-faint)]'}`}>
                {formatCurrency(summary?.outstanding_balance)}
              </p>
              {summary?.outstanding_balance > 0 && (
                <Link to="/patient/invoices" className="text-xs text-amber-600 font-semibold flex items-center gap-1 hover:underline">
                  View invoices <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Last visit */}
        {!loading && summary?.last_visit && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 text-[var(--color-ink-light)] mb-3">
              <Stethoscope className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Last Visit</span>
            </div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">
              {format(new Date(summary.last_visit.created_at), 'd MMM yyyy')} · Dr. {summary.last_visit.doctor_name}
            </p>
            {summary.last_visit.chief_complaint && (
              <p className="text-sm text-[var(--color-ink-light)] mt-1">{summary.last_visit.chief_complaint}</p>
            )}
            {summary.last_visit.diagnosis && (
              <p className="text-xs text-[var(--color-ink-faint)] mt-0.5">Diagnosis: {summary.last_visit.diagnosis}</p>
            )}
            <Link to="/patient/consultations" className="mt-3 text-xs text-[var(--color-primary)] font-semibold flex items-center gap-1 hover:underline">
              Full visit history <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: '/patient/prescriptions', label: 'Prescriptions', color: 'bg-blue-50 text-blue-700 border-blue-100' },
            { to: '/patient/labs',          label: 'Lab Results',   color: 'bg-purple-50 text-purple-700 border-purple-100' },
            { to: '/patient/invoices',      label: 'Invoices',      color: 'bg-green-50 text-green-700 border-green-100' },
            { to: '/patient/profile',       label: 'My Profile',    color: 'bg-gray-50 text-gray-700 border-gray-100' },
          ].map(q => (
            <Link
              key={q.to}
              to={q.to}
              className={`${q.color} rounded-xl border p-4 text-sm font-semibold flex items-center justify-between hover:opacity-80 transition-opacity`}
            >
              {q.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      </div>
    </PatientLayout>
  );
}
