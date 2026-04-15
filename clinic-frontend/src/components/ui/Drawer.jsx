import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Drawer — slides in from the right side of the screen.
 * Replaces Modal when a form needs more vertical space (slot pickers, long forms).
 *
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   title     string
 *   footer    ReactNode   — sticky bottom bar (buttons)
 *   width     string      — default '520px'
 *   children  ReactNode
 */
export function Drawer({ open, onClose, title, footer, width = '520px', children }) {
  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel — slides from right */}
      <div
        className="relative ml-auto h-full flex flex-col bg-[var(--color-surface)] shadow-2xl"
        style={{ width, maxWidth: '95vw' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--color-border)] px-5 py-4 flex items-center justify-end gap-3 bg-[var(--color-surface)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
