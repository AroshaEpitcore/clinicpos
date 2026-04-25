import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, UserCheck, Edit2, Ban, CheckCircle,
  ExternalLink, AlertTriangle, Save, Copy, Check, CreditCard, RefreshCw,
  ScrollText, Search, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminTenantsApi, adminFlagsApi, adminPlansApi, adminSubscriptionsApi, adminSystemApi } from '../api/admin';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingState } from '../components/ui/Spinner';

const CLINIC_URL = import.meta.env.VITE_CLINIC_URL || 'http://localhost:5173';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysLabel(end) {
  if (!end) return null;
  const days = Math.round((new Date(end) - new Date()) / 86400000);
  if (days < 0)  return { text: `Expired ${Math.abs(days)}d ago`, color: 'text-[var(--color-danger)]' };
  if (days === 0) return { text: 'Expires today',                  color: 'text-[var(--color-warning,#d97706)]' };
  if (days <= 7)  return { text: `${days}d remaining`,             color: 'text-[var(--color-warning,#d97706)]' };
  return           { text: `${days}d remaining`,                   color: 'text-[var(--color-success)]' };
}

// ── Set Plan Modal (inline in detail page) ─────────────────────────────────────
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
      toast.success('Subscription assigned');
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Set Subscription"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}><Save className="w-3.5 h-3.5" /> Assign Plan</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Plan <span className="text-[var(--color-danger)]">*</span></label>
          <select
            value={form.plan_id}
            onChange={e => setForm(f => ({ ...f, plan_id: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            <option value="">Select a plan…</option>
            {plans.filter(p => p.is_active).map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — LKR {(p.billing_cycle === 'monthly' ? p.monthly_price : p.yearly_price).toLocaleString('en-US', { minimumFractionDigits: 2 })} / {p.billing_cycle === 'monthly' ? 'month' : 'year'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[var(--color-text)]">Start Date <span className="text-[var(--color-danger)]">*</span></label>
          <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
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
                selectedPlan.billing_cycle === 'monthly' ? d.setMonth(d.getMonth() + 1) : d.setFullYear(d.getFullYear() + 1);
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              })()}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

const ALL_MODULES = [
  { key: 'pharmacy',      label: 'Pharmacy',      description: 'Medicine dispensing & inventory' },
  { key: 'lab',           label: 'Lab',            description: 'Lab test requests and results' },
  { key: 'insurance',     label: 'Insurance',      description: 'Insurance claims & corporate billing' },
  { key: 'online_booking',label: 'Online Booking', description: 'Patient self-booking portal' },
  { key: 'multi_branch',  label: 'Multi Branch',   description: 'Multiple branch management' },
  { key: 'custom_domain', label: 'Custom Domain',  description: "Use clinic's own domain name" },
];

// ── Copy pill ──────────────────────────────────────────────────────────────────
function CopyPill({ value }) {
  const [copied, setCopied] = useState(false);
  function copy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors ml-1"
    >
      {copied ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// ── Edit clinic modal ──────────────────────────────────────────────────────────
function EditClinicModal({ open, onClose, clinic, onSaved }) {
  const [form,   setForm]   = useState({ clinic_name: '', owner_email: '', owner_phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinic) setForm({
      clinic_name: clinic.clinic_name  || '',
      owner_email: clinic.owner_email  || '',
      owner_phone: clinic.owner_phone  || '',
    });
  }, [clinic]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await adminTenantsApi.update(clinic.id, form);
      toast.success('Changes saved successfully');
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Clinic"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-3.5 h-3.5" />
            Save Changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Clinic Name"  value={form.clinic_name}  onChange={e => setForm(f => ({ ...f, clinic_name:  e.target.value }))} />
        <Input label="Owner Email"  type="email" value={form.owner_email}  onChange={e => setForm(f => ({ ...f, owner_email:  e.target.value }))} />
        <Input label="Owner Phone"  value={form.owner_phone}  onChange={e => setForm(f => ({ ...f, owner_phone:  e.target.value }))} placeholder="077 123 4567" />
      </div>
    </Modal>
  );
}

// ── Clinic Logs Tab ────────────────────────────────────────────────────────────
function ClinicLogsTab({ clinicId }) {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [statusClass, setStatusClass] = useState('');
  const limit      = 50;
  const totalPages = Math.ceil(total / limit);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = { page: p, limit, tenant_id: clinicId };
      if (search)      params.search       = search;
      if (statusClass) params.status_class = statusClass;
      const res = await adminSystemApi.logs(params);
      setLogs(res.data.data.logs  || []);
      setTotal(res.data.data.total || 0);
    } catch {
    } finally { setLoading(false); }
  }, [clinicId, search, statusClass]);

  useEffect(() => { setPage(1); load(1); }, [search, statusClass, clinicId]);
  useEffect(() => { load(page); }, [page]);

  function statusColor(code) {
    if (code >= 500) return 'bg-red-100 text-red-700';
    if (code >= 400) return 'bg-orange-100 text-orange-700';
    return 'bg-emerald-100 text-emerald-700';
  }
  function methodColor(m) {
    return { POST:'bg-blue-100 text-blue-700', PUT:'bg-amber-100 text-amber-700',
             DELETE:'bg-red-100 text-red-700', PATCH:'bg-purple-100 text-purple-700' }[m]
      || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
  }
  function roleColor(role) {
    return { admin:'bg-[var(--color-primary-light)] text-[var(--color-primary)]',
             doctor:'bg-emerald-100 text-emerald-700', nurse:'bg-purple-100 text-purple-700',
             receptionist:'bg-amber-100 text-amber-700', login:'bg-gray-100 text-gray-500' }[role]
      || 'bg-[var(--color-bg)] text-[var(--color-text-secondary)]';
  }
  function actionLabel(method, path) {
    const clean = path.replace('/api/v1', '').replace(/\/\d+/g, '/{id}');
    if (clean === '/auth/login') return 'Login';
    const map = {
      'POST /patients':'Patient registered','PUT /patients/{id}':'Patient updated',
      'POST /appointments':'Appointment created','PUT /appointments/{id}':'Appointment updated',
      'DELETE /appointments/{id}':'Appointment cancelled',
      'POST /consultations':'Consultation created','PUT /consultations/{id}':'Consultation updated',
      'POST /prescriptions':'Prescription created','POST /invoices':'Invoice created',
      'PUT /invoices/{id}':'Invoice updated','POST /medicines':'Medicine added',
      'PUT /medicines/{id}':'Medicine updated','DELETE /medicines/{id}':'Medicine deleted',
      'POST /staff':'Staff created','PUT /staff/{id}':'Staff updated',
      'PUT /settings':'Settings updated','POST /vitals':'Vitals recorded',
      'POST /pharmacy/dispense':'Prescription dispensed','POST /end-of-day':'End-of-day closed',
    };
    return map[`${method} ${clean}`] || `${method} ${clean}`;
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search path or email…"
            className="pl-7 pr-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
              bg-[var(--color-surface)] text-[var(--color-text)] w-48 focus:outline-none
              focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--color-text-secondary)]" />
        </div>
        <select value={statusClass} onChange={e => setStatusClass(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
            bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
          <option value="">All Status</option>
          <option value="2xx">2xx Success</option>
          <option value="4xx">4xx Errors</option>
          <option value="5xx">5xx Server Errors</option>
        </select>
        <button onClick={() => load(page)} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-[var(--radius)] border border-[var(--color-border)]
            text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)] disabled:opacity-50 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <span className="ml-auto text-xs text-[var(--color-text-secondary)]">{total.toLocaleString()} entries</span>
      </div>

      {/* Table */}
      <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                {['Timestamp','User','Action','Status','Duration'].map(h => (
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
                <tr key={log.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-4 py-3 font-mono text-[var(--color-text-secondary)] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'medium' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[var(--color-text)] truncate max-w-[160px]">{log.user_email || '—'}</div>
                    {log.user_role && (
                      <span className={`text-[0.65rem] px-1.5 py-0.5 rounded font-semibold ${roleColor(log.user_role)}`}>
                        {log.user_role === 'login' ? 'auth' : log.user_role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold font-mono ${methodColor(log.method)}`}>{log.method}</span>
                      <span className="text-[var(--color-text)]">{actionLabel(log.method, log.path)}</span>
                    </div>
                    <div className="font-mono text-[0.65rem] text-[var(--color-text-secondary)] mt-0.5">
                      {log.path.replace('/api/v1', '')}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold font-mono ${statusColor(log.status_code)}`}>{log.status_code}</span>
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
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-1.5 rounded-[var(--radius)] border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="p-1.5 rounded-[var(--radius)] border border-[var(--color-border)] disabled:opacity-40 hover:bg-[var(--color-bg)] transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClinicDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [clinic,        setClinic]        = useState(null);
  const [flags,         setFlags]         = useState({});
  const [plans,         setPlans]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('overview');
  const [showEdit,      setShowEdit]      = useState(false);
  const [showSetPlan,   setShowSetPlan]   = useState(false);
  const [showSuspend,   setShowSuspend]   = useState(false);
  const [showActivate,  setShowActivate]  = useState(false);
  const [showRenew,     setShowRenew]     = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flagSaving,    setFlagSaving]    = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [renewing,      setRenewing]      = useState(false);

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    adminPlansApi.list().then(res => setPlans(res.data.data)).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res  = await adminTenantsApi.get(id);
      const data = res.data.data;
      setClinic(data);
      const flagMap = {};
      (data.feature_flags || []).forEach(f => { flagMap[f.module] = f.enabled; });
      setFlags(flagMap);
    } catch {
      toast.error('Something went wrong. Please try again.');
      navigate('/clinics');
    } finally {
      setLoading(false);
    }
  }

  async function handleSuspend() {
    setActionLoading(true);
    try {
      const res = await adminTenantsApi.suspend(id);
      setClinic(res.data.data);
      toast.success('Clinic suspended');
      setShowSuspend(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleActivate() {
    setActionLoading(true);
    try {
      const res = await adminTenantsApi.activate(id);
      setClinic(res.data.data);
      toast.success('Clinic activated');
      setShowActivate(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await adminTenantsApi.impersonate(id);
      const d   = res.data.data;

      localStorage.setItem('clinic_token',     d.token);
      localStorage.setItem('clinic_user',      JSON.stringify({ ...d.staff, impersonated: true, impersonatedBy: 'superadmin' }));
      localStorage.setItem('clinic_info',      JSON.stringify({ name: d.clinic_name, logo_url: d.logo_url || null, currency: d.currency || 'LKR' }));
      localStorage.setItem('clinic_flags',     JSON.stringify(d.feature_flags));
      localStorage.setItem('clinic_subdomain', d.subdomain);

      toast.success(`Opening ${d.clinic_name} as admin…`);

      const params = new URLSearchParams({
        token:       d.token,
        clinic_name: d.clinic_name,
        logo_url:    d.logo_url    || '',
        user:        JSON.stringify(d.staff),
        flags:       JSON.stringify(d.feature_flags),
        currency:    d.currency    || 'LKR',
      });
      window.open(`${CLINIC_URL}/impersonate?${params.toString()}`, '_blank');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Impersonation failed');
    } finally {
      setImpersonating(false);
    }
  }

  async function handleRenew() {
    setRenewing(true);
    try {
      const res = await adminSubscriptionsApi.renew(id);
      setClinic(c => ({ ...c, ...res.data.data }));
      toast.success('Subscription renewed');
      setShowRenew(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Renewal failed');
    } finally {
      setRenewing(false);
    }
  }

  async function handleFlagToggle(module) {
    const newVal = !flags[module];
    setFlags(f => ({ ...f, [module]: newVal }));
    setFlagSaving(true);
    try {
      await adminFlagsApi.update(id, { [module]: newVal });
      toast.success(`${module} ${newVal ? 'enabled' : 'disabled'}`);
    } catch {
      setFlags(f => ({ ...f, [module]: !newVal }));
      toast.error('Something went wrong. Please try again.');
    } finally {
      setFlagSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading clinic…" />
      </div>
    );
  }
  if (!clinic) return null;

  const isSuspended  = clinic.status === 'suspended';
  const clinicUrl    = `${clinic.subdomain}.clinicpos.com`;
  const activeFlags  = Object.values(flags).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/clinics')}
        className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Clinics
      </button>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[var(--color-border)]">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'logs',     label: 'System Logs', icon: ScrollText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}
          >
            {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'logs' && <ClinicLogsTab clinicId={clinic.id} />}

      {activeTab === 'overview' && <>

      {/* Suspended banner */}
      {isSuspended && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--radius)] bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-[var(--color-danger)] text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This clinic is suspended. All staff logins are blocked.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-[var(--color-text)]">{clinic.clinic_name}</h1>
            <Badge status={clinic.status} label={clinic.status} />
          </div>
          <div className="flex items-center gap-1 mt-1">
            <p className="text-sm text-[var(--color-text-secondary)]">{clinicUrl}</p>
            <CopyPill value={`https://${clinicUrl}`} />
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 opacity-70">
            {clinic.owner_email}
            {clinic.owner_phone ? ` · ${clinic.owner_phone}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button
            size="sm"
            variant="secondary"
            loading={impersonating}
            onClick={handleImpersonate}
            disabled={isSuspended}
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Login as Clinic
          </Button>
          {isSuspended ? (
            <Button size="sm" variant="success" onClick={() => setShowActivate(true)}>
              <CheckCircle className="w-3.5 h-3.5" /> Activate
            </Button>
          ) : (
            <Button size="sm" variant="danger" onClick={() => setShowSuspend(true)}>
              <Ban className="w-3.5 h-3.5" /> Suspend
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Staff Members"  value={clinic.stats?.staff_count   ?? '—'} icon={UserCheck}  color="blue"   />
        <StatCard label="Total Patients" value={clinic.stats?.patient_count ?? '—'} icon={Users}      color="green"  />
        <StatCard label="Modules On"     value={activeFlags}                         icon={Building2}  color={activeFlags > 0 ? 'purple' : 'gray'} />
      </div>

      {/* Subscription card */}
      {(() => {
        const plan      = plans.find(p => p.id === clinic.plan_id);
        const dl        = daysLabel(clinic.subscription_end);
        const hasPlan   = !!clinic.plan_id;
        return (
          <Card title="Subscription" subtitle={hasPlan ? (plan?.name || '—') : 'No plan assigned'}>
            <div className="space-y-3">
              {hasPlan ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      ['Plan',       plan?.name || '—'],
                      ['Cycle',      clinic.plan_type ? clinic.plan_type.charAt(0).toUpperCase() + clinic.plan_type.slice(1) : '—'],
                      ['Start Date', formatDate(clinic.subscription_start)],
                      ['End Date',   formatDate(clinic.subscription_end)],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-[var(--color-bg)] rounded-[var(--radius)] px-3 py-2">
                        <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
                        <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  {dl && (
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${dl.color}`}>
                      <CreditCard className="w-4 h-4" />
                      {dl.text}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)]">Assign a subscription plan to enable billing cycle tracking and auto-suspend.</p>
              )}

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => setShowSetPlan(true)}>
                  <CreditCard className="w-3.5 h-3.5" /> {hasPlan ? 'Change Plan' : 'Set Plan'}
                </Button>
                {hasPlan && (
                  <Button size="sm" variant="secondary" onClick={() => setShowRenew(true)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Renew
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })()}

      {/* Details + Feature Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clinic Details */}
        <Card title="Clinic Details">
          <dl className="space-y-2.5">
            {[
              ['Clinic ID',   clinic.id],
              ['Subdomain',   clinic.subdomain],
              ['Status',      clinic.status],
              ['Created',     new Date(clinic.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
              ['Last Updated',new Date(clinic.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0 gap-3">
                <dt className="text-[var(--color-text-secondary)] shrink-0">{label}</dt>
                <dd className="font-medium text-[var(--color-text)] text-right break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Feature Flags */}
        <Card
          title="Feature Flags"
          subtitle={flagSaving ? 'Saving…' : `${activeFlags} of ${ALL_MODULES.length} modules enabled`}
        >
          <div className="space-y-3">
            {ALL_MODULES.map(m => (
              <div key={m.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{m.label}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">{m.description}</p>
                </div>
                <button
                  onClick={() => handleFlagToggle(m.key)}
                  disabled={flagSaving}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1 ${
                    flags[m.key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
                  } ${flagSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                    flags[m.key] ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      </> /* end overview tab */}

      {/* Modals */}
      <SetPlanModal
        open={showSetPlan}
        onClose={() => setShowSetPlan(false)}
        clinic={clinic}
        plans={plans}
        onSaved={updated => setClinic(c => ({ ...c, ...updated }))}
      />
      <ConfirmDialog
        open={showRenew}
        onClose={() => setShowRenew(false)}
        onConfirm={handleRenew}
        loading={renewing}
        title="Renew Subscription"
        message={`Renew the ${clinic.plan_type || ''} subscription for "${clinic.clinic_name}"? The new period will start from ${
          clinic.subscription_end
            ? (() => { const d = new Date(clinic.subscription_end); d.setDate(d.getDate() + 1); return formatDate(d); })()
            : 'today'
        }.`}
        confirmLabel="Renew"
        variant="success"
      />
      <EditClinicModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        clinic={clinic}
        onSaved={updated => setClinic(c => ({ ...c, ...updated }))}
      />
      <ConfirmDialog
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        onConfirm={handleSuspend}
        loading={actionLoading}
        title="Suspend Clinic"
        message={`Suspend "${clinic.clinic_name}"? All staff will be locked out immediately.`}
        confirmLabel="Yes, Suspend"
        variant="danger"
      />
      <ConfirmDialog
        open={showActivate}
        onClose={() => setShowActivate(false)}
        onConfirm={handleActivate}
        loading={actionLoading}
        title="Activate Clinic"
        message={`Restore access for "${clinic.clinic_name}"?`}
        confirmLabel="Yes, Activate"
        variant="success"
      />
    </div>
  );
}
