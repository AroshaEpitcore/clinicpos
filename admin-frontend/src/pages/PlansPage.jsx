import { useState, useEffect } from 'react';
import { CreditCard, Plus, Edit2, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { adminPlansApi } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/Spinner';

function fmtPrice(v) {
  if (v == null) return '—';
  return `LKR ${parseFloat(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Plan modal (create / edit) ─────────────────────────────────────────────────
function PlanModal({ open, onClose, plan, onSaved }) {
  const blank = { name: '', billing_cycle: 'monthly', price: '' };
  const [form,   setForm]   = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(plan
        ? {
            name:          plan.name,
            billing_cycle: plan.billing_cycle || 'monthly',
            price:         plan.billing_cycle === 'yearly' ? plan.yearly_price : plan.monthly_price,
          }
        : blank
      );
    }
  }, [open, plan]);

  async function handleSave() {
    if (!form.name || form.price === '') {
      return toast.error('Plan name and price are required');
    }
    setSaving(true);
    // Store price in the correct column based on billing_cycle
    const body = {
      name:          form.name,
      billing_cycle: form.billing_cycle,
      monthly_price: form.billing_cycle === 'monthly' ? form.price : 0,
      yearly_price:  form.billing_cycle === 'yearly'  ? form.price : 0,
    };
    try {
      const res = plan
        ? await adminPlansApi.update(plan.id, body)
        : await adminPlansApi.create(body);
      toast.success(plan ? 'Plan updated' : 'Plan created');
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
      title={plan ? `Edit Plan — ${plan.name}` : 'New Plan'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-3.5 h-3.5" /> {plan ? 'Save Changes' : 'Create Plan'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Plan Name" required
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Basic"
        />

        {/* Billing cycle */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Billing Cycle</label>
          <div className="flex gap-3">
            {['monthly', 'yearly'].map(cycle => (
              <button
                key={cycle}
                type="button"
                onClick={() => setForm(f => ({ ...f, billing_cycle: cycle }))}
                className={`flex-1 py-2.5 rounded-[var(--radius)] border text-sm font-medium transition-colors ${
                  form.billing_cycle === cycle
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]'
                }`}
              >
                {cycle === 'monthly' ? 'Per Month' : 'Per Year'}
              </button>
            ))}
          </div>
        </div>

        <Input
          label={`Price (LKR) — per ${form.billing_cycle === 'monthly' ? 'month' : 'year'}`} required
          type="number" min="0" step="0.01"
          value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          placeholder={form.billing_cycle === 'monthly' ? '10000.00' : '50000.00'}
        />
      </div>
    </Modal>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans,            setPlans]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [showModal,        setShowModal]        = useState(false);
  const [editPlan,         setEditPlan]         = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating,     setDeactivating]     = useState(false);

  useEffect(() => {
    adminPlansApi.list()
      .then(res => setPlans(res.data.data))
      .catch(() => toast.error('Could not load plans'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDeactivate() {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await adminPlansApi.deactivate(deactivateTarget.id);
      setPlans(prev => prev.map(p =>
        p.id === deactivateTarget.id ? { ...p, is_active: false } : p
      ));
      toast.success('Plan deactivated');
      setDeactivateTarget(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setDeactivating(false);
    }
  }

  function handleSaved(plan) {
    setPlans(prev => {
      const idx = prev.findIndex(p => p.id === plan.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = plan;
        return next;
      }
      return [...prev, plan];
    });
  }

  const active   = plans.filter(p =>  p.is_active).length;
  const inactive = plans.filter(p => !p.is_active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Subscription Plans</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {active} active{inactive > 0 ? `, ${inactive} inactive` : ''}
          </p>
        </div>
        <Button onClick={() => { setEditPlan(null); setShowModal(true); }}>
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {loading ? (
        <LoadingState message="Loading plans…" />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No plans yet"
          description="Create your first subscription plan to start assigning to clinics"
          action={
            <Button onClick={() => { setEditPlan(null); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> Create Plan
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`rounded-[var(--radius-lg)] border bg-[var(--color-surface)] overflow-hidden transition-opacity ${
                plan.is_active ? 'border-[var(--color-border)]' : 'border-[var(--color-border)] opacity-50'
              }`}
            >
              {/* Card header */}
              <div className="px-5 pt-5 pb-4 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-base text-[var(--color-text)]">{plan.name}</p>
                    {plan.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{plan.description}</p>
                    )}
                  </div>
                  {!plan.is_active && (
                    <span className="shrink-0 text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-bg)] border border-[var(--color-border)] px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="px-5 py-5 text-center">
                <p className="text-3xl font-bold text-[var(--color-text)]">
                  {fmtPrice(plan.billing_cycle === 'monthly' ? plan.monthly_price : plan.yearly_price)}
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  per {plan.billing_cycle === 'monthly' ? 'month' : 'year'}
                </p>
              </div>

              {/* Actions */}
              <div className="px-5 py-3 flex items-center gap-2 border-t border-[var(--color-border)]">
                <Button
                  size="sm" variant="secondary" className="flex-1"
                  onClick={() => { setEditPlan(plan); setShowModal(true); }}
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
                {plan.is_active && (
                  <Button
                    size="sm" variant="danger"
                    onClick={() => setDeactivateTarget(plan)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <PlanModal
        open={showModal}
        onClose={() => setShowModal(false)}
        plan={editPlan}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={deactivating}
        title="Deactivate Plan"
        message={`Deactivate "${deactivateTarget?.name}"? Clinics already on this plan won't be affected, but it won't be assignable to new clinics.`}
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
