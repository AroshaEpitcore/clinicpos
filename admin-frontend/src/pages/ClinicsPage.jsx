import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, ChevronRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { adminTenantsApi } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';

const STATUS_TABS = ['all', 'active', 'suspended'];

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <span className="flex-1 text-sm font-mono text-gray-800 break-all">{value}</span>
        <button onClick={copy} className="shrink-0 text-gray-400 hover:text-blue-600 transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

function CreateClinicModal({ open, onClose, onCreated }) {
  const EMPTY_FORM = { clinic_name: '', subdomain: '', owner_email: '', owner_phone: '', initial_password: '' };
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [errors,      setErrors]      = useState({});
  const [credentials, setCredentials] = useState(null); // shown after creation

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
    if (!/^[a-z0-9-]+$/.test(form.subdomain)) errs.subdomain = 'Lowercase letters, numbers, hyphens only';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const res = await adminTenantsApi.create(form);
      onCreated(res.data.data.tenant);
      setCredentials(res.data.data.login);
      toast.success(`Clinic "${form.clinic_name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create clinic');
    } finally {
      setSaving(false);
    }
  }

  function handleDone() {
    setCredentials(null);
    setForm(EMPTY_FORM);
    setErrors({});
    onClose();
  }

  return (
    <Modal open={open} onClose={credentials ? handleDone : onClose} title={credentials ? 'Clinic Created — Send These Credentials' : 'Create New Clinic'} size="md">
      {credentials ? (
        /* ── Credentials screen ── */
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Copy and send these login details to the clinic owner. The password is only shown once — it cannot be retrieved later.
          </p>
          <div className="space-y-3">
            <CopyField label="Login URL" value={credentials.url} />
            <CopyField label="Email" value={credentials.email} />
            <CopyField label="Password" value={credentials.password} />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            Save or send these now — the password is not stored in plain text.
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      ) : (
        /* ── Create form ── */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Clinic Name <span className="text-red-500">*</span></label>
              <input
                value={form.clinic_name}
                onChange={e => onChange('clinic_name', e.target.value)}
                onBlur={onNameBlur}
                placeholder="Sunshine Medical Centre"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.clinic_name && <p className="text-red-500 text-xs mt-1">{errors.clinic_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Subdomain <span className="text-red-500">*</span></label>
              <div className="flex">
                <input
                  value={form.subdomain}
                  onChange={e => onChange('subdomain', e.target.value)}
                  placeholder="sunshine"
                  className="w-full px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-r-lg text-xs text-gray-400 whitespace-nowrap">.clinicpos.com</span>
              </div>
              {errors.subdomain && <p className="text-red-500 text-xs mt-1">{errors.subdomain}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Owner Email <span className="text-red-500">*</span></label>
              <input
                type="email"
                value={form.owner_email}
                onChange={e => onChange('owner_email', e.target.value)}
                placeholder="owner@clinic.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.owner_email && <p className="text-red-500 text-xs mt-1">{errors.owner_email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Owner Phone</label>
              <input
                value={form.owner_phone}
                onChange={e => onChange('owner_phone', e.target.value)}
                placeholder="+94771234567"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Initial Admin Password <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.initial_password}
                onChange={e => onChange('initial_password', e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">This creates the first admin login for the clinic. You will be shown the credentials to send them after creation.</p>
              {errors.initial_password && <p className="text-red-500 text-xs mt-1">{errors.initial_password}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>Create Clinic</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ClinicsPage() {
  const navigate = useNavigate();
  const [clinics,   setClinics]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)             params.search = search;
      if (statusTab !== 'all') params.status = statusTab;
      const res = await adminTenantsApi.list(params);
      setClinics(res.data.data);
    } catch {
      toast.error('Failed to load clinics');
    } finally {
      setLoading(false);
    }
  }, [search, statusTab]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(debouncedSearch), 300);
    return () => clearTimeout(t);
  }, [debouncedSearch]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Clinics</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clinics.length} clinic{clinics.length !== 1 ? 's' : ''} found</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> New Clinic
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Search by name, subdomain, or email..."
            value={debouncedSearch}
            onChange={e => setDebouncedSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
          {STATUS_TABS.map(t => (
            <button
              key={t}
              onClick={() => setStatusTab(t)}
              className={`px-4 py-2 text-xs font-medium capitalize transition-colors ${
                statusTab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading...</div>
        ) : clinics.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <Building2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">No clinics found</p>
          </div>
        ) : (
          <div className="overflow-x-auto -m-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Clinic</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Owner</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Flags</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clinics.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/clinics/${c.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-800">{c.clinic_name}</p>
                      <p className="text-xs text-gray-400">{c.subdomain}.clinicpos.com</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 text-xs">{c.owner_email}</td>
                    <td className="px-4 py-3.5"><Badge label={c.status} variant={c.status} /></td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs">{c.active_flags} on</td>
                    <td className="px-4 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
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
