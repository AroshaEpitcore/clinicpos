import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, ClipboardList,
  Pill, Receipt, Package, FlaskConical, BarChart2,
  Settings, Stethoscope, Shield, UserCog, CreditCard,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth }   from '../../store/AuthContext';
import { mediaUrl }  from '../../utils/mediaUrl';

const NAV_ITEMS = [
  { label: 'Dashboard',     icon: LayoutDashboard, href: '/dashboard',     roles: ['doctor', 'receptionist', 'nurse', 'admin'] },
  { label: 'Patients',      icon: Users,            href: '/patients',      roles: ['receptionist', 'doctor', 'nurse', 'admin'] },
  { label: 'Appointments',  icon: Calendar,         href: '/appointments',  roles: ['receptionist', 'doctor', 'admin'] },
  { label: 'Consultations', icon: Stethoscope,      href: '/consultations', roles: ['doctor', 'admin'] },
  { label: 'Prescriptions', icon: Pill,             href: '/prescriptions', roles: ['doctor', 'nurse', 'receptionist', 'admin'] },
  { label: 'Medicine Store',icon: Package,          href: '/medicines',     roles: ['admin'] },
  { label: 'Billing',       icon: Receipt,          href: '/billing',       roles: ['receptionist', 'admin'] },
  { label: 'Pharmacy',      icon: Package,          href: '/pharmacy',      roles: ['receptionist', 'admin'],         flag: 'pharmacy' },
  { label: 'Lab',           icon: FlaskConical,     href: '/lab',           roles: ['doctor', 'nurse', 'admin', 'receptionist'], flag: 'lab' },
  { label: 'Insurance',    icon: Shield,           href: '/insurance',     roles: ['receptionist', 'admin', 'doctor'],          flag: 'insurance' },
  { label: 'Staff',         icon: UserCog,          href: '/staff',         roles: ['admin'] },
  { label: 'Reports',        icon: BarChart2,   href: '/reports',       roles: ['admin'] },
  { label: 'Settings',       icon: Settings,    href: '/settings',      roles: ['admin'] },
  { label: 'Subscription',   icon: CreditCard,  href: '/subscription',  roles: ['admin'] },
];

export function Sidebar({ collapsed }) {
  const { user, tenantFlags, clinic } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => {
    if (!item.roles.includes(user?.role)) return false;
    if (item.flag && !tenantFlags[item.flag])  return false;
    return true;
  });

  return (
    <aside
      className={clsx(
        'fixed top-0 left-0 h-screen bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col z-30',
        'transition-[width] duration-300 ease-in-out overflow-hidden'
      )}
      style={{ width: collapsed ? '64px' : '240px' }}
    >
      {/* Clinic branding */}
      <div
        className="flex items-center gap-3 px-4 border-b border-[var(--color-border)] shrink-0"
        style={{ height: 'var(--topbar-height)' }}
      >
        {clinic?.logo_url ? (
          <img src={mediaUrl(clinic.logo_url)} alt="Clinic logo" className="h-8 w-8 rounded object-contain shrink-0" />
        ) : (
          <div className="h-8 w-8 rounded bg-[var(--color-primary)] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {clinic?.name?.charAt(0) || 'C'}
          </div>
        )}
        {!collapsed && (
          <span className="text-sm font-semibold text-[var(--color-text)] truncate">
            {clinic?.name || 'ClinicPOS'}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleItems.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            title={collapsed ? item.label : undefined}
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
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="border-t border-[var(--color-border)] p-3">
        <div className={clsx('flex items-center gap-3 px-2 py-2', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0">
            {user?.name?.charAt(0) || '?'}
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[var(--color-text)] truncate">{user?.name}</p>
              <p className="text-xs text-[var(--color-text-secondary)] capitalize">{user?.role}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
