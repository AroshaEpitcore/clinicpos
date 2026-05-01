import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import { usePatientAuth } from '../../store/PatientAuthContext';
import PatientLayout from './PatientLayout';
import {
  CalendarDays, Stethoscope, AlertTriangle, ArrowRight,
  FileText, FlaskConical, Receipt, User, CheckCircle,
} from 'lucide-react';

function fmt(v) {
  return `LKR ${parseFloat(v || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
}

const QUICK_LINKS = [
  { to: '/patient/prescriptions', label: 'Prescriptions', icon: FileText,     bg: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-600'   },
  { to: '/patient/labs',          label: 'Lab Results',   icon: FlaskConical, bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
  { to: '/patient/invoices',      label: 'Invoices',      icon: Receipt,      bg: 'bg-green-500',  light: 'bg-green-50',  text: 'text-green-600'  },
  { to: '/patient/profile',       label: 'My Profile',    icon: User,         bg: 'bg-gray-500',   light: 'bg-gray-50',   text: 'text-gray-600'   },
];

export default function PatientDashboard() {
  const { patientName } = usePatientAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    patientPortalApi.getSummary()
      .then(r => setSummary(r.data.data))
      .catch(() => { toast.error("Something went wrong. Please try again."); })
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <PatientLayout>
      <div className="space-y-4">

        {/* ── Greeting banner ─────────────────────────────────────────────── */}
        <div className="rounded-[var(--radius-lg)] p-5 text-white bg-[var(--color-primary)]">
          <p className="text-sm font-medium text-blue-100">{greeting}</p>
          <h1 className="text-xl font-black mt-0.5">{patientName}</h1>
          <p className="text-sm text-blue-100 mt-1">Here's your health summary</p>
        </div>

        {/* ── Summary cards ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 animate-pulse">
                <div className="h-3 bg-gray-100 rounded w-24 mb-3" />
                <div className="h-5 bg-gray-100 rounded w-40 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Next appointment */}
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--color-primary-light)] flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">Next Appointment</span>
              </div>
              {summary?.next_appointment ? (
                <>
                  <p className="text-base font-black text-[var(--color-text)]">
                    {format(new Date(summary.next_appointment.appointment_date), 'EEE, d MMM yyyy')}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
                    {summary.next_appointment.appointment_time
                      ? summary.next_appointment.appointment_time.slice(0, 5) + ' · '
                      : 'Walk-in · '
                    }
                    Dr. {summary.next_appointment.doctor_name}
                  </p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] capitalize">
                      {summary.next_appointment.status}
                    </span>
                  </div>
                  <Link to="/patient/appointments"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
                    View details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              ) : (
                <div>
                  <p className="text-sm text-[var(--color-text-secondary)]">No upcoming appointments</p>
                  <a href="/book"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
                    Book now <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Balance */}
            <div className={`rounded-[var(--radius-lg)] border p-5 ${
              summary?.outstanding_balance > 0
                ? 'bg-amber-50 border-amber-200'
                : 'bg-[var(--color-surface)] border-[var(--color-border)]'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-[var(--radius)] flex items-center justify-center ${
                  summary?.outstanding_balance > 0 ? 'bg-amber-100' : 'bg-green-50'
                }`}>
                  {summary?.outstanding_balance > 0
                    ? <AlertTriangle className="w-4 h-4 text-amber-600" />
                    : <CheckCircle className="w-4 h-4 text-green-500" />
                  }
                </div>
                <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">Balance Due</span>
              </div>
              <p className={`text-xl font-black ${summary?.outstanding_balance > 0 ? 'text-amber-700' : 'text-green-600'}`}>
                {fmt(summary?.outstanding_balance)}
              </p>
              {summary?.outstanding_balance > 0 ? (
                <Link to="/patient/invoices"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
                  Pay now <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <p className="text-xs text-green-600 mt-1 font-medium">All clear — no outstanding balance</p>
              )}
            </div>
          </div>
        )}

        {/* ── Last visit ──────────────────────────────────────────────────── */}
        {!loading && summary?.last_visit && (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-[var(--radius)] bg-purple-50 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">Last Visit</span>
            </div>
            <p className="text-sm font-bold text-[var(--color-text)]">
              {format(new Date(summary.last_visit.created_at), 'd MMM yyyy')} · Dr. {summary.last_visit.doctor_name}
            </p>
            {summary.last_visit.chief_complaint && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{summary.last_visit.chief_complaint}</p>
            )}
            {summary.last_visit.diagnosis && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">Diagnosis: {summary.last_visit.diagnosis}</p>
            )}
            <Link to="/patient/consultations"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-primary)] hover:underline">
              Full history <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── Quick links grid ─────────────────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3 px-0.5">Quick Access</p>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LINKS.map(q => (
              <Link
                key={q.to}
                to={q.to}
                className={`${q.light} rounded-[var(--radius-lg)] border border-transparent p-4 flex items-center gap-3 hover:opacity-80 active:scale-[0.98] transition-all`}
              >
                <div className={`w-10 h-10 rounded-[var(--radius)] ${q.bg} flex items-center justify-center shadow-sm shrink-0`}>
                  <q.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-sm font-bold ${q.text}`}>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </PatientLayout>
  );
}




