import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { adminSystemApi, adminTenantsApi } from '../api/admin';

const METHODS      = ['', 'POST', 'PUT', 'DELETE', 'PATCH', 'GET'];
const STATUS_CLASSES = [
  { value: '',    label: 'All Status' },
  { value: '2xx', label: '2xx Success' },
  { value: '4xx', label: '4xx Client Error' },
  { value: '5xx', label: '5xx Server Error' },
];

function statusColor(code) {
  if (code >= 500) return 'bg-red-100 text-red-700';
  if (code >= 400) return 'bg-orange-100 text-orange-700';
  if (code >= 300) return 'bg-yellow-100 text-yellow-700';
  return 'bg-emerald-100 text-emerald-700';
}

function methodColor(method) {
  const m = {
    POST:   'bg-blue-100 text-blue-700',
    PUT:    'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH:  'bg-purple-100 text-purple-700',
    GET:    'bg-[var(--color-bg)] text-[var(--color-text-secondary)]',
  };
  return m[method] || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
}

function roleColor(role) {
  const r = {
    admin:        'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
    doctor:       'bg-emerald-100 text-emerald-700',
    receptionist: 'bg-amber-100 text-amber-700',
    nurse:        'bg-purple-100 text-purple-700',
    superadmin:   'bg-red-100 text-red-700',
  };
  return r[role] || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
}

function formatTs(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

function cleanPath(path) {
  return path.replace(/\/\d+/g, '/{id}').replace('/api/v1', '');
}

export default function SystemLogsPage() {
  const [logs,     setLogs]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [clinics,  setClinics]  = useState([]);

  const [filters, setFilters] = useState({
    tenant_id:    '',
    method:       '',
    status_class: '',
    search:       '',
    date_from:    '',
    date_to:      '',
  });

  const limit = 50;
  const totalPages = Math.ceil(total / limit);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = { page: p, limit, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) };
      const res = await adminSystemApi.logs(params);
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(1); setPage(1); }, [filters]);
  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    adminTenantsApi.list().then(r => setClinics(r.data.data || [])).catch(() => {});
  }, []);

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); }

  function SelectFilter({ value, onChange, children, className = '' }) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`px-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
          bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2
          focus:ring-[var(--color-primary)] ${className}`}
      >
        {children}
      </select>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">System Logs</h1>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            All API mutations and errors across every clinic
          </p>
        </div>
        <button
          onClick={() => load(page)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] text-xs font-medium
            border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]
            hover:bg-[var(--color-bg)] disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
          <span className="text-xs font-medium text-[var(--color-text-secondary)]">Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
            <input
              value={filters.search}
              onChange={e => setFilter('search', e.target.value)}
              placeholder="Search path or email…"
              className="pl-7 pr-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
                bg-[var(--color-surface)] text-[var(--color-text)] w-52 focus:outline-none focus:ring-2
                focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-secondary)]"
            />
          </div>

          {/* Clinic */}
          <SelectFilter value={filters.tenant_id} onChange={v => setFilter('tenant_id', v)}>
            <option value="">All Clinics</option>
            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </SelectFilter>

          {/* Method */}
          <SelectFilter value={filters.method} onChange={v => setFilter('method', v)}>
            {METHODS.map(m => <option key={m} value={m}>{m || 'All Methods'}</option>)}
          </SelectFilter>

          {/* Status */}
          <SelectFilter value={filters.status_class} onChange={v => setFilter('status_class', v)}>
            {STATUS_CLASSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </SelectFilter>

          {/* Date range */}
          <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
            className="px-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
              bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
            className="px-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
              bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />

          {Object.values(filters).some(v => v) && (
            <button
              onClick={() => setFilters({ tenant_id: '', method: '', status_class: '', search: '', date_from: '', date_to: '' })}
              className="px-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
                bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-xs text-[var(--color-text-secondary)]">
            {total.toLocaleString()} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                {['Timestamp', 'Clinic', 'User', 'Method', 'Path', 'Status', 'Duration'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    No log entries found
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                    {formatTs(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text)] whitespace-nowrap">
                    {log.tenant_name || log.tenant_subdomain || <span className="text-[var(--color-text-secondary)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--color-text)] truncate max-w-[140px]">{log.user_email || '—'}</div>
                    {log.user_role && (
                      <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-semibold ${roleColor(log.user_role)}`}>
                        {log.user_role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold font-mono ${methodColor(log.method)}`}>
                      {log.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text)] max-w-[240px]">
                    <span className="truncate block" title={log.path}>{cleanPath(log.path)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold font-mono ${statusColor(log.status_code)}`}>
                      {log.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                    {log.duration_ms != null ? `${log.duration_ms}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-[var(--radius)] border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-[var(--radius)] border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
