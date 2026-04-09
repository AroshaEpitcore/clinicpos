import { LoadingState } from './Spinner';

export function Table({ columns = [], data = [], loading, emptyMessage = 'No records found.' }) {
  if (loading) return <LoadingState />;

  if (!data.length) {
    return (
      <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide whitespace-nowrap"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row.id || i}
              className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className="px-4 py-3 text-[var(--color-text)]">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
