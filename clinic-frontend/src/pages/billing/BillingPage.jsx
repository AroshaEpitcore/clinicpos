import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Receipt, Clock, Calendar } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { toast } from 'sonner';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { Button }       from '../../components/ui/Button';
import { Badge }        from '../../components/ui/Badge';
import { EmptyState }   from '../../components/ui/EmptyState';
import { LoadingState } from '../../components/ui/Spinner';
import { invoicesApi }  from '../../api/invoices';
import { formatDate, formatCurrency, toInputDate } from '../../utils/format';
import { useAuth }      from '../../store/AuthContext';
import { InvoiceModal } from './components/InvoiceModal';

const STATUS_TABS = [
  { key: 'all',     label: 'All' },
  { key: 'unpaid',  label: 'Unpaid' },
  { key: 'partial', label: 'Partial' },
  { key: 'paid',    label: 'Paid' },
];

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return toInputDate(d);
}

export default function BillingPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const today       = toInputDate(new Date());
  const isAdmin     = user?.role === 'admin' || user?.role === 'receptionist';

  const [date,       setDate]       = useState(today);
  const [statusTab,  setStatusTab]  = useState('all');
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [openInvoice, setOpenInvoice] = useState(null); // invoice id to view
  const isToday = date === today;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { date, limit: 200 };
      if (statusTab !== 'all') params.status = statusTab;
      const res = await invoicesApi.list(params);
      setInvoices(res.data.data);
    } catch {
      toast.error('Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, [date, statusTab]);

  useEffect(() => { load(); }, [load]);

  // Summary totals
  const totals = invoices.reduce((acc, inv) => {
    acc.total    += parseFloat(inv.total_amount  || 0);
    acc.collected += parseFloat(inv.paid_amount  || 0);
    acc.balance   += parseFloat(inv.balance_due  || 0);
    return acc;
  }, { total: 0, collected: 0, balance: 0 });

  return (
    <PageLayout title="Billing">
      <PageHeader
        title="Billing"
        subtitle="Invoices and payments"
        actions={
          isAdmin && (
            <Button variant="secondary" size="sm" onClick={() => navigate('/billing/end-of-day')}>
              End of Day
            </Button>
          )
        }
      />

      {/* Date navigation */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setDate(d => addDays(d, -1))}
          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--color-text)]">
            {isToday ? 'Today' : formatDate(date + 'T00:00:00')}
          </span>
          {!isToday && (
            <button onClick={() => setDate(today)}
              className="text-xs text-[var(--color-primary)] hover:underline">
              Back to today
            </button>
          )}
        </div>

        <button onClick={() => setDate(d => addDays(d, 1))}
          className="p-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
          <ChevronRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
        </button>

        <DatePicker value={date} onChange={setDate} />
      </div>

      {/* Summary strip */}
      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <SummaryCard label="Total Billed"     value={formatCurrency(totals.total)}     color="text-[var(--color-text)]" />
          <SummaryCard label="Collected"         value={formatCurrency(totals.collected)} color="text-[var(--color-success)]" />
          <SummaryCard label="Outstanding"       value={formatCurrency(totals.balance)}   color={totals.balance > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text)]'} />
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-5">
        {STATUS_TABS.map(tab => (
          <button key={tab.key} onClick={() => setStatusTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              statusTab === tab.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {loading ? (
        <LoadingState message="Loading invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices"
          description={`No ${statusTab !== 'all' ? statusTab + ' ' : ''}invoices for ${isToday ? 'today' : formatDate(date + 'T00:00:00')}.`}
        />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Invoice</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Patient</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Paid</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}
                  className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--color-primary)]">{inv.invoice_number}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {new Date(inv.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p
                      className="text-sm font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] cursor-pointer transition-colors"
                      onClick={() => navigate(`/patients/${inv.patient_id}`)}
                    >
                      {inv.first_name} {inv.last_name}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{inv.patient_code}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-semibold text-[var(--color-text)]">
                      {formatCurrency(inv.total_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-[var(--color-success)]">
                      {formatCurrency(inv.paid_amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${parseFloat(inv.balance_due) > 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-secondary)]'}`}>
                      {formatCurrency(inv.balance_due)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={inv.payment_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="secondary" onClick={() => setOpenInvoice(inv.id)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openInvoice && (
        <InvoiceModal
          invoiceId={openInvoice}
          onClose={() => setOpenInvoice(null)}
          onSuccess={() => { setOpenInvoice(null); load(); }}
        />
      )}
    </PageLayout>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] px-5 py-4">
      <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

export function PaymentStatusBadge({ status }) {
  const map = {
    paid:    { variant: 'success', label: 'Paid' },
    partial: { variant: 'warning', label: 'Partial' },
    unpaid:  { variant: 'danger',  label: 'Unpaid' },
  };
  const cfg = map[status] || { variant: 'neutral', label: status };
  return <Badge variant={cfg.variant} label={cfg.label} />;
}
