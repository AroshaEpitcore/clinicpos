import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, ShieldAlert, Menu, LogOut } from 'lucide-react';
import { useAuth }  from '../../store/AuthContext';
import { useTheme } from '../../store/ThemeContext';
import { toast }    from 'sonner';

export function TopBar({ title, sidebarWidth, onToggle }) {
  const { clinic, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
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
    toast.success('Logged out successfully');
    navigate('/login');
  }

  return (
    <header
      className="fixed top-0 right-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center z-20 transition-[left] duration-300 ease-in-out"
      style={{
        left: sidebarWidth ?? 'var(--sidebar-width)',
        height: 'var(--topbar-height)',
      }}
    >
      {/* Left: hamburger */}
      <button
        onClick={onToggle}
        title="Toggle sidebar"
        className="w-[var(--topbar-height)] h-[var(--topbar-height)] flex items-center justify-center shrink-0 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors border-r border-[var(--color-border)]"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      <h2 className="flex-1 px-4 text-sm font-semibold text-[var(--color-text)] truncate">
        {title || clinic?.name || 'ClinicPOS'}
      </h2>

      {/* Date & time */}
      <div className="hidden sm:flex flex-col items-end pr-4 leading-tight shrink-0">
        <span className="text-xs font-semibold text-[var(--color-text)] tabular-nums">{timeStr}</span>
        <span className="text-[11px] text-[var(--color-text-secondary)]">{dateStr}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center">
        {user?.impersonated && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 mr-2 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            Impersonating
          </span>
        )}

        {/* Dark / light toggle */}
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="w-[var(--topbar-height)] h-[var(--topbar-height)] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors border-l border-[var(--color-border)]"
        >
          {theme === 'dark'
            ? <Sun  className="w-[18px] h-[18px]" />
            : <Moon className="w-[18px] h-[18px]" />
          }
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="w-[var(--topbar-height)] h-[var(--topbar-height)] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-danger)] transition-colors border-l border-[var(--color-border)]"
        >
          <LogOut className="w-[18px] h-[18px]" />
        </button>
      </div>
    </header>
  );
}
