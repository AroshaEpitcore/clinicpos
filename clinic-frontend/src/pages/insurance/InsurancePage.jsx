import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, RefreshCw, Search, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useAuth }        from '../../store/AuthContext';
import { insuranceApi }   from '../../api/insurance';
import { PageLayout }     from '../../components/layout/PageLayout';
import { Modal }          from '../../components/ui/Modal';
import { Button }         from '../../components/ui/Button';
import { Input }          from '../../components/ui/Input';
import { Select }         from '../../components/ui/Select';
import { Badge }          from '../../components/ui/Badge';

// ── helpers ───────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Pending'   },
  { value: 'submitted', label: 'Submitted' },
  { value: 'approved',  label: 'Approved'  },
  { value: 'partial',   label: 'Partial'   },
  { value: 'rejected',  label: 'Rejected'  },
];

const STATUS_VARIANT = {
  pending:   'warning',
  submitted: 'primary',
  approved:  'success',
  partial:   'warning',
  rejected:  'danger',
};

function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANT[status] || 'neutral'} label={status.charAt(0).toUpperCase() + status.slice(1)} />;
}

function fmt(n) { return parseFloat(n || 0).toLocaleString(); }

// ══════════════════════════════════════════════════════════════════════════════
// CLAIMS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ClaimsTab({ providers, isAdmin }) {
  const [claims,       setClaims]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [showNew,      setShowNew]      = useState(false);
  const [editClaim,    setEditClaim]    = useState(null);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status    = filterStatus;
      if (dateFrom)               params.date_from = dateFrom;
      if (dateTo)                 params.date_to   = dateTo;
      const res = await insuranceApi.getClaims(params);
      setClaims(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filterStatus, dateFrom, dateTo]);

  const stats = {
    total:     claims.length,
    pending:   claims.filter(c => c.status === 'pending').length,
    submitted: claims.filter(c => c.status === 'submitted').length,
    approved:  claims.filter(c => ['approved','partial'].includes(c.status)).length,
    claimed:   claims.reduce((s, c) => s + parseFloat(c.amount_claimed || 0), 0),
    approved_amt: claims.reduce((s, c) => s + parseFloat(c.amount_approved || 0), 0),
  };

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Claims',    value: stats.total,                  color: '' },
          { label: 'Pending',         value: stats.pending,                color: 'text-[var(--color-warning)]' },
          { label: 'Submitted',       value: stats.submitted,              color: 'text-[var(--color-primary)]' },
          { label: 'Approved',        value: stats.approved,               color: 'text-[var(--color-success)]' },
          { label: 'Total Claimed',   value: fmt(stats.claimed),           color: '' },
        ].map(s => (
          <div key={s.label} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] p-3">
            <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
            <p className={clsx('text-lg font-semibold text-[var(--color-text)]', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + New button */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
        >
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          title="Date from"
          className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          title="Date to"
          className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]" />
        <button onClick={load}
          className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        {isAdmin && (
          <div className="ml-auto">
            <Button onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4" /> New Claim
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">Loading...</div>
      ) : claims.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">No claims found.</div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                {['Claim #', 'Patient', 'Invoice', 'Provider', 'Claimed', 'Approved', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {claims.map(c => (
                <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--color-primary)]">{c.claim_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text)]">{c.patient_name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{c.patient_code}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--color-text-secondary)]">{c.invoice_number}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)] text-xs">{c.provider_name || '—'}</td>
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{fmt(c.amount_claimed)}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{c.amount_approved ? fmt(c.amount_approved) : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {new Date(c.claim_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && !['approved','rejected'].includes(c.status) && (
                      <button onClick={() => setEditClaim(c)}
                        className="text-xs text-[var(--color-primary)] hover:underline whitespace-nowrap">
                        Update Status
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewClaimModal
          providers={providers}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); }}
        />
      )}
      {editClaim && (
        <UpdateStatusModal
          claim={editClaim}
          onClose={() => setEditClaim(null)}
          onSaved={() => { setEditClaim(null); load(); }}
        />
      )}
    </div>
  );
}

