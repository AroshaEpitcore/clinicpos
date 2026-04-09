import clsx from 'clsx';

export function Card({ title, children, className, noPadding }) {
  return (
    <div
      className={clsx(
        'bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)]',
        !noPadding && 'p-5',
        className
      )}
    >
      {title && (
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">{title}</h2>
      )}
      {children}
    </div>
  );
}
