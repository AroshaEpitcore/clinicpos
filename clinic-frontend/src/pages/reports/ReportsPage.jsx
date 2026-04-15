import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, TrendingUp, Users, Pill, FileText, Clock, Calendar } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { Select }     from '../../components/ui/Select';
import { PageLayout }  from '../../components/layout/PageLayout';
import { PageHeader }  from '../../components/ui/PageHeader';
import { LoadingState, Spinner }  from '../../components/ui/Spinner';
import { EmptyState }             from '../../components/ui/EmptyState';
import { reportsApi }             from '../../api/reports';
import { formatCurrency, formatDate } from '../../utils/format';

const TABS = [
  { key: 'daily',        label: 'Daily',        icon: FileText  },
  { key: 'monthly',      label: 'Monthly',      icon: TrendingUp },
  { key: 'doctors',      label: 'Doctors',      icon: Users     },
  { key: 'medicines',    label: 'Medicines',    icon: Pill      },
  { key: 'patients',     label: 'Patients',     icon: Users     },
  { key: 'appointments', label: 'Appointments', icon: Calendar  },
  { key: 'eod',          label: 'EOD History',  icon: Clock     },
];

function todayStr()  { return new Date().toISOString().split('T')[0]; }
function monthStart(y, m) {
  return `${y}-${String(m).padStart(2,'0')}-01`;
}
function monthEnd(y, m) {
  return new Date(y, m, 0).toISOString().split('T')[0];
}