// ── New Claim Modal ───────────────────────────────────────────────────────────
function NewClaimModal({ providers, onClose, onSaved }) {
  const [invoiceNumber,   setInvoiceNumber]   = useState('');
  const [resolvedInvoice, setResolvedInvoice] = useState(null);
  const [lookingUp,       setLookingUp]       = useState(false);
  const [providerId,      setProviderId]      = useState('none');
  const [amountClaimed,   setAmountClaimed]   = useState('');
  const [claimDate,       setClaimDate]       = useState(new Date().toISOString().slice(0, 10));
  const [notes,           setNotes]           = useState('');
  const [saving,          setSaving]          = useState(false);

  async function lookupInvoice() {
    if (!invoiceNumber.trim()) return;
    setLookingUp(true);
    setResolvedInvoice(null);
    try {
      const res = await insuranceApi.lookupInvoice(invoiceNumber.trim());
      const inv = res.data.data;
      setResolvedInvoice(inv);
      setAmountClaimed(String(inv.total_amount));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invoice not found');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSave() {
    if (!resolvedInvoice) return toast.error('Please look up a valid invoice first');
    if (!amountClaimed || parseFloat(amountClaimed) <= 0) return toast.error('Amount claimed must be greater than zero');
    setSaving(true);
    try {
      await insuranceApi.createClaim({
        invoice_id:    resolvedInvoice.invoice_id,
        patient_id:    resolvedInvoice.patient_id,
        provider_id:   providerId === 'none' ? null : parseInt(providerId),
        amount_claimed: parseFloat(amountClaimed),
        claim_date:    claimDate,
        notes:         notes || null,
      });
      toast.success('Claim created successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const providerOptions = [
    { value: 'none', label: 'No provider' },
    ...providers.filter(p => p.is_active).map(p => ({ value: String(p.id), label: p.name })),
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title="New Insurance Claim"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Create Claim</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Invoice lookup */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">
            Invoice Number <span className="text-[var(--color-danger)]">*</span>
          </label>
          <div className="flex gap-2">
            <input
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lookupInvoice()}
              placeholder="INV-00001"
              className="flex-1 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
            />
            <Button variant="secondary" onClick={lookupInvoice} loading={lookingUp}>
              <Search className="w-4 h-4" /> Lookup
            </Button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">Type the invoice number and click Lookup to auto-fill patient details.</p>
        </div>

        {/* Resolved invoice info box */}
        {resolvedInvoice && (
          <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)] rounded-[var(--radius)] p-3 text-sm">
            <p className="font-semibold text-[var(--color-primary)]">{resolvedInvoice.invoice_number}</p>
            <p className="text-[var(--color-text)] mt-0.5">{resolvedInvoice.patient_name}
              <span className="text-[var(--color-text-secondary)] ml-2 text-xs">{resolvedInvoice.patient_code}</span>
            </p>
            <p className="text-[var(--color-text-secondary)] text-xs mt-0.5">Invoice total: {fmt(resolvedInvoice.total_amount)}</p>
          </div>
        )}

        <Select
          label="Insurance Provider"
          options={providerOptions}
          value={providerId}
          onValueChange={setProviderId}
        />

        <Input
          label="Amount Claimed"
          required
          type="number"
          min="0"
          step="0.01"
          value={amountClaimed}
          onChange={e => setAmountClaimed(e.target.value)}
          placeholder="0.00"
        />

        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">Claim Date</label>
          <input
            type="date"
            value={claimDate}
            onChange={e => setClaimDate(e.target.value)}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Policy number, authorization code, reference..."
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

// ── Update Status Modal ───────────────────────────────────────────────────────
function UpdateStatusModal({ claim, onClose, onSaved }) {
  const [status,         setStatus]         = useState(claim.status);
  const [amountApproved, setAmountApproved] = useState(claim.amount_approved || '');
  const [notes,          setNotes]          = useState(claim.notes || '');
  const [saving,         setSaving]         = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await insuranceApi.updateClaimStatus(claim.id, {
        status,
        amount_approved: amountApproved ? parseFloat(amountApproved) : null,
        notes:           notes || null,
      });
      toast.success('Changes saved successfully');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const needsAmount = status === 'approved' || status === 'partial';

  return (
    <Modal
      open
      onClose={onClose}
      title={`Update Claim — ${claim.claim_number}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save Changes</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="bg-[var(--color-bg)] rounded-[var(--radius)] p-3 text-sm border border-[var(--color-border)]">
          <p className="font-medium text-[var(--color-text)]">{claim.patient_name}</p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            {claim.invoice_number} · Claimed: {fmt(claim.amount_claimed)}
            {claim.provider_name && <> · {claim.provider_name}</>}
          </p>
        </div>

        <Select
          label="New Status"
          required
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
        />

        {needsAmount && (
          <Input
            label={status === 'partial' ? 'Amount Approved (partial)' : 'Amount Approved'}
            type="number"
            min="0"
            step="0.01"
            value={amountApproved}
            onChange={e => setAmountApproved(e.target.value)}
            placeholder="0.00"
          />
        )}

        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Approval reference number, rejection reason..."
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDERS TAB
// ══════════════════════════════════════════════════════════════════════════════
function ProvidersTab({ providers, onRefresh, isAdmin }) {
  const [showModal, setShowModal] = useState(null); // null | 'add' | provider object
  const [deleting,  setDeleting]  = useState(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await insuranceApi.deleteProvider(id);
      toast.success('Deleted successfully');
      onRefresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {providers.length} provider{providers.length !== 1 ? 's' : ''}
        </p>
        {isAdmin && (
          <Button onClick={() => setShowModal('add')}>
            <Plus className="w-4 h-4" /> Add Provider
          </Button>
        )}
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">No insurance providers added yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                {['Name', 'Contact Person', 'Phone', 'Email', 'Notes', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.map(p => (
                <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{p.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{p.contact_person || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{p.email || '—'}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-[200px] truncate">{p.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.is_active ? 'success' : 'neutral'} label={p.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    {isAdmin && (
                      <div className="flex gap-3">
                        <button onClick={() => setShowModal(p)} className="text-xs text-[var(--color-primary)] hover:underline">Edit</button>
                        <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                          className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50">Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ProviderModal
          provider={showModal === 'add' ? null : showModal}
          onClose={() => setShowModal(null)}
          onSaved={() => { setShowModal(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

function ProviderModal({ provider, onClose, onSaved }) {
  const [name,          setName]          = useState(provider?.name          || '');
  const [contactPerson, setContactPerson] = useState(provider?.contact_person || '');
  const [phone,         setPhone]         = useState(provider?.phone          || '');
  const [email,         setEmail]         = useState(provider?.email          || '');
  const [notes,         setNotes]         = useState(provider?.notes          || '');
  const [saving,        setSaving]        = useState(false);

  async function handleSave() {
    if (!name.trim()) return toast.error('Please fill in all required fields');
    setSaving(true);
    try {
      if (provider) {
        await insuranceApi.updateProvider(provider.id, { name, contact_person: contactPerson, phone, email, notes });
      } else {
        await insuranceApi.createProvider({ name, contact_person: contactPerson, phone, email, notes });
      }
      toast.success(provider ? 'Changes saved successfully' : `'${name}' created successfully`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={provider ? 'Edit Insurance Provider' : 'Add Insurance Provider'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Provider Name" required value={name} onChange={e => setName(e.target.value)} placeholder="Ceylinco Life Insurance" />
        <Input label="Contact Person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="Claims manager name" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+94 11 2 999 999" />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="claims@insurer.lk" />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Pre-authorization requirements, claim form details..."
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] resize-none" />
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CORPORATE ACCOUNTS TAB
// ══════════════════════════════════════════════════════════════════════════════
function CorporateTab({ isAdmin }) {
  const [accounts,    setAccounts]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(null);
  const [showSummary, setShowSummary] = useState(null);
  const [deleting,    setDeleting]    = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await insuranceApi.getCorporateAccounts();
      setAccounts(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await insuranceApi.deleteCorporateAccount(id);
      toast.success('Deleted successfully');
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          {accounts.length} corporate account{accounts.length !== 1 ? 's' : ''}
        </p>
        {isAdmin && (
          <Button onClick={() => setShowModal('add')}>
            <Plus className="w-4 h-4" /> Add Corporate Account
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 text-sm text-[var(--color-text-secondary)]">No corporate accounts added yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <tr>
                {['Company', 'Contact', 'Phone', 'Billing Cycle', 'Credit Limit', 'Patients', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]">
                  <td className="px-4 py-3 font-medium text-[var(--color-text)]">{a.company_name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{a.contact_person || '—'}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{a.phone || '—'}</td>
                  <td className="px-4 py-3 capitalize text-[var(--color-text-secondary)]">{a.billing_cycle}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{a.credit_limit ? fmt(a.credit_limit) : '—'}</td>
                  <td className="px-4 py-3 text-center font-medium text-[var(--color-text)]">{a.patient_count}</td>
                  <td className="px-4 py-3">
                    <Badge variant={a.is_active ? 'success' : 'neutral'} label={a.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => setShowSummary(a)} className="text-xs text-[var(--color-primary)] hover:underline">Summary</button>
                      {isAdmin && (
                        <>
                          <button onClick={() => setShowModal(a)} className="text-xs text-[var(--color-primary)] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(a.id)} disabled={deleting === a.id}
                            className="text-xs text-[var(--color-danger)] hover:underline disabled:opacity-50">Delete</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CorporateModal
          account={showModal === 'add' ? null : showModal}
          onClose={() => setShowModal(null)}
          onSaved={() => { setShowModal(null); load(); }}
        />
      )}
      {showSummary && (
        <CorporateSummaryModal account={showSummary} onClose={() => setShowSummary(null)} />
      )}
    </div>
  );
}

function CorporateModal({ account, onClose, onSaved }) {
  const [companyName,   setCompanyName]   = useState(account?.company_name   || '');
  const [contactPerson, setContactPerson] = useState(account?.contact_person || '');
  const [phone,         setPhone]         = useState(account?.phone          || '');
  const [email,         setEmail]         = useState(account?.email          || '');
  const [address,       setAddress]       = useState(account?.address        || '');
  const [billingCycle,  setBillingCycle]  = useState(account?.billing_cycle  || 'monthly');
  const [creditLimit,   setCreditLimit]   = useState(account?.credit_limit   || '');
  const [notes,         setNotes]         = useState(account?.notes          || '');
  const [saving,        setSaving]        = useState(false);

  async function handleSave() {
    if (!companyName.trim()) return toast.error('Please fill in all required fields');
    setSaving(true);
    try {
      const payload = {
        company_name:   companyName,
        contact_person: contactPerson,
        phone, email, address,
        billing_cycle:  billingCycle,
        credit_limit:   creditLimit || null,
        notes,
      };
      if (account) {
        await insuranceApi.updateCorporateAccount(account.id, payload);
      } else {
        await insuranceApi.createCorporateAccount(payload);
      }
      toast.success(account ? 'Changes saved successfully' : `'${companyName}' created successfully`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={account ? 'Edit Corporate Account' : 'Add Corporate Account'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Company Name" required value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="ABC Corporation Pvt Ltd" />
        <Input label="Contact Person" value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="HR Manager name" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Input label="Address" value={address} onChange={e => setAddress(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-[var(--color-text)] block mb-1">Billing Cycle</label>
            <select value={billingCycle} onChange={e => setBillingCycle(e.target.value)}
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <Input label="Credit Limit" type="number" min="0" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} placeholder="0.00" />
        </div>
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] resize-none" />
        </div>
      </div>
    </Modal>
  );
}

function CorporateSummaryModal({ account, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month,   setMonth]   = useState(new Date().toISOString().slice(0, 7));

  async function load() {
    setLoading(true);
    try {
      const res = await insuranceApi.getCorporateSummary(account.id, month);
      setSummary(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [month]);

  return (
    <Modal open onClose={onClose} title={`${account.company_name} — Monthly Summary`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[var(--color-text-secondary)]">Month:</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="px-3 py-1.5 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)]" />
        </div>

        {loading ? (
          <div className="text-center py-8 text-sm text-[var(--color-text-secondary)]">Loading...</div>
        ) : !summary ? null : (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Invoices',     value: summary.invoice_count },
                { label: 'Total Billed', value: fmt(summary.total_billed) },
                { label: 'Unpaid',       value: fmt(summary.total_unpaid) },
              ].map(s => (
                <div key={s.label} className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius)] p-3 text-center">
                  <p className="text-xs text-[var(--color-text-secondary)]">{s.label}</p>
                  <p className="text-base font-semibold text-[var(--color-text)]">{s.value}</p>
                </div>
              ))}
            </div>

            {summary.invoices.length === 0 ? (
              <p className="text-center text-sm text-[var(--color-text-secondary)] py-4">No invoices for this month.</p>
            ) : (
              <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--color-border)] max-h-72 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--color-bg)] border-b border-[var(--color-border)] sticky top-0">
                    <tr>
                      {['Invoice #', 'Patient', 'Date', 'Amount', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.invoices.map(inv => (
                      <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg)]">
                        <td className="px-3 py-2 font-mono text-xs text-[var(--color-primary)]">{inv.invoice_number}</td>
                        <td className="px-3 py-2">
                          <p className="text-[var(--color-text)]">{inv.patient_name}</p>
                          <p className="text-xs text-[var(--color-text-secondary)]">{inv.patient_code}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-[var(--color-text-secondary)]">
                          {new Date(inv.invoice_date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 font-medium text-[var(--color-text)]">{fmt(inv.total_amount)}</td>
                        <td className="px-3 py-2"><Badge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function InsurancePage() {
  const { user }     = useAuth();
  const [activeTab,  setActiveTab]  = useState('claims');
  const [providers,  setProviders]  = useState([]);

  const isAdmin = user?.role === 'admin' || user?.role === 'receptionist';

  async function loadProviders() {
    try {
      const res = await insuranceApi.getProviders();
      setProviders(res.data.data);
    } catch { /* silent — providers not critical to page load */ }
  }

  useEffect(() => { loadProviders(); }, []);

  const TABS = [
    { key: 'claims',    label: 'Claims' },
    { key: 'providers', label: 'Insurance Providers' },
    { key: 'corporate', label: 'Corporate Accounts' },
  ];

  return (
    <PageLayout>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-[var(--radius)] bg-[var(--color-primary-light)] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">Insurance</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Claims, providers, and corporate billing</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--color-border)] mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              activeTab === t.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'claims' && (
        <ClaimsTab providers={providers} isAdmin={isAdmin} />
      )}
      {activeTab === 'providers' && (
        <ProvidersTab providers={providers} onRefresh={loadProviders} isAdmin={isAdmin} />
      )}
      {activeTab === 'corporate' && (
        <CorporateTab isAdmin={isAdmin} />
      )}
    </PageLayout>
  );
}
