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
  // Appointments
  pending:    'warning',
  confirmed:  'primary',
  arrived:    'info',
  completed:  'success',
  cancelled:  'neutral',
  emergency:  'danger',
  // Invoices
  paid:       'success',
  unpaid:     'danger',
  partial:    'warning',
  // Clinic accounts
  active:     'success',
  trial:      'info',
  suspended:  'danger',
  // Staff
  doctor:     'primary',
  receptionist: 'info',
  nurse:      'neutral',
  admin:      'warning',
};

const labels = {
  pending:      'Pending',
  confirmed:    'Confirmed',
  arrived:      'Arrived',
  completed:    'Completed',
  cancelled:    'Cancelled',
  emergency:    'Emergency',
  paid:         'Paid',
  unpaid:       'Unpaid',
  partial:      'Partial',
  active:       'Active',
  trial:        'Trial',
  suspended:    'Suspended',
  doctor:       'Doctor',
  receptionist: 'Receptionist',
  nurse:        'Nurse',
  admin:        'Admin',
};

export function Badge({ status, label, variant, className }) {
  const resolvedVariant = variant || statusMap[status] || 'neutral';
  const resolvedLabel   = label   || labels[status]   || status;

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[resolvedVariant],
        className
      )}
    >
      {resolvedLabel}
    </span>
  );
}
