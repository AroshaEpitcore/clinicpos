export function Badge({ label, variant = 'gray' }) {
  const variants = {
    active:    'bg-green-100 text-green-700',
    suspended: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    gray:      'bg-gray-100 text-gray-600',
    blue:      'bg-blue-100 text-blue-700',
    amber:     'bg-amber-100 text-amber-700',
    purple:    'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${variants[variant] || variants.gray}`}>
      {label}
    </span>
  );
}
