import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, UserCheck, Edit2, Ban, CheckCircle,
  ExternalLink, AlertTriangle, Save, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminTenantsApi, adminFlagsApi } from '../api/admin';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { LoadingState } from '../components/ui/Spinner';

const CLINIC_URL = import.meta.env.VITE_CLINIC_URL || 'http://localhost:5173';

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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ClinicDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [clinic,        setClinic]        = useState(null);
  const [flags,         setFlags]         = useState({});
  const [loading,       setLoading]       = useState(true);
  const [showEdit,      setShowEdit]      = useState(false);
  const [showSuspend,   setShowSuspend]   = useState(false);
  const [showActivate,  setShowActivate]  = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flagSaving,    setFlagSaving]    = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => { load(); }, [id]);

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

      {/* Modals */}
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
