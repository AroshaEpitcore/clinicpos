import clsx from 'clsx';

export function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };
  return (
    <div className={clsx(
      'border-2 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin',
      sizes[size],
      className
    )} />
  );
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
    </div>
  );
}
