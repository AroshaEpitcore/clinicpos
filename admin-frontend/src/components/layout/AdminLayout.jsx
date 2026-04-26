import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, LogOut, Menu, Sun, Moon, CreditCard, RefreshCw, Settings,
  Activity, ScrollText, MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { useAdminAuth } from '../../store/AdminAuthContext';
import { useTheme } from '../../store/ThemeContext';
import { toast } from 'sonner';

const NAV_ITEMS = [
  { to: '/',                  label: 'Dashboard',          icon: LayoutDashboard, end: true },
  { to: '/clinics',           label: 'Clinics',            icon: Building2 },
  { to: '/plans',             label: 'Plans',              icon: CreditCard },
  { to: '/subscriptions',     label: 'Subscriptions',      icon: RefreshCw },
  { to: '/platform-settings', label: 'Platform Settings',  icon: Settings },
  { to: '/enquiries',         label: 'Enquiries',          icon: MessageSquare },
  { to: '/system-health',     label: 'System Health',      icon: Activity },
  { to: '/system-logs',       label: 'System Logs',        icon: ScrollText },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ collapsed }) {
  const { admin } = useAdminAuth();
  const initial   = (admin?.email?.charAt(0) || 'A').toUpperCase();

  return (
    <aside
      className="fixed top-0 left-0 h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col z-30 transition-[width] duration-300 ease-in-out overflow-hidden"
      style={{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Branding */}
      <div
        className="flex items-center gap-3 px-4 border-b border-[var(--color-border)] shrink-0"
        style={{ height: 'var(--topbar-height)' }}
      >
        <img src="/logosmall.png" alt="HealthCenter.lk" className="w-8 h-8 object-contain shrink-0" />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-[var(--color-text)] truncate leading-tight">ClinicPOS</p>
            <p className="text-xs text-[var(--color-text-secondary)]">Super Admin</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-colors mb-0.5',
                collapsed && 'justify-center',
                isActive
                  ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Admin info */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div className={clsx('flex items-center gap-3 px-2 py-2', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0">
            {initial}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[var(--color-text)] truncate">{admin?.email || 'Super Admin'}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">Super Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────────
function TopBar({ sidebarWidth, onToggle }) {
  const { logout } = useAdminAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function handleLogout() {
    logout();
    toast.success('Logged out');
    navigate('/login');
  }

  return (
    <header
      className="fixed top-0 right-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center z-20 transition-[left] duration-300 ease-in-out"
      style={{ left: sidebarWidth, height: 'var(--topbar-height)' }}
    >
      {/* Hamburger */}
      <button
        onClick={onToggle}
        title="Toggle sidebar"
        className="flex items-center justify-center shrink-0 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors border-r border-[var(--color-border)]"
        style={{ width: 'var(--topbar-height)', height: 'var(--topbar-height)' }}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <h2 className="flex-1 px-4 text-sm font-semibold text-[var(--color-text)] truncate">
        ClinicPOS Admin
      </h2>

      {/* Date & time */}
      <div className="hidden sm:flex flex-col items-end pr-4 leading-tight shrink-0">
        <span className="text-xs font-semibold text-[var(--color-text)] tabular-nums">{timeStr}</span>
        <span className="text-[11px] text-[var(--color-text-secondary)]">{dateStr}</span>
      </div>

      {/* Dark / light toggle */}
      <button
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors border-l border-[var(--color-border)]"
        style={{ width: 'var(--topbar-height)', height: 'var(--topbar-height)' }}
      >
        {dark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
      </button>

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Logout"
        className="flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] transition-colors border-l border-[var(--color-border)]"
        style={{ width: 'var(--topbar-height)', height: 'var(--topbar-height)' }}
      >
        <LogOut className="w-[18px] h-[18px]" />
      </button>
    </header>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────
export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('admin-sidebar-collapsed') === 'true'
  );

  function handleToggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('admin-sidebar-collapsed', String(next));
  }

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar collapsed={collapsed} />
      <TopBar sidebarWidth={sidebarWidth} onToggle={handleToggle} />
      <main
        className="pt-[var(--topbar-height)] transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
