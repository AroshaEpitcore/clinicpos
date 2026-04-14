import { Bell, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

export function TopBar({ title, sidebarWidth }) {
  const { clinic, user } = useAuth();

  return (
    <header
      className="fixed top-0 right-0 bg-white border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20 transition-[left] duration-300 ease-in-out"
      style={{
        left: sidebarWidth ?? 'var(--sidebar-width)',
        height: 'var(--topbar-height)',
      }}
    >
      <h2 className="text-sm font-semibold text-[var(--color-text)]">
        {title || clinic?.name || 'ClinicPOS'}
      </h2>

      <div className="flex items-center gap-3">
        {user?.impersonated && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Impersonating
          </span>
        )}
        <button className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
