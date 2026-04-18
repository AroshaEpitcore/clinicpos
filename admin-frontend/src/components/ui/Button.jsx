import clsx from 'clsx';

const variants = {
  primary:   'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  secondary: 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)] hover:bg-[var(--color-bg)]',
  danger:    'bg-[var(--color-danger)] text-white hover:opacity-90',
  success:   'bg-[var(--color-success)] text-white hover:opacity-90',
  ghost:     'bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ children, variant = 'primary', size = 'md', loading, disabled, className, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  );
}
