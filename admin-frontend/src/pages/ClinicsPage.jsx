import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ChevronRight, Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { adminTenantsApi } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

const STATUS_TABS = ['all', 'active', 'suspended'];

// ── Copy field for credentials screen ────────────────────────────────────────
function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      <p className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-[var(--radius)] px-3 py-2">
        <span className="flex-1 text-sm font-mono text-[var(--color-text)] break-all">{value}</span>
        <button onClick={copy} className="shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
          {copied ? <Check className="w-4 h-4 text-[var(--color-success)]" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Create clinic modal ────────────────────────────────────────────────────────
function CreateClinicModal({ open, onClose, onCreated }) {
  const EMPTY = { clinic_name: '', subdomain: '', owner_email: '', owner_phone: '', initial_password: '' };
  const [form,        setForm]        = useState(EMPTY);
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState({});
  const [credentials, setCredentials] = useState(null);

  function onChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function onNameBlur() {
    if (!form.subdomain && form.clinic_name) {
      const slug = form.clinic_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setForm(f => ({ ...f, subdomain: slug }));
    }
  }

  async function handleSave() {
    const errs = {};
    if (!form.clinic_name)      errs.clinic_name      = 'Required';
    if (!form.subdomain)        errs.subdomain        = 'Required';
    if (!form.owner_email)      errs.owner_email      = 'Required';
    if (!form.initial_password) errs.initial_password = 'Required';
    if (form.initial_password && form.initial_password.length < 6) errs.initial_password = 'Minimum 6 characters';
    if (form.subdomain && !/^[a-z0-9-]+$/.test(form.subdomain)) errs.subdomain = 'Lowercase letters, numbers, hyphens only';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const res = await adminTenantsApi.create(form);
      onCreated(res.data.data.tenant);
      setCredentials(res.data.data.login);
      toast.success(`'${form.clinic_name}' created successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setCredentials(null);
    setForm(EMPTY);
    setErrors({});
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={credentials ? handleDone : onClose}
      title={credentials ? 'Clinic Created — Send Credentials' : 'Create New Clinic'}
      footer={credentials ? (
        <Button onClick={handleDone}>Done</Button>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>Create Clinic</Button>
        </>
      )}
    >
      {credentials ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Copy and send these login details to the clinic owner. The password is only shown once.
          </p>
          <div className="space-y-3">
            <CopyField label="Login URL" value={credentials.url} />
            <CopyField label="Email"     value={credentials.email} />
            <CopyField label="Password"  value={credentials.password} />
          </div>
          <div className="bg-[var(--color-warning-light)] border border-[var(--color-warning)] rounded-[var(--radius)] px-3 py-2 text-xs text-[var(--color-warning)]">
            Save or send these now — the password is not stored in plain text.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Clinic Name" required
                value={form.clinic_name}
                onChange={e => onChange('clinic_name', e.target.value)}
                onBlur={onNameBlur}
                placeholder="Sunshine Medical Centre"
                error={errors.clinic_name}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[var(--color-text)] block mb-1">
                Subdomain <span className="text-[var(--color-danger)]">*</span>
              </label>
              <div className="flex">
                <input
                  value={form.subdomain}
                  onChange={e => onChange('subdomain', e.target.value)}
                  placeholder="sunshine"
                  className={`w-full px-3 py-2 rounded-l-[var(--radius)] border border-r-0 text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.subdomain ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                />
                <span className="px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-r-[var(--radius)] text-xs text-[var(--color-text-secondary)] whitespace-nowrap">.clinicpos.com</span>
              </div>
              {errors.subdomain && <p className="text-[var(--color-danger)] text-xs mt-1">{errors.subdomain}</p>}
            </div>

            <Input
              label="Owner Email" type="email" required
              value={form.owner_email}
              onChange={e => onChange('owner_email', e.target.value)}
              placeholder="owner@clinic.com"
              error={errors.owner_email}
            />

            <Input
              label="Owner Phone"
              value={form.owner_phone}
              onChange={e => onChange('owner_phone', e.target.value)}
              placeholder="077 123 4567"
            />

            <div className="col-span-2">
              <Input
                label="Initial Admin Password" type="text" required
                value={form.initial_password}
                onChange={e => onChange('initial_password', e.target.value)}
                placeholder="Min. 6 characters"
                error={errors.initial_password}
              />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Creates the first admin login for the clinic. You will see the credentials after creation.
              </p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics,     setClinics]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [rawSearch,   setRawSearch]   = useState('');
  const [search,      setSearch]      = useState('');
  const [statusTab,   setStatusTab]   = useState('all');
  const [showCreate,  setShowCreate]  = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(rawSearch), 300);
    return () => clearTimeout(t);
  }, [rawSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)              params.search = search;
      if (statusTab !== 'all') params.status = statusTab;
      const res = await adminTenantsApi.list(params);
      setClinics(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, statusTab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Clinics</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            {loading ? 'Loading…' : `${clinics.length} clinic${clinics.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          New Clinic
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search with X clear */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
          <input
            placeholder="Search by name, subdomain, or email…"
            value={rawSearch}
            onChange={e => setRawSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          {rawSearch && (
            <button
              onClick={() => { setRawSearch(''); setSearch(''); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status tabs */}
        <div className="flex rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden shrink-0">
          {STATUS_TABS.map(t => (
            <button
              key={t}
              onClick={() => setStatusTab(t)}
              className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                statusTab === t
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] bg-[var(--color-surface)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card noPadding>
        {loading ? (
          <div className="p-5">
            <LoadingState message="Loading clinics..." />
          </div>
        ) : clinics.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clinics found"
            description={rawSearch || statusTab !== 'all' ? 'Try adjusting your filters.' : 'Create your first clinic to get started.'}
            action={
              (rawSearch || statusTab !== 'all') ? (
                <Button size="sm" variant="secondary" onClick={() => { setRawSearch(''); setSearch(''); setStatusTab('all'); }}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => setShowCreate(true)}>New Clinic</Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-bg)] text-left border-b border-[var(--color-border)]">
                  <th className="px-5 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Clinic</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Owner</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Modules</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {clinics.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-[var(--color-bg)] cursor-pointer transition-colors"
                    onClick={() => navigate(`/clinics/${c.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[var(--color-text)]">{c.clinic_name}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{c.subdomain}.clinicpos.com</p>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--color-text-secondary)] text-xs">{c.owner_email}</td>
                    <td className="px-4 py-3.5"><Badge status={c.status} label={c.status} /></td>
                    <td className="px-4 py-3.5 text-[var(--color-text-secondary)] text-xs">
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-medium ${parseInt(c.active_flags) > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                        {c.active_flags} on
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-[var(--color-border)]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateClinicModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={tenant => setClinics(prev => [tenant, ...prev])}
      />
    </div>
  );
}
