import { Link, NavLink, useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../store/PatientAuthContext';
import { useAuth } from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { mediaUrl } from '../../utils/mediaUrl';
import {
  LayoutDashboard, CalendarDays, FileText, FlaskConical,
  Receipt, User, LogOut, Stethoscope, Sun, Moon,
} from 'lucide-react';

const BOTTOM_NAV = [
  { to: '/patient/dashboard',     label: 'Home',    icon: LayoutDashboard },
  { to: '/patient/appointments',  label: 'Appts',   icon: CalendarDays    },
  { to: '/patient/consultations', label: 'Visits',  icon: Stethoscope     },
  { to: '/patient/prescriptions', label: 'Rx',      icon: FileText        },
  { to: '/patient/profile',       label: 'Profile', icon: User            },
];

const SIDEBAR_NAV = [
  { to: '/patient/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/patient/appointments',  label: 'Appointments',  icon: CalendarDays    },
  { to: '/patient/consultations', label: 'Visit History', icon: Stethoscope     },
  { to: '/patient/prescriptions', label: 'Prescriptions', icon: FileText        },
  { to: '/patient/labs',          label: 'Lab Results',   icon: FlaskConical    },
  { to: '/patient/invoices',      label: 'Invoices',      icon: Receipt         },
  { to: '/patient/profile',       label: 'Profile',       icon: User            },
];

export default function PatientLayout({ children }) {
  const { patientName, logoutPatient } = usePatientAuth();
  const { clinic } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  function handleLogout() {
    logoutPatient();
    navigate('/patient/login');
  }

  const initial = patientName?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link to="/patient/dashboard" className="flex items-center gap-2.5 min-w-0">
            {clinic?.logo_url
              ? <img src={mediaUrl(clinic.logo_url)} alt="" className="h-8 w-8 object-contain rounded-[var(--radius)] shrink-0" />
              : <div className="h-8 w-8 rounded-[var(--radius)] bg-[var(--color-primary)] flex items-center justify-center text-white text-xs font-black shrink-0">
                  {clinic?.clinic_name?.[0]?.toUpperCase() || 'C'}
                </div>
            }
            <div className="leading-none min-w-0">
              <p className="text-xs font-bold text-[var(--color-text)] truncate">{clinic?.clinic_name || 'Clinic'}</p>
              <p className="text-[0.6rem] text-[var(--color-text-secondary)] mt-0.5">Patient Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:block text-sm text-[var(--color-text-secondary)] mr-1">
              Hi, <strong className="text-[var(--color-text)]">{patientName}</strong>
            </span>
            <div className="sm:hidden w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-black">
              {initial}
            </div>
            <button
              onClick={toggle}
              className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-4 py-5 flex gap-5 flex-1">

        {/* Sidebar — desktop only */}
        <aside className="hidden md:flex flex-col w-52 shrink-0">
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-2 space-y-0.5 sticky top-20">
            {SIDEBAR_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white shadow-sm'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
            <div className="pt-1 mt-1 border-t border-[var(--color-border)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* ── Bottom tab bar — mobile ──────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)]">
        <div className="flex h-[60px] px-1">
          {BOTTOM_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${
                  isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`px-3 py-1 rounded-[var(--radius)] transition-all ${isActive ? 'bg-[var(--color-primary-light)]' : ''}`}>
                    <Icon className="w-[22px] h-[22px]" />
                  </div>
                  <span className="text-[0.57rem] font-semibold leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="h-[60px] md:hidden" />
    </div>
  );
}
