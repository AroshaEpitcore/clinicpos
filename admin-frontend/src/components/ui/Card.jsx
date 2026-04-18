import clsx from 'clsx';

export function Card({ title, subtitle, children, className, action, noPadding }) {
  return (
    <div className={clsx(
      'bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-sm',
      !noPadding && 'p-5',
      className
    )}>
      {(title || action) && (
        <div className={clsx(
          'flex items-center justify-between border-b border-[var(--color-border)]',
          noPadding ? 'px-5 py-4' : 'pb-4 mb-4'
        )}>
          <div>
            <h3 className="font-semibold text-[var(--color-text)] text-sm">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {noPadding ? children : <div>{children}</div>}
    </div>
  );
}

const iconColors = {
  blue:   'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
  green:  'bg-[var(--color-success-light)] text-[var(--color-success)]',
  amber:  'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  red:    'bg-[var(--color-danger-light)] text-[var(--color-danger)]',
  purple: 'bg-purple-50 text-purple-600',
  gray:   'bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
};

export function StatCard({ label, value, icon: Icon, color = 'blue', sub, onClick, alert }) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      onClick={onClick}
      className={clsx(
        'bg-[var(--color-surface)] rounded-[var(--radius-lg)] border shadow-sm p-5 flex items-center gap-4 text-left w-full transition-colors',
        alert ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]',
        onClick && 'hover:bg-[var(--color-bg)] cursor-pointer'
      )}
    >
      {Icon && (
        <div className={clsx('w-11 h-11 rounded-[var(--radius)] flex items-center justify-center shrink-0', iconColors[color] || iconColors.blue)}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div>
        <p className="text-xs text-[var(--color-text-secondary)] font-medium">{label}</p>
        <p className="text-2xl font-bold text-[var(--color-text)] leading-tight">{value}</p>
        {sub && (
          <p className={clsx('text-xs mt-0.5', alert ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-secondary)]')}>
            {sub}
          </p>
        )}
      </div>
    </Wrapper>
  );
}
