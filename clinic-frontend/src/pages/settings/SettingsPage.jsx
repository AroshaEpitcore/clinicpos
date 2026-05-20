import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, Trash2, Plus, Pencil, X, Calendar, QrCode, ExternalLink } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { PageLayout }   from '../../components/layout/PageLayout';
import { PageHeader }   from '../../components/ui/PageHeader';
import { Button }  from '../../components/ui/Button';
import { Select }  from '../../components/ui/Select';
import { LoadingState } from '../../components/ui/Spinner';
import { EmptyState }   from '../../components/ui/EmptyState';
import { DatePicker }   from '../../components/ui/DatePicker';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useAuth }      from '../../store/AuthContext';
import { settingsApi }  from '../../api/settings';
import { doctorFeesApi, customServicesApi } from '../../api/invoices';
import { doctorsApi }   from '../../api/appointments';
import { formatCurrency, formatDate } from '../../utils/format';
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
  { key: 'website',      label: 'Website'          },
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
      // Append cache-buster so browser re-fetches even if filename is unchanged
      const freshUrl = `${res.data.data.url}?v=${Date.now()}`;
      setLogoPreview(freshUrl);
      updateClinic({ logo_url: freshUrl });
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
              <Upload className="w-3.5 h-3.5 mr-1.5" /> {logoPreview ? 'Replace Logo' : 'Upload Logo'}
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
  const [qrPreview,     setQrPreview]     = useState(null);
  const [uploadingQr,   setUploadingQr]   = useState(false);
  const qrFileRef = useRef();

  useEffect(() => {
    setForm({
      currency:  settings.currency  || 'LKR',
      tax_rate:  settings.tax_rate  ?? 0,
      tax_label: settings.tax_label || 'Tax',
    });
    setQrPreview(settings.qr_image_url || null);
  }, [settings]);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  async function handleQrChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const res = await settingsApi.uploadQrImage(file);
      setQrPreview(`${res.data.data.url}?v=${Date.now()}`);
      toast.success('QR image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingQr(false);
      e.target.value = '';
    }
  }

  async function handleQrDelete() {
    try {
      await settingsApi.deleteQrImage();
      setQrPreview(null);
      toast.success('QR image removed');
    } catch {
      toast.error('Could not remove QR image');
    }
  }

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

      <SectionCard title="QR Payment">
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
          Upload your bank's Lanka QR image (from Commercial Bank, Sampath, HNB, etc.).
          This will be shown to patients at the counter when they pay by QR scan.
        </p>
        <div className="flex items-start gap-5">
          <div className="w-40 h-40 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center overflow-hidden bg-[var(--color-bg)] shrink-0">
            {qrPreview
              ? <img src={mediaUrl(qrPreview)} alt="Payment QR" className="w-full h-full object-contain p-1" />
              : <div className="flex flex-col items-center gap-1 text-[var(--color-text-secondary)]">
                  <QrCode className="w-8 h-8" />
                  <span className="text-xs text-center px-2">No QR image</span>
                </div>
            }
          </div>
          <div className="flex flex-col gap-2">
            <input ref={qrFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleQrChange} />
            <Button size="sm" variant="secondary" onClick={() => qrFileRef.current?.click()} loading={uploadingQr}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> {qrPreview ? 'Replace QR Image' : 'Upload QR Image'}
            </Button>
            {qrPreview && (
              <button onClick={handleQrDelete} className="flex items-center gap-1 text-xs text-[var(--color-danger)] hover:underline">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <p className="text-xs text-[var(--color-text-secondary)]">JPG or PNG · Max 2MB</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              Get this QR from your bank's merchant portal or mobile banking app.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}

const SCHEDULE_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SLOT_DURATION_OPTIONS = [
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
];
function defaultScheduleRow(day) {
  return { day_of_week: day, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 15, is_active: false };
}

function AppointmentsTab({ settings, onSave, saving }) {
  // ── General settings ──────────────────────────────────────────
  const [form, setForm] = useState({});
  useEffect(() => {
    setForm({
      appointment_slot_duration: settings.appointment_slot_duration ?? 15,
      max_patients_per_day:      settings.max_patients_per_day      ?? 0,
      allow_walk_ins:            settings.allow_walk_ins            ?? true,
    });
  }, [settings]);
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  // ── Working hours ─────────────────────────────────────────────
  const [doctors,     setDoctors]     = useState([]);
  const [doctorId,    setDoctorId]    = useState('');
  const [schedule,    setSchedule]    = useState(SCHEDULE_DAYS.map((_, i) => defaultScheduleRow(i)));
  const [schedLoading,setSchedLoading]= useState(false);
  const [schedSaving, setSchedSaving] = useState(false);

  useEffect(() => {
    doctorsApi.list().then(res => setDoctors(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!doctorId) return;
    setSchedLoading(true);
    doctorsApi.getSchedule(doctorId).then(res => {
      const saved = res.data.data;
      const merged = SCHEDULE_DAYS.map((_, i) => {
        const existing = saved.find(s => s.day_of_week === i);
        return existing
          ? { ...existing, start_time: existing.start_time.slice(0,5), end_time: existing.end_time.slice(0,5) }
          : defaultScheduleRow(i);
      });
      setSchedule(merged);
    }).catch(() => {}).finally(() => setSchedLoading(false));
  }, [doctorId]);

  function updateDay(dayIndex, field, value) {
    setSchedule(prev => prev.map((row, i) => i === dayIndex ? { ...row, [field]: value } : row));
  }

  async function saveSchedule() {
    if (!doctorId) { toast.error('Please select a doctor first'); return; }
    setSchedSaving(true);
    try {
      const active   = schedule.filter(s => s.is_active);
      const inactive = schedule.filter(s => !s.is_active && s.id);
      await Promise.all([
        ...active.map(s => doctorsApi.saveScheduleDay({
          doctor_id: doctorId, day_of_week: s.day_of_week,
          start_time: s.start_time, end_time: s.end_time,
          slot_duration_minutes: parseInt(s.slot_duration_minutes), is_active: true,
        })),
        ...inactive.map(s => doctorsApi.saveScheduleDay({
          doctor_id: doctorId, day_of_week: s.day_of_week,
          start_time: s.start_time, end_time: s.end_time,
          slot_duration_minutes: s.slot_duration_minutes, is_active: false,
        })),
      ]);
      toast.success('Working hours saved');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSchedSaving(false);
    }
  }

  // ── Holidays ──────────────────────────────────────────────────
  const [holidays,     setHolidays]     = useState([]);
  const [holLoading,   setHolLoading]   = useState(true);
  const [holDate,      setHolDate]      = useState('');
  const [holLabel,     setHolLabel]     = useState('');
  const [holAdding,    setHolAdding]    = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  async function loadHolidays() {
    setHolLoading(true);
    try {
      const res = await doctorsApi.listHolidays();
      setHolidays(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setHolLoading(false);
    }
  }
  useEffect(() => { loadHolidays(); }, []);

  async function addHoliday() {
    if (!holDate || !holLabel.trim()) { toast.error('Please fill in both date and name'); return; }
    setHolAdding(true);
    try {
      await doctorsApi.addHoliday({ holiday_date: holDate, label: holLabel.trim() });
      toast.success(`${holLabel} added as a holiday`);
      setHolDate('');
      setHolLabel('');
      loadHolidays();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setHolAdding(false);
    }
  }

  async function confirmDeleteHoliday() {
    setDeleting(true);
    try {
      await doctorsApi.deleteHoliday(deleteTarget.id);
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      loadHolidays();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const doctorOptions = doctors.map(d => ({ value: String(d.id), label: d.full_name }));
  const timeCls = 'px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]';

  return (
    <div className="flex flex-col gap-5">
      {/* ── General appointment settings ── */}
      <SectionCard title="Appointment Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field label="Slot duration (minutes)">
            <Select
              value={String(form.appointment_slot_duration)}
              onValueChange={v => set('appointment_slot_duration')(parseInt(v))}
              options={[10,15,20,30,45,60].map(v => ({ value: String(v), label: `${v} min` }))}
            />
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

      {/* ── Doctor Working Hours ── */}
      <SectionCard title="Doctor Working Hours">
        <Select
          label="Select Doctor"
          required
          options={doctorOptions}
          value={doctorId}
          onValueChange={setDoctorId}
          placeholder="Choose a doctor..."
        />
        {doctorId && (
          <div className="mt-5">
            {schedLoading ? <LoadingState message="Loading schedule..." /> : (
              <div className="flex flex-col gap-2">
                {SCHEDULE_DAYS.map((day, i) => {
                  const row = schedule[i];
                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-[var(--radius)] border transition-colors ${row.is_active ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)]'}`}>
                      <input
                        type="checkbox"
                        checked={row.is_active}
                        onChange={e => updateDay(i, 'is_active', e.target.checked)}
                        className="w-4 h-4 accent-[var(--color-primary)]"
                      />
                      <span className="text-sm font-medium w-24 text-[var(--color-text)]">{day}</span>
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <input
                          type="time"
                          value={row.start_time}
                          disabled={!row.is_active}
                          onChange={e => updateDay(i, 'start_time', e.target.value)}
                          className={timeCls}
                        />
                        <span className="text-sm text-[var(--color-text-secondary)]">to</span>
                        <input
                          type="time"
                          value={row.end_time}
                          disabled={!row.is_active}
                          onChange={e => updateDay(i, 'end_time', e.target.value)}
                          className={timeCls}
                        />
                        <Select
                          options={SLOT_DURATION_OPTIONS}
                          value={String(row.slot_duration_minutes)}
                          onValueChange={v => updateDay(i, 'slot_duration_minutes', v)}
                          disabled={!row.is_active}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end mt-3">
                  <Button onClick={saveSchedule} loading={schedSaving}>Save Schedule</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {/* ── Clinic Holidays ── */}
      <SectionCard title="Clinic Holidays">
        <div className="flex gap-3 mb-5 flex-wrap">
          <DatePicker value={holDate} onChange={setHolDate} />
          <input
            type="text"
            placeholder="Holiday name (e.g. Christmas Day)"
            value={holLabel}
            onChange={e => setHolLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHoliday()}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <Button onClick={addHoliday} loading={holAdding}>Add</Button>
        </div>

        {holLoading ? <LoadingState /> : holidays.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No holidays added yet"
            description="Appointments on holiday dates will be blocked automatically."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {holidays.map(h => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 rounded-[var(--radius)] border border-[var(--color-border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{h.label}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatDate(h.holiday_date)}</p>
                </div>
                <button
                  onClick={() => setDeleteTarget(h)}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteHoliday}
        loading={deleting}
        title="Remove Holiday"
        message={`Remove "${deleteTarget?.label}" from clinic holidays?`}
        confirmLabel="Yes, Remove"
      />
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
              <Select
                value={String(form.reminder_hours_before)}
                onValueChange={v => set('reminder_hours_before')(parseInt(v))}
                options={[1,2,4,6,12,24,48].map(v => ({ value: String(v), label: `${v} hour${v > 1 ? 's' : ''} before` }))}
              />
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

function PortalHoursCard() {
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [hours,   setHours]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    settingsApi.getPortalHours()
      .then(r => {
        const seeded = Array.from({ length: 7 }, (_, dow) => {
          const row = r.data.data.find(x => x.day_of_week === dow);
          return {
            day_of_week: dow,
            is_open:     row?.is_open ?? (dow !== 0),
            open_time:   (row?.open_time  || '08:00').slice(0, 5),
            close_time:  (row?.close_time || '17:00').slice(0, 5),
          };
        });
        setHours(seeded);
      })
      .catch(() => toast.error('Could not load portal hours'))
      .finally(() => setLoading(false));
  }, []);

  function update(dow, patch) {
    setHours(hs => hs.map(h => h.day_of_week === dow ? { ...h, ...patch } : h));
  }

  async function save() {
    setSaving(true);
    try {
      await settingsApi.updatePortalHours(hours);
      toast.success('Online booking hours saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SectionCard title="Online Booking Hours"><LoadingState message="Loading hours…" /></SectionCard>;

  return (
    <SectionCard
      title="Online Booking Hours"
      description="Days and times when the public booking portal accepts new appointments. Outside these windows patients see a closed-for-now message."
    >
      <div className="space-y-2">
        {hours.map(h => (
          <div key={h.day_of_week} className="flex items-center gap-3 p-2 rounded-[var(--radius)] border border-[var(--color-border)]">
            <div className="w-12 text-sm font-semibold text-[var(--color-text)]">{DAYS[h.day_of_week]}</div>
            <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] cursor-pointer">
              <input type="checkbox" checked={h.is_open} onChange={e => update(h.day_of_week, { is_open: e.target.checked })} />
              Open
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <input type="time" value={h.open_time}  disabled={!h.is_open}
                onChange={e => update(h.day_of_week, { open_time: e.target.value })}
                className="px-2 py-1 text-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] disabled:opacity-40" />
              <span className="text-xs text-[var(--color-text-secondary)]">to</span>
              <input type="time" value={h.close_time} disabled={!h.is_open}
                onChange={e => update(h.day_of_week, { close_time: e.target.value })}
                className="px-2 py-1 text-sm rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] disabled:opacity-40" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-3">
        <Button onClick={save} loading={saving}>Save Hours</Button>
      </div>
    </SectionCard>
  );
}

function SecurityTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  const { clinic, tenantFlags } = useAuth();
  const qrCanvasRef = useRef(null);

  // Show the dual-queue toggle only if super-admin has enabled the capability
  const dualQueueAvailable = !!tenantFlags?.dual_queue;

  useEffect(() => {
    setForm({
      session_timeout_minutes: settings.session_timeout_minutes ?? 30,
      patient_portal_enabled:  settings.patient_portal_enabled  ?? false,
      patient_login_enabled:   settings.patient_login_enabled   ?? false,
      queue_display_enabled:   settings.queue_display_enabled   ?? false,
      dual_queue_enabled:      settings.dual_queue_enabled      ?? false,
    });
  }, [settings]);

  const portalUrl  = `${window.location.origin}/book`;
  const displayUrl = `${window.location.origin}/display`;

  function downloadQR() {
    const qrCanvas = qrCanvasRef.current?.querySelector('canvas');
    if (!qrCanvas) return;

    const CARD_W   = 600;
    const CARD_H   = 720;
    const QR_SIZE  = 300;
    const clinicName = clinic?.name || 'Our Clinic';

    const canvas  = document.createElement('canvas');
    canvas.width  = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, CARD_W, 0);
    grad.addColorStop(0, '#07548E');
    grad.addColorStop(1, '#07A39A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, 10);

    // Clinic name
    ctx.fillStyle = '#0D2136';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clinicName, CARD_W / 2, 68);

    // Subtitle
    ctx.fillStyle = '#456B84';
    ctx.font = '18px sans-serif';
    ctx.fillText('Scan to Book Your Appointment Online', CARD_W / 2, 104);

    // QR border card
    const cardX = (CARD_W - QR_SIZE - 40) / 2;
    const cardY = 128;
    ctx.fillStyle = '#F4F8FB';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, QR_SIZE + 40, QR_SIZE + 40, 16);
    ctx.fill();

    // Draw QR from the hidden canvas
    ctx.drawImage(qrCanvas, cardX + 20, cardY + 20, QR_SIZE, QR_SIZE);

    // URL text
    ctx.fillStyle = '#07548E';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    // Trim to fit — show only host + /book
    const urlDisplay = portalUrl.replace(/^https?:\/\//, '');
    ctx.fillText(urlDisplay, CARD_W / 2, cardY + QR_SIZE + 40 + 32);

    // Instruction line
    ctx.fillStyle = '#7AABB8';
    ctx.font = '14px sans-serif';
    ctx.fillText('Point your phone camera at the QR code to book online', CARD_W / 2, cardY + QR_SIZE + 40 + 60);

    // Bottom accent bar
    ctx.fillStyle = grad;
    ctx.fillRect(0, CARD_H - 8, CARD_W, 8);

    canvas.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `booking-qr-${(clinicName).toLowerCase().replace(/\s+/g, '-')}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Session Security">
        <Field label="Auto logout after inactivity">
          <Select
            value={String(form.session_timeout_minutes)}
            onValueChange={v => setForm(f => ({ ...f, session_timeout_minutes: parseInt(v) }))}
            options={[15,30,60,120,240,480].map(v => ({
              value: String(v),
              label: v < 60 ? `${v} minutes` : `${v/60} hour${v > 60 ? 's' : ''}`,
            }))}
          />
        </Field>
        <p className="text-xs text-[var(--color-text-secondary)] mt-3">
          Staff will be automatically logged out after this period of inactivity.
          Enforcement is active in Phase 2.7+.
        </p>
      </SectionCard>

      <SectionCard title="Patient Portal">
        <Toggle
          label="Enable Online Booking"
          description="Allow patients to book appointments online without calling the clinic."
          checked={!!form.patient_portal_enabled}
          onChange={v => setForm(f => ({ ...f, patient_portal_enabled: v }))}
        />
        {form.patient_portal_enabled && (
          <div className="mt-4 flex flex-col gap-3">
            {/* URL row */}
            <div className="p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Patient Booking URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-[var(--color-primary)] break-all">{portalUrl}</code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('URL copied'); }}
                  className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] shrink-0"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                Share this link with patients so they can book appointments online.
              </p>
            </div>

            {/* QR card */}
            <div className="p-4 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-5">
              {/* Hidden canvas used as source for download */}
              <div ref={qrCanvasRef} className="hidden">
                <QRCodeCanvas value={portalUrl} size={300} />
              </div>
              {/* Visible QR preview */}
              <div className="p-3 bg-white rounded-lg border border-[var(--color-border)] shrink-0">
                <QRCodeCanvas value={portalUrl} size={140} />
              </div>
              <div className="flex flex-col gap-2 text-center sm:text-left">
                <p className="text-sm font-semibold text-[var(--color-text)]">Booking QR Code</p>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Print this QR and place it at your front desk or waiting room.
                  Patients scan it to book appointments instantly — no URL needed.
                </p>
                <button
                  type="button"
                  onClick={downloadQR}
                  className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-[var(--radius)] text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity self-center sm:self-start"
                >
                  <QrCode className="w-4 h-4" />
                  Download QR Card (PNG)
                </button>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Patient Login Portal">
        <Toggle
          label="Enable Patient Login Portal"
          description="Allow registered patients to log in at /patient/login to view their visit history, prescriptions, lab results, and invoices."
          checked={!!form.patient_login_enabled}
          onChange={v => setForm(f => ({ ...f, patient_login_enabled: v }))}
        />
        {form.patient_login_enabled && (
          <div className="mt-4 p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Patient Portal URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-[var(--color-primary)] break-all">
                {window.location.origin}/patient/login
              </code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/patient/login`); }}
                className="text-xs px-2 py-1 rounded border border-[var(--color-border)] hover:bg-[var(--color-bg-alt)] shrink-0"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
              Patients register using the phone number on file at your clinic. They can view visits, Rx, lab results, and invoices.
            </p>
          </div>
        )}
      </SectionCard>

      {form.patient_portal_enabled && <PortalHoursCard />}

      {dualQueueAvailable && (
        <SectionCard title="Dual Queue (New / Returning Patients)">
          <Toggle
            label="Enable separate token series for new and returning patients"
            description="When on, new patients receive RED tokens (e.g. N-01) and returning patients receive BLUE tokens (01). Visible in POS, online booking, and the queue display."
            checked={!!form.dual_queue_enabled}
            onChange={v => setForm(f => ({ ...f, dual_queue_enabled: v }))}
          />
        </SectionCard>
      )}

      <SectionCard title="Waiting Room Display">
        <Toggle
          label="Enable Queue Display Screen"
          description="Show a public TV screen with each doctor's current patient and queue. No login required — open this on any monitor in your waiting room."
          checked={!!form.queue_display_enabled}
          onChange={v => setForm(f => ({ ...f, queue_display_enabled: v }))}
        />
        {form.queue_display_enabled && (
          <div className="mt-4 p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-secondary)] mb-1">Queue Display URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-[var(--color-primary)] break-all">{displayUrl}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(displayUrl); }}
                className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] shrink-0"
              >
                Copy
              </button>
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] shrink-0"
              >
                Open
              </a>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mt-2">
              Open this link on your waiting room TV or any display. Auto-refreshes every 30 seconds.
              Shows only patient first names for privacy.
            </p>
          </div>
        )}
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
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-x-auto">
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

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-x-auto">
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

// ── Website tab ───────────────────────────────────────────────────────────────
function WebsiteTab({ settings, onSave, saving }) {
  const [form, setForm] = useState({});
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroFileRef = useRef(null);
  const subdomain = import.meta.env.VITE_TENANT_SUBDOMAIN || window.location.hostname.split('.')[0];
  const clinicUrl = `${window.location.origin}/`;

  useEffect(() => {
    setForm({
      website_enabled:  settings.website_enabled  !== false,
      website_tagline:  settings.website_tagline  || '',
      website_about:    settings.website_about    || '',
      website_hours:    settings.website_hours    || '',
      website_map_url:  settings.website_map_url  || '',
      website_whatsapp: settings.website_whatsapp || '',
      website_facebook: settings.website_facebook || '',
      website_hero_url: settings.website_hero_url || '',
    });
  }, [settings]);

  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  async function handleHeroFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const res = await settingsApi.uploadHeroImage(file);
      const url = `${res.data.data.url}?v=${Date.now()}`;
      setForm(p => ({ ...p, website_hero_url: url }));
      toast.success('Hero image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingHero(false);
      e.target.value = '';
    }
  }

  async function handleHeroDelete() {
    try {
      await settingsApi.deleteHeroImage();
      setForm(p => ({ ...p, website_hero_url: '' }));
      toast.success('Hero image removed');
    } catch {
      toast.error('Could not remove hero image');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SectionCard title="Website Visibility">
        <Toggle
          label="Enable Public Website"
          description={`Your clinic website is visible at ${clinicUrl}`}
          checked={!!form.website_enabled}
          onChange={set('website_enabled')}
        />
        <div className="pt-3">
          <a href={clinicUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-primary)] hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> Preview your clinic website
          </a>
        </div>
      </SectionCard>

      <SectionCard title="Content">
        <div className="flex flex-col gap-4">
          <Field label="Tagline">
            <TextInput value={form.website_tagline} onChange={set('website_tagline')}
              placeholder="e.g. Your health, our priority" />
          </Field>
          <Field label="About / Description">
            <Textarea value={form.website_about} onChange={set('website_about')} rows={5}
              placeholder="Write a short description about your clinic, specialties, and values…" />
          </Field>
          <Field label="Working Hours">
            <Textarea value={form.website_hours} onChange={set('website_hours')} rows={4}
              placeholder={`Mon – Fri: 8:00 AM – 6:00 PM\nSat: 8:00 AM – 1:00 PM\nSun: Closed`} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Contact & Social">
        <div className="flex flex-col gap-4">
          <Field label="Google Maps Link">
            <TextInput value={form.website_map_url} onChange={set('website_map_url')}
              placeholder="https://maps.google.com/…" />
          </Field>
          <Field label="WhatsApp Number">
            <TextInput value={form.website_whatsapp} onChange={set('website_whatsapp')}
              placeholder="94771234567  (with country code, no +)" />
          </Field>
          <Field label="Facebook Page URL">
            <TextInput value={form.website_facebook} onChange={set('website_facebook')}
              placeholder="https://facebook.com/yourclinic" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Hero Background Image">
        {/* Preview */}
        {form.website_hero_url && (
          <div className="mb-4 rounded-[var(--radius)] overflow-hidden border border-[var(--color-border)] h-32 relative group">
            <img src={form.website_hero_url.startsWith('/uploads') ? mediaUrl(form.website_hero_url.split('?')[0]) + (form.website_hero_url.includes('?') ? '?' + form.website_hero_url.split('?')[1] : '') : form.website_hero_url}
              alt="Hero preview" className="w-full h-full object-cover"
              onError={e => e.target.style.display='none'} />
            <button onClick={handleHeroDelete}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-lg px-2.5 py-1 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700">
              <Trash2 className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        )}

        {/* Upload from device */}
        <div className="flex flex-col gap-3">
          <input ref={heroFileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleHeroFileChange} />
          <Button size="sm" variant="secondary" onClick={() => heroFileRef.current?.click()} loading={uploadingHero}>
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {form.website_hero_url ? 'Replace with device image' : 'Choose image from device'}
          </Button>
          <p className="text-xs text-[var(--color-text-secondary)]">JPG or PNG · Max 5MB</p>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-[var(--color-border)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">or paste a URL</span>
            <div className="flex-1 h-px bg-[var(--color-border)]" />
          </div>

          <Field label="Hero Image URL">
            <TextInput value={form.website_hero_url?.startsWith('/uploads') ? '' : (form.website_hero_url || '')}
              onChange={set('website_hero_url')}
              placeholder="https://images.unsplash.com/photo-… (leave blank for default)" />
          </Field>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Recommended: a photo of your clinic interior or staff. Leave blank to use the default background.
          </p>
        </div>
      </SectionCard>

      <p className="text-xs text-[var(--color-text-secondary)]">
        Clinic name, address, phone, email, logo and doctors are pulled automatically from the Clinic and Doctor Fees tabs.
      </p>

      <div className="flex justify-end">
        <Button onClick={() => onSave(form)} loading={saving}>Save Website Settings</Button>
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
      // Mirror dual_queue_enabled onto the AuthContext so the appointments UI
      // picks it up immediately without requiring a logout/login cycle.
      if (Object.prototype.hasOwnProperty.call(partial, 'dual_queue_enabled')) {
        updateClinic({ dual_queue_enabled: partial.dual_queue_enabled === true });
      }
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
    website:       <WebsiteTab {...tabProps} />,
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
