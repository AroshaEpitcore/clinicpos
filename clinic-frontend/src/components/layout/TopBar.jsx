import { Sun, Moon, ShieldAlert } from 'lucide-react';
import { useAuth }  from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';

export function TopBar({ title, sidebarWidth }) {
  const { clinic, user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header
      className="fixed top-0 right-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20 transition-[left] duration-300 ease-in-out"
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

        {/* Dark / light toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-8 h-8 flex items-center justify-center rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors"
        >
          {theme === 'dark'
            ? <Sun  className="w-[18px] h-[18px]" />
            : <Moon className="w-[18px] h-[18px]" />
          }
        </button>
      </div>
    </header>
  );
}
