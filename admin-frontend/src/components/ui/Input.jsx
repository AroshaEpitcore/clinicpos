import { forwardRef } from 'react';
import clsx from 'clsx';

export const Input = forwardRef(function Input({ label, error, required, className, ...props }, ref) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label} {required && <span className="text-[var(--color-danger)]">*</span>}
        </label>
      )}
      <input
        ref={ref}
        {...props}
        className={clsx(
          'w-full px-3 py-2 rounded-[var(--radius)] border text-sm',
          'bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
          'disabled:bg-[var(--color-bg)] disabled:cursor-not-allowed',
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
          className
        )}
      />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
});
