import clsx from 'clsx';

const styles = {
  success: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  danger:  'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
  info:    'bg-[var(--color-info-light)] text-[var(--color-info)]',
  neutral: 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
  primary: 'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
};

const statusMap = {
  active:    'success',
  suspended: 'danger',
  trial:     'info',
  pending:   'warning',
  confirmed: 'primary',
  arrived:   'info',
  completed: 'success',
  cancelled: 'neutral',
  emergency: 'danger',
  paid:      'success',
  unpaid:    'danger',
  partial:   'warning',
};

export function Badge({ label, variant, status, className }) {
  // variant can be a style key directly, or a status value that maps to a style
  const styleKey = variant
    ? (styles[variant] ? variant : statusMap[variant] || 'neutral')
    : (statusMap[status] || 'neutral');

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      styles[styleKey],
      className
    )}>
      {label ?? status}
    </span>
  );
}
