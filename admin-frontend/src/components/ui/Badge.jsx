export function Badge({ label, variant = 'gray' }) {
  const variants = {
    active:    'bg-green-100 text-green-700',
    trial:     'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
    basic:     'bg-gray-100 text-gray-600',
    standard:  'bg-purple-100 text-purple-700',
    premium:   'bg-amber-100 text-amber-700',
    gray:      'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${variants[variant] || variants.gray}`}>
      {label}
    </span>
  );
}
