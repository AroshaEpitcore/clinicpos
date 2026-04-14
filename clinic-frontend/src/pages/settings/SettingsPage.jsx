import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Plus, Pencil, X } from 'lucide-react';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { Button }       from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/Spinner';
import { useAuth }      from '../../store/AuthContext';
import { settingsApi }  from '../../api/settings';
import { doctorFeesApi, customServicesApi } from '../../api/invoices';
import { formatCurrency } from '../../utils/format';
import { mediaUrl }       from '../../utils/mediaUrl';

const TABS = [
  { key: 'clinic',       label: 'Clinic'          },
  { key: 'documents',    label: 'Documents'        },
  { key: 'billing',      label: 'Billing'          },
  { key: 'appointments', label: 'Appointments'     },
  { key: 'notifications',label: 'Notifications'    },
  { key: 'security',     label: 'Security'         },
  { key: 'doctor_fees',  label: 'Doctor Fees'      },
  { key: 'services',     label: 'Custom Services'  },
];

// ── Reusable field components ─────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)]" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] resize-none" />
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {title && <div className="px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
        <p className="text-sm font-semibold text-[var(--color-text)]">{title}</p>
      </div>}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────────────────────────────────────────

function ClinicTab({ settings, onSave, saving }) {
  const { updateClinic } = useAuth();
  const [form, setForm] = useState({});
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    setForm({
      clinic_name:    settings.clinic_name    || '',
      clinic_address: settings.clinic_address || '',
      clinic_phone:   settings.clinic_phone   || '',
      clinic_email:   settings.clinic_email   || '',
    });
    setLogoPreview(settings.clinic_logo_url || null);
  }, [settings]);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const res = await settingsApi.uploadLogo(file);
      setLogoPreview(res.data.data.url);
      updateClinic({ logo_url: res.data.data.url });
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  }

  async function handleLogoDelete() {
    try {
      await settingsApi.deleteLogo();
      setLogoPreview(null);
      updateClinic({ logo_url: null });
      toast.success('Logo removed');
    } catch {
      toast.error('Could not remove logo');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Logo">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center overflow-hidden bg-[var(--color-bg)]">
            {logoPreview
              ? <img src={mediaUrl(logoPreview)} alt="Clinic logo" className="w-full h-full object-contain" />
              : <span className="text-xs text-[var(--color-text-secondary)] text-center px-2">No logo</span>}
          </div>
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoChange} />
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} loading={uploadingLogo}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Logo
            </Button>
            {logoPreview && (
              <button onClick={handleLogoDelete} className="flex items-center gap-1 text-xs text-[var(--color-danger)] hover:underline">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <p className="text-xs text-[var(--color-text-secondary)]">JPG or PNG · Max 2MB</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Clinic Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Clinic Name *">
            <TextInput value={form.clinic_name} onChange={set('clinic_name')} placeholder="e.g. Silva Medical Center" />
          </Field>
          <Field label="Phone">
            <TextInput value={form.clinic_phone} onChange={set('clinic_phone')} placeholder="+94 77 123 4567" />
          </Field>
          <Field label="Email">
            <TextInput value={form.clinic_email} onChange={set('clinic_email')} placeholder="clinic@example.com" type="email" />
          </Field>
          <Field label="Address">
            <TextInput value={form.clinic_address} onChange={set('clinic_address')} placeholder="123 Main Street, Colombo" />
          </Field>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

function DocumentsTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    setForm({
      receipt_header:      settings.receipt_header      || '',
      receipt_footer:      settings.receipt_footer      || '',
      prescription_footer: settings.prescription_footer || '',
    });
  }, [settings]);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Receipt / Invoice">
        <div className="flex flex-col gap-4">
          <Field label="Header text (appears at top of invoice)">
            <Textarea value={form.receipt_header} onChange={set('receipt_header')} placeholder="e.g. Thank you for choosing our clinic" rows={2} />
          </Field>
          <Field label="Footer text (appears at bottom of invoice)">
            <Textarea value={form.receipt_footer} onChange={set('receipt_footer')} placeholder="e.g. Payment due on receipt. Contact us at 077-123-4567" rows={2} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Prescription">
        <Field label="Prescription footer (appears below medicines list)">
          <Textarea value={form.prescription_footer} onChange={set('prescription_footer')} placeholder="e.g. Take medicines as prescribed. Return for follow-up in 7 days." rows={2} />
        </Field>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

function BillingTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    setForm({
      currency:  settings.currency  || 'LKR',
      tax_rate:  settings.tax_rate  ?? 0,
      tax_label: settings.tax_label || 'Tax',
    });
  }, [settings]);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Currency & Tax">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Currency Code">
            <TextInput value={form.currency} onChange={set('currency')} placeholder="LKR" />
          </Field>
          <Field label="Tax Label">
            <TextInput value={form.tax_label} onChange={set('tax_label')} placeholder="VAT / GST / Tax" />
          </Field>
          <Field label="Tax Rate (%)">
            <TextInput value={form.tax_rate} onChange={v => set('tax_rate')(parseFloat(v) || 0)} placeholder="0" type="number" />
          </Field>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Tax is applied to invoice totals. Set to 0 to disable.
        </p>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

function AppointmentsTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    setForm({
      appointment_slot_duration: settings.appointment_slot_duration ?? 15,
      max_patients_per_day:      settings.max_patients_per_day      ?? 0,
      allow_walk_ins:            settings.allow_walk_ins            ?? true,
    });
  }, [settings]);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Appointment Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Slot duration (minutes)">
            <select value={form.appointment_slot_duration} onChange={e => set('appointment_slot_duration')(parseInt(e.target.value))}
              className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none">
              {[10,15,20,30,45,60].map(v => <option key={v} value={v}>{v} min</option>)}
            </select>
          </Field>
          <Field label="Max patients per day (0 = unlimited)">
            <TextInput value={form.max_patients_per_day} onChange={v => set('max_patients_per_day')(parseInt(v) || 0)} type="number" placeholder="0" />
          </Field>
        </div>
        <Toggle
          label="Allow walk-in appointments"
          description="Walk-ins can be added to the queue without a booked time slot"
          checked={!!form.allow_walk_ins}
          onChange={set('allow_walk_ins')}
        />
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

function NotificationsTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    setForm({
      reminder_enabled:      settings.reminder_enabled      ?? false,
      reminder_hours_before: settings.reminder_hours_before ?? 24,
      reminder_message:      settings.reminder_message      || '',
    });
  }, [settings]);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      <SectionCard>
        <Toggle
          label="Appointment reminders"
          description="Send SMS/WhatsApp reminders to patients before their appointment (Phase 5)"
          checked={!!form.reminder_enabled}
          onChange={set('reminder_enabled')}
        />
        {form.reminder_enabled && (
          <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-[var(--color-border)]">
            <Field label="Send reminder how many hours before?">
              <select value={form.reminder_hours_before} onChange={e => set('reminder_hours_before')(parseInt(e.target.value))}
                className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none w-48">
                {[1,2,4,6,12,24,48].map(v => <option key={v} value={v}>{v} hour{v > 1 ? 's' : ''} before</option>)}
              </select>
            </Field>
            <Field label="Reminder message template">
              <Textarea value={form.reminder_message} onChange={set('reminder_message')}
                placeholder="Dear {name}, your appointment at {clinic} is on {date} at {time}. Reply STOP to opt out."
                rows={3} />
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Variables: {'{name}'}, {'{clinic}'}, {'{date}'}, {'{time}'}
              </p>
            </Field>
          </div>
        )}
      </SectionCard>
      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

function SecurityTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    setForm({ session_timeout_minutes: settings.session_timeout_minutes ?? 30 });
  }, [settings]);

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Session Security">
        <Field label="Auto logout after inactivity">
          <select value={form.session_timeout_minutes}
            onChange={e => setForm({ session_timeout_minutes: parseInt(e.target.value) })}
            className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none w-64">
            {[15,30,60,120,240,480].map(v => (
              <option key={v} value={v}>{v < 60 ? `${v} minutes` : `${v/60} hour${v > 60 ? 's' : ''}`}</option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Staff will be automatically logged out after this period of inactivity.
          Enforcement is active in Phase 2.7+.
        </p>
      </SectionCard>
      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

// ── Doctor Fees tab ───────────────────────────────────────────────────────────
function DoctorFeesTab() {
  const [doctors,   setDoctors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null); // { doctorId, fee_label, amount }
  const [saving,    setSaving]    = useState(false);
  const [sigUploading, setSigUploading] = useState({}); // { [doctorId]: bool }
  const sigInputRef = useRef({});

  useEffect(() => {
    doctorFeesApi.list()
      .then(r => setDoctors(r.data.data))
      .catch(() => toast.error('Could not load doctor fees'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(doctorId) {
    const doc = editing;
    if (!doc) return;
    setSaving(true);
    try {
      await doctorFeesApi.update(doctorId, { fee_label: doc.fee_label, amount: parseFloat(doc.amount) || 0 });
      setDoctors(prev => prev.map(d => d.doctor_id === doctorId
        ? { ...d, fee_label: doc.fee_label, amount: doc.amount }
        : d));
      setEditing(null);
      toast.success('Fee updated');
    } catch {
      toast.error('Could not update fee');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignatureUpload(doctorId, file) {
    if (!file) return;
    setSigUploading(p => ({ ...p, [doctorId]: true }));
    try {
      const res = await settingsApi.uploadSignature(doctorId, file);
      setDoctors(prev => prev.map(d => d.doctor_id === doctorId
        ? { ...d, signature_url: res.data.data.url } : d));
      toast.success('Signature uploaded');
    } catch {
      toast.error('Could not upload signature');
    } finally {
      setSigUploading(p => ({ ...p, [doctorId]: false }));
    }
  }

  async function handleSignatureDelete(doctorId) {
    setSigUploading(p => ({ ...p, [doctorId]: true }));
    try {
      await settingsApi.deleteSignature(doctorId);
      setDoctors(prev => prev.map(d => d.doctor_id === doctorId
        ? { ...d, signature_url: null } : d));
      toast.success('Signature removed');
    } catch {
      toast.error('Could not remove signature');
    } finally {
      setSigUploading(p => ({ ...p, [doctorId]: false }));
    }
  }

  if (loading) return <LoadingState message="Loading doctor fees..." />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--color-text-secondary)]">
        Set the consultation fee for each doctor. Upload a signature image (JPG/PNG) to appear on printed and PDF prescriptions.
      </p>
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Doctor</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Fee Label</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Amount</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Signature</th>
              <th className="px-4 py-2.5 w-20" />
            </tr>
          </thead>
          <tbody>
            {doctors.map(doc => {
              const isEditing = editing?.doctor_id === doc.doctor_id;
              const uploading = !!sigUploading[doc.doctor_id];
              return (
                <tr key={doc.doctor_id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--color-text)]">{doc.full_name}</p>
                    {doc.specialization && <p className="text-xs text-[var(--color-text-secondary)]">{doc.specialization}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input value={editing.fee_label} onChange={e => setEditing(p => ({ ...p, fee_label: e.target.value }))}
                        className="px-2 py-1 rounded border border-[var(--color-primary)] text-sm w-40 focus:outline-none" />
                    ) : (
                      <span className="text-sm text-[var(--color-text-secondary)]">{doc.fee_label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing ? (
                      <input type="number" step="0.01" value={editing.amount}
                        onChange={e => setEditing(p => ({ ...p, amount: e.target.value }))}
                        className="px-2 py-1 rounded border border-[var(--color-primary)] text-sm w-28 text-right focus:outline-none" />
                    ) : (
                      <span className="text-sm font-semibold text-[var(--color-text)]">{formatCurrency(doc.amount)}</span>
                    )}
                  </td>

                  {/* Signature cell */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {doc.signature_url ? (
                        <>
                          <img
                            src={mediaUrl(doc.signature_url)}
                            alt="signature"
                            className="h-8 max-w-[80px] object-contain rounded border border-[var(--color-border)] bg-white p-0.5"
                          />
                          <button
                            onClick={() => handleSignatureDelete(doc.doctor_id)}
                            disabled={uploading}
                            className="p-1 rounded text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors"
                            title="Remove signature"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => sigInputRef.current[doc.doctor_id]?.click()}
                          disabled={uploading}
                          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--color-text-secondary)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                        >
                          {uploading ? '…' : <><Upload className="w-3 h-3" /> Upload</>}
                        </button>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="hidden"
                        ref={el => { sigInputRef.current[doc.doctor_id] = el; }}
                        onChange={e => { handleSignatureUpload(doc.doctor_id, e.target.files[0]); e.target.value = ''; }}
                      />
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => handleSave(doc.doctor_id)} loading={saving}>Save</Button>
                          <button onClick={() => setEditing(null)} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEditing({ ...doc })}
                          className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {doctors.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">No doctors found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Custom Services tab ───────────────────────────────────────────────────────
function CustomServicesTab() {
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [saving,   setSaving]   = useState(false);
  const emptyForm = { name: '', category: '', description: '', price: '' };
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    customServicesApi.list({ include_inactive: 'false' })
      .then(r => setServices(r.data.data))
      .catch(() => toast.error('Could not load services'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  async function handleAdd() {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await customServicesApi.create({ ...form, price: parseFloat(form.price) || 0 });
      toast.success('Service added');
      setForm(emptyForm);
      setShowAdd(false);
      load();
    } catch { toast.error('Could not add service'); }
    finally  { setSaving(false); }
  }

  async function handleUpdate() {
    if (!editing?.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await customServicesApi.update(editing.id, { name: editing.name, category: editing.category, description: editing.description, price: parseFloat(editing.price) || 0 });
      toast.success('Service updated');
      setEditing(null);
      load();
    } catch { toast.error('Could not update service'); }
    finally  { setSaving(false); }
  }

  async function handleRemove(id) {
    try {
      await customServicesApi.remove(id);
      toast.success('Service removed');
      load();
    } catch { toast.error('Could not remove service'); }
  }

  if (loading) return <LoadingState message="Loading services..." />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Custom services appear in the invoice Add Item picker (e.g. dressing, injection, X-ray).
        </p>
        <Button size="sm" onClick={() => { setShowAdd(true); setForm(emptyForm); }}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Service
        </Button>
      </div>

      {showAdd && (
        <div className="p-4 rounded-[var(--radius)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]">
          <p className="text-sm font-semibold mb-3 text-[var(--color-text)]">New Service</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="col-span-2">
              <Field label="Name *"><TextInput value={form.name} onChange={set('name')} placeholder="e.g. Wound Dressing" /></Field>
            </div>
            <Field label="Category"><TextInput value={form.category} onChange={set('category')} placeholder="e.g. Procedure" /></Field>
            <Field label="Price (LKR)"><TextInput value={form.price} onChange={set('price')} type="number" placeholder="0.00" /></Field>
          </div>
          <Field label="Description (optional)">
            <TextInput value={form.description} onChange={set('description')} placeholder="Short description" />
          </Field>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} loading={saving}>Add</Button>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Name</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Category</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-[var(--color-text-secondary)] uppercase">Price</th>
              <th className="px-4 py-2.5 w-24" />
            </tr>
          </thead>
          <tbody>
            {services.map(svc => {
              const isEditing = editing?.id === svc.id;
              return (
                <tr key={svc.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3">
                    {isEditing
                      ? <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                          className="px-2 py-1 rounded border border-[var(--color-primary)] text-sm w-full focus:outline-none" />
                      : <p className="text-sm font-medium text-[var(--color-text)]">{svc.name}</p>}
                    {!isEditing && svc.description && <p className="text-xs text-[var(--color-text-secondary)]">{svc.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {isEditing
                      ? <input value={editing.category || ''} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
                          className="px-2 py-1 rounded border border-[var(--color-primary)] text-sm w-28 focus:outline-none" />
                      : <span className="text-sm text-[var(--color-text-secondary)]">{svc.category || '—'}</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isEditing
                      ? <input type="number" step="0.01" value={editing.price}
                          onChange={e => setEditing(p => ({ ...p, price: e.target.value }))}
                          className="px-2 py-1 rounded border border-[var(--color-primary)] text-sm w-24 text-right focus:outline-none" />
                      : <span className="text-sm font-semibold">{formatCurrency(svc.price)}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={handleUpdate} loading={saving}>Save</Button>
                          <button onClick={() => setEditing(null)} className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)]">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing({ ...svc })}
                            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleRemove(svc.id)}
                            className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {services.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--color-text-secondary)]">No services yet. Add one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { updateClinic } = useAuth();
  const [activeTab, setActiveTab] = useState('clinic');
  const [settings,  setSettings]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    settingsApi.get()
      .then(r => setSettings(r.data.data))
      .catch(() => toast.error('Could not load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(partial) {
    setSaving(true);
    try {
      const res = await settingsApi.update(partial);
      setSettings(res.data.data);
      if (partial.clinic_name) updateClinic({ name: partial.clinic_name });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  const tabProps = { settings: settings || {}, onSave: handleSave, saving };

  const tabContent = {
    clinic:        <ClinicTab        {...tabProps} />,
    documents:     <DocumentsTab     {...tabProps} />,
    billing:       <BillingTab       {...tabProps} />,
    appointments:  <AppointmentsTab  {...tabProps} />,
    notifications: <NotificationsTab {...tabProps} />,
    security:      <SecurityTab      {...tabProps} />,
    doctor_fees:   <DoctorFeesTab />,
    services:      <CustomServicesTab />,
  };

  return (
    <PageLayout>
      <PageHeader title="Clinic Settings" />

      {/* Tab nav */}
      <div className="flex gap-1 flex-wrap mb-6 border-b border-[var(--color-border)]">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.key
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingState message="Loading settings..." /> : (
        <div className="max-w-3xl">{tabContent[activeTab]}</div>
      )}
    </PageLayout>
  );
}
