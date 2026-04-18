export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="w-10 h-10 text-[var(--color-border)] mb-3" />}
      <p className="text-sm font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
