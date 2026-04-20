import { useState, useEffect } from 'react';
import {
  CreditCard, RefreshCw, Save, CheckCircle, Clock, XCircle, Search, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminSubscriptionsApi, adminPlansApi } from '../api/admin';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingState } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLabel(days) {
  if (days == null) return null;
  const n = parseInt(days, 10);
  if (n < 0)  return { text: `Expired ${Math.abs(n)}d ago`, color: 'text-[var(--color-danger)]' };
  if (n === 0) return { text: 'Expires today',              color: 'text-[var(--color-warning,#d97706)]' };
  if (n <= 7)  return { text: `${n}d left`,                 color: 'text-[var(--color-warning,#d97706)]' };
  return           { text: `${n}d left`,                    color: 'text-[var(--color-success)]' };
}

function StatusIcon({ status }) {
  if (status === 'active')    return <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />;
  if (status === 'suspended') return <XCircle     className="w-4 h-4 text-[var(--color-danger)]" />;
  return <Clock className="w-4 h-4 text-[var(--color-text-secondary)]" />;
}

// ── Set Plan Modal ─────────────────────────────────────────────────────────────
function SetPlanModal({ open, onClose, clinic, plans, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form,   setForm]   = useState({ plan_id: '', plan_type: 'monthly', start_date: today });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && clinic) {
      setForm({
        plan_id:    clinic.plan_id || (plans[0]?.id ?? ''),
        start_date: today,
      });
    }
  }, [open, clinic]);

  const selectedPlan = plans.find(p => p.id === form.plan_id);

  async function handleSave() {
    if (!form.plan_id || !form.start_date) return toast.error('Please fill all fields');
    setSaving(true);
    try {
      const res = await adminSubscriptionsApi.setplan(clinic.id, form);
      toast.success(`Subscription assigned to ${clinic.clinic_name}`);
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Set Subscription — ${clinic?.clinic_name || ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-3.5 h-3.5" /> Assign Plan
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Plan selector */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Plan <span className="text-[var(--color-danger)]">*</span></label>
          <select
            value={form.plan_id}
            onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Select a plan…</option>
            {plans.filter(p => p.is_active).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Start date */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Start Date <span className="text-[var(--color-danger)]">*</span></label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Preview */}
        {selectedPlan && form.start_date && (
          <div className="rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-[var(--color-text)]">{selectedPlan.name}</p>
            <p className="text-[var(--color-text-secondary)]">
              LKR {(selectedPlan.billing_cycle === 'monthly' ? selectedPlan.monthly_price : selectedPlan.yearly_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              {' per '}{selectedPlan.billing_cycle === 'monthly' ? 'month' : 'year'}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Valid until{' '}
              {(() => {
                const d = new Date(form.start_date);
                selectedPlan.billing_cycle === 'monthly'
                  ? d.setMonth(d.getMonth() + 1)
                  : d.setFullYear(d.getFullYear() + 1);
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              })()}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function SubscriptionsPage() {
  const [subs,       setSubs]       = useState([]);
  const [plans,      setPlans]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [setPlanFor, setSetPlanFor] = useState(null);
  const [renewFor,   setRenewFor]   = useState(null);
  const [renewing,   setRenewing]   = useState(false);

  useEffect(() => {
    Promise.all([
      adminSubscriptionsApi.list(),
      adminPlansApi.list(),
    ]).then(([subsRes, plansRes]) => {
      setSubs(subsRes.data.data);
      setPlans(plansRes.data.data);
    }).catch(() => toast.error('Could not load subscriptions'))
      .finally(() => setLoading(false));
  }, []);

  async function handleRenew() {
    if (!renewFor) return;
    setRenewing(true);
    try {
      await adminSubscriptionsApi.renew(renewFor.id);
      toast.success(`Subscription renewed for ${renewFor.clinic_name}`);
      setRenewFor(null);
      // Reload
      const res = await adminSubscriptionsApi.list();
      setSubs(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Renewal failed');
    } finally {
      setRenewing(false);
    }
  }

  const bq = search.trim().toLowerCase();
  const filtered = bq
    ? subs.filter(s =>
        s.clinic_name.toLowerCase().includes(bq) ||
        (s.plan_name || '').toLowerCase().includes(bq) ||
        s.subdomain.toLowerCase().includes(bq)
      )
    : subs;

  const active   = subs.filter(s => s.status === 'active').length;
  const suspended = subs.filter(s => s.status === 'suspended').length;
  const expiring  = subs.filter(s => { const d = parseInt(s.days_remaining); return !isNaN(d) && d >= 0 && d <= 7; }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text)]">Subscriptions</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Assign plans and manage renewals for each clinic</p>
      </div>

      {/* Stats strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Active Clinics',  value: active,    color: 'text-[var(--color-success)]' },
            { label: 'Suspended',       value: suspended,  color: 'text-[var(--color-danger)]' },
            { label: 'Expiring in 7d',  value: expiring,   color: expiring > 0 ? 'text-[var(--color-warning,#d97706)]' : 'text-[var(--color-text)]' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] px-5 py-4">
              <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
        <input
          type="text"
          placeholder="Search clinic or plan…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState message="Loading subscriptions…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={bq ? 'No results' : 'No clinics found'}
          description={bq ? `No results for "${search}"` : 'No clinics yet'}
        />
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Clinic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Cycle</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Start</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Renewal Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const dl = daysLabel(s.days_remaining);
                return (
                  <tr key={s.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={s.status} />
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text)]">{s.clinic_name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{s.subdomain}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.plan_name
                        ? <span className="text-sm font-medium text-[var(--color-text)]">{s.plan_name}</span>
                        : <span className="text-xs text-[var(--color-text-secondary)] italic">No plan</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {s.plan_billing_cycle === 'monthly' ? 'Per Month' : s.plan_billing_cycle === 'yearly' ? 'Per Year' : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                      {formatDate(s.subscription_start)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-[var(--color-text-secondary)]">{formatDate(s.subscription_end)}</p>
                      {dl && <p className={`text-xs font-medium ${dl.color}`}>{dl.text}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={s.status} label={s.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setSetPlanFor(s)}>
                          {s.plan_id ? 'Change' : 'Set Plan'}
                        </Button>
                        {s.plan_id && (
                          <Button size="sm" variant="secondary" onClick={() => setRenewFor(s)}>
                            <RefreshCw className="w-3 h-3" /> Renew
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Set plan modal */}
      {setPlanFor && (
        <SetPlanModal
          open={!!setPlanFor}
          onClose={() => setSetPlanFor(null)}
          clinic={setPlanFor}
          plans={plans}
          onSaved={() => {
            setSetPlanFor(null);
            adminSubscriptionsApi.list().then(r => setSubs(r.data.data)).catch(() => {});
          }}
        />
      )}

      {/* Renew confirm */}
      <ConfirmDialog
        open={!!renewFor}
        onClose={() => setRenewFor(null)}
        onConfirm={handleRenew}
        loading={renewing}
        title="Renew Subscription"
        message={renewFor
          ? `Renew the ${renewFor.plan_type} subscription for "${renewFor.clinic_name}"? The new period will start from ${
              renewFor.subscription_end
                ? (() => { const d = new Date(renewFor.subscription_end); d.setDate(d.getDate() + 1); return formatDate(d); })()
                : 'today'
            }.`
          : ''}
        confirmLabel="Renew"
        variant="success"
      />
    </div>
  );
}
