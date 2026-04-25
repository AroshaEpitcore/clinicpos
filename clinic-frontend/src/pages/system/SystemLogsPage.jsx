import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, ChevronLeft, ChevronRight, Filter, ScrollText } from 'lucide-react';
import { PageLayout }  from '../../components/layout/PageLayout';
import { PageHeader }  from '../../components/ui/PageHeader';
import api             from '../../api/index';

const METHODS      = ['', 'POST', 'PUT', 'DELETE', 'PATCH'];
const STATUS_CLASSES = [
  { value: '',    label: 'All Status' },
  { value: '2xx', label: '2xx Success' },
  { value: '4xx', label: '4xx Client Error' },
  { value: '5xx', label: '5xx Server Error' },
];

const ACTION_MAP = {
  'POST /patients':              'Patient registered',
  'PUT /patients/{id}':          'Patient updated',
  'DELETE /patients/{id}':       'Patient deleted',
  'POST /appointments':          'Appointment created',
  'PUT /appointments/{id}':      'Appointment updated',
  'DELETE /appointments/{id}':   'Appointment cancelled',
  'POST /consultations':         'Consultation created',
  'PUT /consultations/{id}':     'Consultation updated',
  'POST /prescriptions':         'Prescription created',
  'PUT /prescriptions/{id}':     'Prescription updated',
  'POST /invoices':              'Invoice created',
  'PUT /invoices/{id}':          'Invoice updated',
  'POST /medicines':             'Medicine added',
  'PUT /medicines/{id}':         'Medicine updated',
  'DELETE /medicines/{id}':      'Medicine deleted',
  'POST /staff':                 'Staff created',
  'PUT /staff/{id}':             'Staff updated',
  'DELETE /staff/{id}':          'Staff deactivated',
  'PUT /settings':               'Settings updated',
  'POST /vitals':                'Vitals recorded',
  'PUT /vitals/{id}':            'Vitals updated',
  'POST /pharmacy/dispense':     'Prescription dispensed',
  'POST /lab/results':           'Lab result entered',
  'PUT /lab/results/{id}':       'Lab result updated',
  'POST /end-of-day':            'End-of-day closed',
  'POST /insurance/claims':      'Insurance claim created',
  'PUT /insurance/claims/{id}':  'Insurance claim updated',
};

function getActionLabel(method, path) {
  const clean = path.replace('/api/v1', '').replace(/\/\d+/g, '/{id}');
  return ACTION_MAP[`${method} ${clean}`] || `${method} ${clean}`;
}

function statusColor(code) {
  if (code >= 500) return 'text-red-600 bg-red-50';
  if (code >= 400) return 'text-orange-600 bg-orange-50';
  return 'text-emerald-600 bg-emerald-50';
}

function roleColor(role) {
  const r = {
    admin:        'var(--role-admin-bg, #EFF6FF)',
    doctor:       'var(--role-doctor-bg, #F0FDF4)',
    receptionist: 'var(--role-recep-bg,  #FFFBEB)',
    nurse:        'var(--role-nurse-bg,  #FAF5FF)',
  };
  return role ? `inline-flex items-center px-1.5 py-0.5 rounded text-[0.65rem] font-semibold` : '';
}

function methodBadge(method) {
  const colors = {
    POST:   'bg-blue-100 text-blue-700',
    PUT:    'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH:  'bg-purple-100 text-purple-700',
  };
  return colors[method] || 'bg-gray-100 text-gray-600';
}

function formatTs(ts) {
  const d = new Date(ts);
  return d.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' });
}

export default function SystemLogsPage() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    method:       '',
    status_class: '',
    search:       '',
    date_from:    '',
    date_to:      '',
  });

  const limit      = 50;
  const totalPages = Math.ceil(total / limit);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) };
      const res = await api.get('/system/logs', { params });
      setLogs(res.data.data.logs);
      setTotal(res.data.data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { setPage(1); load(1); }, [filters]);
  useEffect(() => { load(page); }, [page]);

  function setFilter(key, val) { setFilters(f => ({ ...f, [key]: val })); }
  const hasFilters = Object.values(filters).some(v => v);

  return (
    <PageLayout>
      <PageHeader title="System Logs" subtitle="All actions performed by clinic staff" icon={ScrollText} />

      <div className="p-4 md:p-6 space-y-4">

        {/* Filters */}
        <div className="bg-white dark:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
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
                className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                  bg-white dark:bg-[var(--color-surface)] text-[var(--color-text)] w-48
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
                  placeholder:text-[var(--color-text-secondary)]"
              />
            </div>

            {/* Method */}
            <select value={filters.method} onChange={e => setFilter('method', e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                bg-white dark:bg-[var(--color-surface)] text-[var(--color-text)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {METHODS.map(m => <option key={m} value={m}>{m || 'All Methods'}</option>)}
            </select>

            {/* Status */}
            <select value={filters.status_class} onChange={e => setFilter('status_class', e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                bg-white dark:bg-[var(--color-surface)] text-[var(--color-text)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
              {STATUS_CLASSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {/* Date range */}
            <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                bg-white dark:bg-[var(--color-surface)] text-[var(--color-text)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                bg-white dark:bg-[var(--color-surface)] text-[var(--color-text)]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />

            {hasFilters && (
              <button onClick={() => setFilters({ method: '', status_class: '', search: '', date_from: '', date_to: '' })}
                className="px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                  text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors">
                Clear
              </button>
            )}

            <button onClick={() => load(page)} disabled={loading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)]
                text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <span className="text-xs text-[var(--color-text-secondary)]">{total.toLocaleString()} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg,#F9FAFB)]">
                  {['Timestamp', 'User', 'Action', 'Status', 'Duration'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-[var(--color-text-secondary)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1" />Loading…
                  </td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">No log entries found</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg,#F9FAFB)] transition-colors">
                    <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                      {formatTs(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[var(--color-text)] font-medium">{log.user_email || '—'}</div>
                      {log.user_role && (
                        <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-semibold capitalize
                          ${log.user_role === 'admin'        ? 'bg-blue-50 text-blue-700' :
                            log.user_role === 'doctor'       ? 'bg-emerald-50 text-emerald-700' :
                            log.user_role === 'nurse'        ? 'bg-purple-50 text-purple-700' :
                            'bg-amber-50 text-amber-700'}`}
                        >
                          {log.user_role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-bold font-mono ${methodBadge(log.method)}`}>
                          {log.method}
                        </span>
                        <span className="text-[var(--color-text)]">{getActionLabel(log.method, log.path)}</span>
                      </div>
                      <div className="font-mono text-[var(--color-text-secondary)] mt-0.5 text-[0.65rem]">
                        {log.path.replace('/api/v1', '')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded font-bold font-mono text-xs ${statusColor(log.status_code)}`}>
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

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-[var(--color-border)] flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-1.5 rounded-lg border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-colors">
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
