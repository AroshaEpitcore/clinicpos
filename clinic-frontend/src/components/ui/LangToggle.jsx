import { Languages } from 'lucide-react';
import { useLang } from '../../i18n/LangContext';

/**
 * Small EN ⇄ සිං language switcher. Persists choice in localStorage.
 * Used in patient-facing pages only.
 */
export function LangToggle({ className = '' }) {
  const { lang, toggle } = useLang();
  return (
    <button
      type="button"
      onClick={toggle}
      title={lang === 'en' ? 'Switch to Sinhala' : 'Switch to English'}
      className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-[var(--radius)] text-xs font-semibold border transition-colors ${className}`}
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-secondary)',
      }}
    >
      <Languages className="w-3.5 h-3.5" />
      {lang === 'en' ? 'සිං' : 'EN'}
    </button>
  );
}
