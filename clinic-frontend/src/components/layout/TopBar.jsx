import { Bell } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

export function TopBar({ title, sidebarWidth }) {
  const { clinic } = useAuth();

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
        <button className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
          <Bell className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
