import { NavLink, useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../store/PatientAuthContext';
import { useAuth } from '../../store/AuthContext';
import { mediaUrl } from '../../utils/mediaUrl';
import {
  LayoutDashboard, CalendarDays, FileText, FlaskConical,
  Receipt, User, LogOut, Stethoscope,
} from 'lucide-react';

const NAV = [
  { to: '/patient/dashboard',      label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/patient/appointments',   label: 'Appointments',  icon: CalendarDays    },
  { to: '/patient/consultations',  label: 'Visits',        icon: Stethoscope     },
  { to: '/patient/prescriptions',  label: 'Prescriptions', icon: FileText        },
  { to: '/patient/labs',           label: 'Lab Results',   icon: FlaskConical    },
  { to: '/patient/invoices',       label: 'Invoices',      icon: Receipt         },
  { to: '/patient/profile',        label: 'Profile',       icon: User            },
];

export default function PatientLayout({ children }) {
  const { patientName, logoutPatient } = usePatientAuth();
  const { clinic } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logoutPatient();
    navigate('/patient/login');
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface)] flex flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-30 bg-white border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {clinic?.logo_url
              ? <img src={mediaUrl(clinic.logo_url)} alt="" className="h-8 w-8 object-contain rounded" />
              : <div className="h-8 w-8 rounded bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-bold">P</div>
            }
            <div>
              <p className="text-xs font-bold text-[var(--color-ink)] leading-none">{clinic?.clinic_name || 'Clinic'}</p>
              <p className="text-[0.65rem] text-[var(--color-ink-light)] leading-none mt-0.5">Patient Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-ink-light)] hidden sm:block">Hi, <strong className="text-[var(--color-ink)]">{patientName}</strong></span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-[var(--color-ink-light)] hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 py-6 flex gap-6 flex-1">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col w-52 shrink-0 gap-0.5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-semibold'
                    : 'text-[var(--color-ink-light)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-ink)]'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Bottom tab bar — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-[var(--color-border)] flex">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[0.6rem] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-ink-faint)]'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      {/* Padding so content isn't hidden behind mobile tab bar */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