// ── CSV export helper ─────────────────────────────────────────────────────────
function downloadCSV(filename, rows, headers) {
  const escape = v => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'text-[var(--color-primary)]',
    success: 'text-[var(--color-success)]',
    danger:  'text-[var(--color-danger)]',
    warning: 'text-amber-500',
  };
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
      <p className={`text-xl font-bold ${colors[color] || colors.primary}`}>{value}</p>
      {sub && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionTitle({ children }) {
  return <p className="text-sm font-semibold text-[var(--color-text)] mb-3">{children}</p>;
}

// ── Simple table ─────────────────────────────────────────────────────────────
function SimpleTable({ cols, rows }) {
  if (!rows?.length) return <EmptyState title="No data" description="Nothing to show for this period." />;
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
            {cols.map(c => (
              <th key={c.key}
                className={`px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]">
              {cols.map(c => (
                <td key={c.key}
                  className={`px-4 py-2.5 text-sm ${c.align === 'right' ? 'text-right' : ''} ${c.className || 'text-[var(--color-text)]'}`}>
                  {c.render ? c.render(row[c.key], row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: DAILY
// ─────────────────────────────────────────────────────────────────────────────
function DailyTab() {
  const [date,    setDate]    = useState(todayStr());
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.daily(date);
      setData(res.data.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!data) return;
    const rows = [
      { metric: 'Date', value: data.date },
      { metric: 'Total Appointments', value: data.appointments.total },
      { metric: 'Completed', value: data.appointments.completed },
      { metric: 'Cancelled', value: data.appointments.cancelled },
      { metric: 'New Patients', value: data.new_patients },
      { metric: 'Total Billed', value: data.revenue.total_billed },
      { metric: 'Total Collected', value: data.revenue.total_collected },
      { metric: 'Outstanding', value: data.revenue.outstanding },
      ...data.payment_methods.map(m => ({ metric: `Payment - ${m.payment_method}`, value: m.total })),
    ];
    downloadCSV(`daily-report-${date}.csv`, rows, ['metric', 'value']);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <DatePicker value={date} onChange={setDate} />
        {data && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {loading ? <LoadingState message="Loading daily report..." /> : !data ? null : (
        <>
          <div>
            <SectionTitle>Appointments</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total"     value={data.appointments.total}     />
              <StatCard label="Completed" value={data.appointments.completed} color="success" />
              <StatCard label="Cancelled" value={data.appointments.cancelled} color="danger"  />
              <StatCard label="Emergency" value={data.appointments.emergency} color="warning" />
            </div>
          </div>

          <div>
            <SectionTitle>Revenue</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Billed"    value={formatCurrency(data.revenue.total_billed)}    />
              <StatCard label="Collected"       value={formatCurrency(data.revenue.total_collected)} color="success" />
              <StatCard label="Outstanding"     value={formatCurrency(data.revenue.outstanding)}     color={parseFloat(data.revenue.outstanding) > 0 ? 'danger' : 'success'} />
              <StatCard label="New Patients"    value={data.new_patients} />
            </div>
          </div>

          {data.payment_methods.length > 0 && (
            <div>
              <SectionTitle>Payment Methods</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {data.payment_methods.map(m => (
                  <StatCard key={m.payment_method} label={m.payment_method} value={formatCurrency(m.total)} color="success" />
                ))}
              </div>
            </div>
          )}

          {data.top_diagnoses.length > 0 && (
            <div>
              <SectionTitle>Top Diagnoses</SectionTitle>
              <SimpleTable
                cols={[
                  { key: 'diagnosis', label: 'Diagnosis' },
                  { key: 'count',     label: 'Count', align: 'right' },
                ]}
                rows={data.top_diagnoses}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: MONTHLY
// ─────────────────────────────────────────────────────────────────────────────
function MonthlyTab() {
  const now  = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.monthly(year, month);
      setData(res.data.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const handleExport = () => {
    if (!data?.daily) return;
    downloadCSV(
      `monthly-report-${year}-${String(month).padStart(2,'0')}.csv`,
      data.daily,
      ['date','appointments','completed','billed','collected'],
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Select
          value={String(month)}
          onValueChange={v => setMonth(parseInt(v))}
          options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
        />
        <Select
          value={String(year)}
          onValueChange={v => setYear(parseInt(v))}
          options={[now.getFullYear() - 1, now.getFullYear()].map(y => ({ value: String(y), label: String(y) }))}
        />
        {data && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {loading ? <LoadingState message="Loading monthly report..." /> : !data ? null : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Appointments" value={data.totals.total_appointments} />
            <StatCard label="Patients Seen"      value={data.totals.total_patients} />
            <StatCard label="Total Billed"        value={formatCurrency(data.totals.total_billed)} />
            <StatCard label="Collected"           value={formatCurrency(data.totals.total_collected)} color="success" />
          </div>

          <div>
            <SectionTitle>Daily Revenue</SectionTitle>
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-4 bg-[var(--color-surface)]">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '0' : `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="billed"    name="Billed"    fill="var(--color-primary)"       radius={[3,3,0,0]} />
                  <Bar dataKey="collected" name="Collected" fill="var(--color-success,#16a34a)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <SectionTitle>Daily Appointments</SectionTitle>
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-4 bg-[var(--color-surface)]">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.daily} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="appointments" name="Total"     fill="var(--color-primary)"       radius={[3,3,0,0]} />
                  <Bar dataKey="completed"    name="Completed" fill="var(--color-success,#16a34a)" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: DOCTORS
// ─────────────────────────────────────────────────────────────────────────────
function DoctorsTab() {
  const now  = new Date();
  const [from, setFrom] = useState(monthStart(now.getFullYear(), now.getMonth() + 1));
  const [to,   setTo]   = useState(monthEnd(now.getFullYear(),   now.getMonth() + 1));
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.doctors(from, to);
      setData(res.data.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!data) return;
    downloadCSV(`doctors-report-${from}-to-${to}.csv`, data,
      ['full_name','specialization','consultations','patients_seen','revenue_billed','revenue_collected']);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-[var(--color-text-secondary)]">From</label>
        <DatePicker value={from} onChange={setFrom} />
        <label className="text-xs text-[var(--color-text-secondary)]">To</label>
        <DatePicker value={to} onChange={setTo} />
        {data && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {loading ? <LoadingState message="Loading doctor stats..." /> : (
        <SimpleTable
          cols={[
            { key: 'full_name',          label: 'Doctor' },
            { key: 'specialization',     label: 'Specialization', render: v => v || '—' },
            { key: 'consultations',      label: 'Consultations', align: 'right' },
            { key: 'patients_seen',      label: 'Patients', align: 'right' },
            { key: 'revenue_billed',     label: 'Billed',    align: 'right', render: v => formatCurrency(v) },
            { key: 'revenue_collected',  label: 'Collected', align: 'right', render: v => formatCurrency(v), className: 'text-[var(--color-success,#16a34a)] text-right' },
          ]}
          rows={data || []}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: MEDICINES
// ─────────────────────────────────────────────────────────────────────────────
function MedicinesTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab,  setSubTab]  = useState('low_stock');

  useEffect(() => {
    reportsApi.medicines()
      .then(r => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Loading medicine report..." />;
  if (!data)   return null;

  const { overview, low_stock, near_expiry, top_prescribed } = data;

  const handleExport = () => {
    if (subTab === 'low_stock') {
      downloadCSV('low-stock.csv', low_stock, ['name','generic_name','strength','unit','stock_quantity','reorder_level','selling_price']);
    } else if (subTab === 'near_expiry') {
      downloadCSV('near-expiry.csv', near_expiry, ['name','strength','unit','stock_quantity','expiry_date']);
    } else {
      downloadCSV('top-prescribed.csv', top_prescribed, ['name','strength','unit','times_prescribed']);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Active"  value={overview.total_active} />
        <StatCard label="Low Stock"     value={overview.low_stock}    color={overview.low_stock   > 0 ? 'danger'  : 'success'} />
        <StatCard label="Near Expiry"   value={overview.near_expiry}  color={overview.near_expiry > 0 ? 'warning' : 'success'} />
        <StatCard label="Expired"       value={overview.expired}      color={overview.expired     > 0 ? 'danger'  : 'success'} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-[var(--color-bg)] rounded-[var(--radius)] p-1 border border-[var(--color-border)]">
          {[
            { key: 'low_stock',    label: `Low Stock (${overview.low_stock})` },
            { key: 'near_expiry',  label: `Near Expiry (${overview.near_expiry})` },
            { key: 'top_prescribed', label: 'Top Prescribed' },
          ].map(t => (
            <button key={t.key} onClick={() => setSubTab(t.key)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                subTab === t.key ? 'bg-[var(--color-surface)] shadow text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {subTab === 'low_stock' && (
        <SimpleTable
          cols={[
            { key: 'name',          label: 'Medicine' },
            { key: 'strength',      label: 'Strength', render: v => v || '—' },
            { key: 'unit',          label: 'Unit' },
            { key: 'stock_quantity',label: 'In Stock', align: 'right',
              render: (v, row) => <span className={parseInt(v) === 0 ? 'text-[var(--color-danger)] font-bold' : 'text-amber-500 font-semibold'}>{v}</span> },
            { key: 'reorder_level', label: 'Reorder At', align: 'right' },
            { key: 'selling_price', label: 'Price', align: 'right', render: v => v ? formatCurrency(v) : '—' },
          ]}
          rows={low_stock}
        />
      )}

      {subTab === 'near_expiry' && (
        <SimpleTable
          cols={[
            { key: 'name',          label: 'Medicine' },
            { key: 'strength',      label: 'Strength', render: v => v || '—' },
            { key: 'unit',          label: 'Unit' },
            { key: 'stock_quantity',label: 'In Stock', align: 'right' },
            { key: 'expiry_date',   label: 'Expires', align: 'right',
              render: v => {
                const days = Math.ceil((new Date(v) - new Date()) / 86400000);
                const cls  = days < 0 ? 'text-[var(--color-danger)] font-bold' : days <= 14 ? 'text-amber-500 font-semibold' : 'text-[var(--color-text)]';
                return <span className={cls}>{formatDate(v)}{days < 0 ? ' (expired)' : ` (${days}d)`}</span>;
              }},
          ]}
          rows={near_expiry}
        />
      )}

      {subTab === 'top_prescribed' && (
        <SimpleTable
          cols={[
            { key: 'name',             label: 'Medicine' },
            { key: 'strength',         label: 'Strength', render: v => v || '—' },
            { key: 'unit',             label: 'Unit' },
            { key: 'times_prescribed', label: 'Times Prescribed', align: 'right',
              render: v => <span className="font-semibold text-[var(--color-primary)]">{v}</span> },
          ]}
          rows={top_prescribed}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: PATIENTS
// ─────────────────────────────────────────────────────────────────────────────
function PatientsTab() {
  const now  = new Date();
  const [from, setFrom] = useState(monthStart(now.getFullYear(), now.getMonth() + 1));
  const [to,   setTo]   = useState(monthEnd(now.getFullYear(),   now.getMonth() + 1));
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.patients(from, to);
      setData(res.data.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-[var(--color-text-secondary)]">From</label>
        <DatePicker value={from} onChange={setFrom} />
        <label className="text-xs text-[var(--color-text-secondary)]">To</label>
        <DatePicker value={to} onChange={setTo} />
      </div>

      {loading ? <LoadingState message="Loading patient report..." /> : !data ? null : (
        <>
          <div>
            <SectionTitle>Overview</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Patients"    value={data.demographics.total_registered} />
              <StatCard label="New in Period"     value={data.demographics.new_in_period} color="success" />
              <StatCard label="Male"              value={data.demographics.male} />
              <StatCard label="Female"            value={data.demographics.female} />
            </div>
          </div>

          <div>
            <SectionTitle>Age Groups (All Patients)</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard label="Children (0–12)"   value={data.age_groups.child} />
              <StatCard label="Teens (13–17)"     value={data.age_groups.teen} />
              <StatCard label="Adults (18–40)"    value={data.age_groups.adult} />
              <StatCard label="Middle-aged (41–60)" value={data.age_groups.middle_aged} />
              <StatCard label="Seniors (60+)"     value={data.age_groups.senior} />
            </div>
          </div>

          {data.top_diagnoses.length > 0 && (
            <div>
              <SectionTitle>Top Diagnoses in Period</SectionTitle>
              <SimpleTable
                cols={[
                  { key: 'diagnosis', label: 'Diagnosis' },
                  { key: 'count',     label: 'Cases', align: 'right' },
                ]}
                rows={data.top_diagnoses}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────
function AppointmentsTab() {
  const now  = new Date();
  const [from, setFrom] = useState(monthStart(now.getFullYear(), now.getMonth() + 1));
  const [to,   setTo]   = useState(monthEnd(now.getFullYear(),   now.getMonth() + 1));
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.appointments(from, to);
      setData(res.data.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-[var(--color-text-secondary)]">From</label>
        <DatePicker value={from} onChange={setFrom} />
        <label className="text-xs text-[var(--color-text-secondary)]">To</label>
        <DatePicker value={to} onChange={setTo} />
      </div>

      {loading ? <LoadingState message="Loading appointment stats..." /> : !data ? null : (
        <>
          <div>
            <SectionTitle>Status Breakdown</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total"     value={data.summary.total}     />
              <StatCard label="Completed" value={data.summary.completed} color="success" />
              <StatCard label="Cancelled" value={data.summary.cancelled} color="danger"  />
              <StatCard label="Emergency" value={data.summary.emergency} color="warning" />
            </div>
          </div>

          <div>
            <SectionTitle>Booking Type</SectionTitle>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Walk-in"   value={data.summary.walk_in}   />
              <StatCard label="Booked"    value={data.summary.booked}    />
              <StatCard label="Emergency" value={data.summary.emergency} color="warning" />
            </div>
          </div>

          {data.by_day_of_week.length > 0 && (
            <div>
              <SectionTitle>Busiest Days of Week</SectionTitle>
              <div className="rounded-[var(--radius)] border border-[var(--color-border)] p-4 bg-[var(--color-surface)]">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.by_day_of_week.map(d => ({ ...d, day: DOW[d.dow] }))}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="completed" name="Completed" fill="var(--color-primary)" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TAB: EOD HISTORY
// ─────────────────────────────────────────────────────────────────────────────
function EodHistoryTab() {
  const now  = new Date();
  const [from, setFrom] = useState(monthStart(now.getFullYear(), now.getMonth() + 1));
  const [to,   setTo]   = useState(monthEnd(now.getFullYear(),   now.getMonth() + 1));
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.eodHistory(from, to);
      setData(res.data.data);
    } catch { setData(null); }
    finally  { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!data) return;
    downloadCSV(`eod-history-${from}-to-${to}.csv`, data,
      ['closing_date','total_patients','total_invoices','total_billed','total_collected','cash_system','cash_counted','cash_difference','closed_by_name']);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-[var(--color-text-secondary)]">From</label>
        <DatePicker value={from} onChange={setFrom} />
        <label className="text-xs text-[var(--color-text-secondary)]">To</label>
        <DatePicker value={to} onChange={setTo} />
        {data?.length > 0 && (
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        )}
      </div>

      {loading ? <LoadingState message="Loading EOD history..." /> : (
        <SimpleTable
          cols={[
            { key: 'closing_date',    label: 'Date',       render: v => formatDate(v + 'T00:00:00') },
            { key: 'total_patients',  label: 'Patients',   align: 'right' },
            { key: 'total_invoices',  label: 'Invoices',   align: 'right' },
            { key: 'total_billed',    label: 'Billed',     align: 'right', render: v => formatCurrency(v) },
            { key: 'total_collected', label: 'Collected',  align: 'right', render: v => formatCurrency(v) },
            { key: 'cash_difference', label: 'Cash Diff',  align: 'right',
              render: v => {
                const n = parseFloat(v);
                const cls = n === 0 ? 'text-[var(--color-success,#16a34a)]' : n > 0 ? 'text-amber-500' : 'text-[var(--color-danger)]';
                return <span className={cls + ' font-semibold'}>{n >= 0 ? '+' : ''}{formatCurrency(n)}</span>;
              }},
            { key: 'closed_by_name',  label: 'Closed By' },
          ]}
          rows={data || []}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('daily');

  const tabContent = {
    daily:        <DailyTab />,
    monthly:      <MonthlyTab />,
    doctors:      <DoctorsTab />,
    medicines:    <MedicinesTab />,
    patients:     <PatientsTab />,
    appointments: <AppointmentsTab />,
    eod:          <EodHistoryTab />,
  };

  return (
    <PageLayout>
      <PageHeader title="Reports & Analytics" />

      {/* Tab nav */}
      <div className="flex gap-1 flex-wrap mb-6 border-b border-[var(--color-border)]">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>{tabContent[activeTab]}</div>
    </PageLayout>
  );
}
