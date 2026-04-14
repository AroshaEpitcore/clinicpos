import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, UserCheck, Edit2, Ban, CheckCircle,
  ExternalLink, AlertTriangle, Save, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { adminTenantsApi, adminFlagsApi } from '../api/admin';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';

const ALL_MODULES = [
  { key: 'pharmacy',      label: 'Pharmacy',       description: 'Medicine dispensing & inventory management' },
  { key: 'lab',           label: 'Lab',             description: 'Lab test requests and results' },
  { key: 'insurance',     label: 'Insurance',       description: 'Insurance claims and corporate billing' },
  { key: 'online_booking',label: 'Online Booking',  description: 'Patient self-booking portal' },
  { key: 'multi_branch',  label: 'Multi Branch',    description: 'Multiple branch management' },
  { key: 'custom_domain', label: 'Custom Domain',   description: 'Use clinic\'s own domain name' },
];

function EditClinicModal({ open, onClose, clinic, onSaved }) {
  const [form, setForm] = useState({ clinic_name: '', owner_email: '', owner_phone: '', plan: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (clinic) setForm({
      clinic_name: clinic.clinic_name || '',
      owner_email: clinic.owner_email || '',
      owner_phone: clinic.owner_phone || '',
      plan:        clinic.plan        || 'basic',
    });
  }, [clinic]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await adminTenantsApi.update(clinic.id, form);
      toast.success('Clinic updated');
      onSaved(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Clinic" size="sm">
      <div className="space-y-4">
        {[
          { field: 'clinic_name', label: 'Clinic Name', type: 'text' },
          { field: 'owner_email', label: 'Owner Email', type: 'email' },
          { field: 'owner_phone', label: 'Owner Phone', type: 'text' },
        ].map(({ field, label, type }) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
              type={type}
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
          <select
            value={form.plan}
            onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {['basic', 'standard', 'premium'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={saving}><Save className="w-3.5 h-3.5" /> Save</Button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, message, variant = 'danger', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>Confirm</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function ClinicDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [clinic,    setClinic]    = useState(null);
  const [flags,     setFlags]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [showEdit,  setShowEdit]  = useState(false);
  const [showSuspend, setShowSuspend] = useState(false);
  const [showActivate, setShowActivate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flagSaving, setFlagSaving] = useState(false);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminTenantsApi.get(id);
      const data = res.data.data;
      setClinic(data);
      // Convert flags array to object map
      const flagMap = {};
      (data.feature_flags || []).forEach(f => { flagMap[f.module] = f.enabled; });
      setFlags(flagMap);
    } catch {
      toast.error('Failed to load clinic');
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
      toast.error(err.response?.data?.message || 'Failed');
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
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleImpersonate() {
    setImpersonating(true);
    try {
      const res = await adminTenantsApi.impersonate(id);
      const d   = res.data.data;
      // Store the impersonation token in clinic-frontend storage keys
      localStorage.setItem('clinic_token',    d.token);
      localStorage.setItem('clinic_user',     JSON.stringify({ ...d.staff, impersonated: true, impersonatedBy: 'superadmin' }));
      localStorage.setItem('clinic_info',     JSON.stringify({ name: d.clinic_name, logo_url: d.logo_url || null, currency: d.currency || 'LKR' }));
      localStorage.setItem('clinic_flags',    JSON.stringify(d.feature_flags));
      localStorage.setItem('clinic_subdomain', d.subdomain);

      toast.success(`Impersonating ${d.clinic_name} — opening clinic panel`);
      // Pass token + session data via URL to clinic-frontend /impersonate route
      const params = new URLSearchParams({
        token:       d.token,
        clinic_name: d.clinic_name,
        logo_url:    d.logo_url    || '',
        user:        JSON.stringify(d.staff),
        flags:       JSON.stringify(d.feature_flags),
        currency:    d.currency    || 'LKR',
      });
      window.open(`http://localhost:5173/impersonate?${params.toString()}`, '_blank');
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
      // Revert
      setFlags(f => ({ ...f, [module]: !newVal }));
      toast.error('Failed to update flag');
    } finally {
      setFlagSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Loading...</div>;
  }
  if (!clinic) return null;

  const isSuspended = clinic.status === 'suspended';

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate('/clinics')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Clinics
      </button>

      {/* Impersonation banner */}
      {isSuspended && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          This clinic is suspended. Login is blocked for clinic staff.
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{clinic.clinic_name}</h1>
            <Badge label={clinic.plan}   variant={clinic.plan} />
            <Badge label={clinic.status} variant={clinic.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">{clinic.subdomain}.clinicpos.com</p>
          <p className="text-xs text-gray-400 mt-0.5">{clinic.owner_email} · {clinic.owner_phone || 'no phone'}</p>
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
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Staff Members"  value={clinic.stats?.staff_count   ?? '—'} icon={UserCheck} color="blue" />
        <StatCard label="Total Patients" value={clinic.stats?.patient_count ?? '—'} icon={Users}     color="green" />
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Clinic Details">
          <dl className="space-y-2.5">
            {[
              ['Clinic ID',    clinic.id],
              ['Created',      new Date(clinic.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })],
              ['Trial Ends',   clinic.trial_ends_at ? new Date(clinic.trial_ends_at).toLocaleDateString('en-GB') : '—'],
              ['Plan',         clinic.plan],
              ['Status',       clinic.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <dt className="text-gray-500">{label}</dt>
                <dd className="font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {/* Feature Flags */}
        <Card title="Feature Flags" subtitle={flagSaving ? 'Saving...' : 'Toggle modules for this clinic'}>
          <div className="space-y-3">
            {ALL_MODULES.map(m => (
              <div key={m.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{m.label}</p>
                  <p className="text-xs text-gray-400 truncate">{m.description}</p>
                </div>
                <button
                  onClick={() => handleFlagToggle(m.key)}
                  disabled={flagSaving}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    flags[m.key] ? 'bg-blue-600' : 'bg-gray-200'
                  } ${flagSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      flags[m.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
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
      <ConfirmModal
        open={showSuspend}
        onClose={() => setShowSuspend(false)}
        onConfirm={handleSuspend}
        loading={actionLoading}
        title="Suspend Clinic"
        message={`Are you sure you want to suspend "${clinic.clinic_name}"? All staff will be locked out immediately.`}
        variant="danger"
      />
      <ConfirmModal
        open={showActivate}
        onClose={() => setShowActivate(false)}
        onConfirm={handleActivate}
        loading={actionLoading}
        title="Activate Clinic"
        message={`Restore access for "${clinic.clinic_name}"?`}
        variant="success"
      />
    </div>
  );
}
