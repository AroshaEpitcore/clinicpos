import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { DatePicker } from '../../components/ui/DatePicker';
import { toast } from 'sonner';
import { PageLayout }   from '../../components/layout/PageLayout';
import { Button }       from '../../components/ui/Button';
import { Card }         from '../../components/ui/Card';
import { LoadingState } from '../../components/ui/Spinner';
import { endOfDayApi }  from '../../api/invoices';
import { formatCurrency, toInputDate } from '../../utils/format';
import { useAuth }      from '../../store/AuthContext';

export default function EndOfDayPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const today       = toInputDate(new Date());

  const [date,         setDate]         = useState(today);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [cashCounted,  setCashCounted]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  useEffect(() => { loadSummary(); }, [date]);

  async function loadSummary() {
    setLoading(true);
    setSummary(null);
    setCashCounted('');
    setNotes('');
    try {
      const res = await endOfDayApi.getSummary(date);
      setSummary(res.data);
    } catch {
      toast.error('Could not load summary.');
    } finally {
      setLoading(false);
    }
  }

  async function handleClose() {
    if (!cashCounted && cashCounted !== '0') {
      toast.error('Enter the cash counted amount.');
      return;
    }
    setSubmitting(true);
    try {
      await endOfDayApi.close({ closing_date: date, cash_counted: parseFloat(cashCounted), notes });
      toast.success('Day closed successfully');
      loadSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  const s              = summary?.data;
  const alreadyClosed  = summary?.status === 'already_closed';
  const cashDiff       = s ? parseFloat(cashCounted || 0) - parseFloat(s.cash_system || 0) : 0;
  const diffPositive   = cashDiff > 0;
  const diffNeutral    = cashDiff === 0;

  return (
    <PageLayout title="End of Day">

      <button
        onClick={() => navigate('/billing')}
        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Billing
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text)]">End of Day Closing</h1>
        <DatePicker value={date} max={today} onChange={setDate} />
      </div>

      {loading ? (
        <LoadingState message="Loading summary..." />
      ) : !s ? null : alreadyClosed ? (
        // ── Already closed view ────────────────────────────────────────────────
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)] bg-[var(--color-success-light,#f0fdf4)] border border-[var(--color-success,#22c55e)]">
            <CheckCircle className="w-5 h-5 text-[var(--color-success,#22c55e)] shrink-0" />
            <span className="text-sm font-medium text-[var(--color-success,#16a34a)]">
              This day has already been closed by {s.closed_by_name} at {new Date(s.closed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <ClosedSummary s={s} />
        </div>
      ) : (
        // ── Live closing form ──────────────────────────────────────────────────
        <div className="grid grid-cols-2 gap-6">

          {/* Left: system totals */}
          <div className="flex flex-col gap-4">
            <Card title="System Totals">
              <SummaryRow label="Total Patients"   value={s.total_patients} />
              <SummaryRow label="Total Invoices"   value={s.total_invoices} />
              <SummaryRow label="Total Billed"     value={formatCurrency(s.total_billed)} />
              <SummaryRow label="Total Collected"  value={formatCurrency(s.total_collected)} bold />
              <SummaryRow label="Outstanding"      value={formatCurrency(s.outstanding_balance)}
                valueClass={parseFloat(s.outstanding_balance) > 0 ? 'text-[var(--color-danger)] font-semibold' : ''} />
            </Card>

            <Card title="Collected by Method">
              <SummaryRow label="Cash"      value={formatCurrency(s.cash_system)}     />
              <SummaryRow label="Card"      value={formatCurrency(s.card_total)}      />
              <SummaryRow label="Online"    value={formatCurrency(s.online_total)}    />
              <SummaryRow label="Insurance" value={formatCurrency(s.insurance_total)} />
            </Card>
          </div>

          {/* Right: cash count + close */}
          <div className="flex flex-col gap-4">
            <Card title="Cash Count">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                    System cash total
                  </label>
                  <p className="text-lg font-bold text-[var(--color-text)]">{formatCurrency(s.cash_system)}</p>
                </div>

                <div>
                  <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">
                    Cash counted in drawer (LKR) <span className="text-[var(--color-danger)]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashCounted}
                    onChange={e => setCashCounted(e.target.value)}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>

                {cashCounted !== '' && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius)] border ${
                    diffNeutral
                      ? 'border-[var(--color-success,#22c55e)] bg-[#f0fdf4]'
                      : diffPositive
                      ? 'border-[var(--color-warning,#f59e0b)] bg-[#fffbeb]'
                      : 'border-[var(--color-danger)] bg-[var(--color-danger-light)]'
                  }`}>
                    {diffNeutral
                      ? <CheckCircle className="w-4 h-4 text-[var(--color-success,#22c55e)] shrink-0" />
                      : <AlertTriangle className="w-4 h-4 text-[var(--color-warning,#d97706)] shrink-0" />
                    }
                    <span className={`text-sm font-semibold ${
                      diffNeutral   ? 'text-[var(--color-success,#16a34a)]'
                      : diffPositive ? 'text-[#92400e]'
                      : 'text-[var(--color-danger)]'
                    }`}>
                      {diffNeutral
                        ? 'Cash matches perfectly'
                        : diffPositive
                        ? `LKR ${Math.abs(cashDiff).toFixed(2)} surplus`
                        : `LKR ${Math.abs(cashDiff).toFixed(2)} short`
                      }
                    </span>
                  </div>
                )}
              </div>
            </Card>

            <Card title="Notes (optional)">
              <textarea
                rows={3}
                placeholder="Any discrepancy explanation, end-of-day remarks..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </Card>

            <Button
              onClick={handleClose}
              loading={submitting}
              className="w-full justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Close Day & Lock
            </Button>
            <p className="text-xs text-[var(--color-text-secondary)] text-center">
              Once closed, this day's record cannot be edited.
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function ClosedSummary({ s }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <Card title="Day Summary">
        <SummaryRow label="Total Patients"  value={s.total_patients} />
        <SummaryRow label="Total Invoices"  value={s.total_invoices} />
        <SummaryRow label="Total Billed"    value={formatCurrency(s.total_billed)} />
        <SummaryRow label="Total Collected" value={formatCurrency(s.total_collected)} bold />
        <SummaryRow label="Outstanding"     value={formatCurrency(s.outstanding_balance)}
          valueClass={parseFloat(s.outstanding_balance) > 0 ? 'text-[var(--color-danger)] font-semibold' : ''} />
      </Card>
      <Card title="Payment Breakdown">
        <SummaryRow label="Cash collected"   value={formatCurrency(s.cash_system)} />
        <SummaryRow label="Cash counted"     value={formatCurrency(s.cash_counted)} />
        <SummaryRow label="Difference"
          value={`${parseFloat(s.cash_difference) >= 0 ? '+' : ''}${formatCurrency(s.cash_difference)}`}
          valueClass={parseFloat(s.cash_difference) === 0 ? 'text-[var(--color-success,#16a34a)]' : 'text-[var(--color-danger)]'}
        />
        <div className="border-t border-[var(--color-border)] mt-2 pt-2">
          <SummaryRow label="Card"      value={formatCurrency(s.card_total)} />
          <SummaryRow label="Online"    value={formatCurrency(s.online_total)} />
          <SummaryRow label="Insurance" value={formatCurrency(s.insurance_total)} />
        </div>
        {s.notes && (
          <p className="mt-3 text-xs text-[var(--color-text-secondary)] italic">Notes: {s.notes}</p>
        )}
      </Card>
    </div>
  );
}

function SummaryRow({ label, value, bold, valueClass = '' }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-[var(--color-text)]' : ''} ${valueClass}`}>{value}</span>
    </div>
  );
}
