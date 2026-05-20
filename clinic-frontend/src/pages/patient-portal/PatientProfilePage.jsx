import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import { useLang } from '../../i18n/LangContext';
import PatientLayout from './PatientLayout';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { User, Lock, Eye, EyeOff, ChevronRight, Shield, Phone } from 'lucide-react';

function Field({ label, value, onChange, type = 'text', readOnly = false, inputMode, error, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-text)]">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm border rounded-[var(--radius)] transition-all placeholder:text-[var(--color-text-secondary)] ${
          readOnly
            ? 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
            : error
            ? 'bg-[var(--color-surface)] border-[var(--color-danger)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)] focus:border-transparent'
            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent'
        }`}
      />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
    </div>
  );
}

export default function PatientProfilePage() {
  const { t } = useLang();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});
  const [formErrors, setFormErrors] = useState({});

  const [showPwForm,  setShowPwForm]  = useState(false);
  const [currentPw,   setCurrentPw]  = useState('');
  const [newPw,       setNewPw]      = useState('');
  const [showPw,      setShowPw]     = useState(false);
  const [savingPw,    setSavingPw]   = useState(false);
  const [pwErrors,    setPwErrors]   = useState({});

  async function load() {
    try {
      const r = await patientPortalApi.getMe();
      setProfile(r.data.data);
      setForm({
        first_name:      r.data.data.first_name || '',
        last_name:       r.data.data.last_name || '',
        email:           r.data.data.email || '',
        address:         r.data.data.address || '',
        emergency_name:  r.data.data.emergency_name || '',
        emergency_phone: r.data.data.emergency_phone || '',
      });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function validateForm() {
    const errs = {};
    if (!form.first_name?.trim()) errs.first_name = 'First name is required';
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address';
    return errs;
  }

  async function handleSave(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSaving(true);
    try {
      await patientPortalApi.updateMe(form);
      toast.success(t('profile.updated'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.somethingWrong'));
    } finally {
      setSaving(false);
    }
  }

  function validatePw() {
    const errs = {};
    if (!currentPw) errs.currentPw = 'Current password is required';
    if (!newPw) errs.newPw = 'New password is required';
    else if (newPw.length < 6) errs.newPw = 'Password must be at least 6 characters';
    return errs;
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const errs = validatePw();
    if (Object.keys(errs).length) { setPwErrors(errs); return; }
    setPwErrors({});
    setSavingPw(true);
    try {
      await patientPortalApi.changePassword({ current_password: currentPw, new_password: newPw });
      toast.success(t('profile.pwChanged'));
      setCurrentPw(''); setNewPw(''); setShowPwForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.somethingWrong'));
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <PatientLayout>
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      </PatientLayout>
    );
  }

  const initial = profile?.first_name?.[0]?.toUpperCase() || '?';

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-semibold text-[var(--color-text)]">{t('profile.title')}</h1>

        {/* ── Patient card ─────────────────────────────────────────────── */}
        {profile && (
          <div className="rounded-[var(--radius-lg)] p-5 text-white flex items-center gap-4 bg-[var(--color-primary)]">
            <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-white/20 border border-white/30 flex items-center justify-center text-white text-xl font-bold shrink-0">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-base">{profile.first_name} {profile.last_name || ''}</p>
              <p className="text-blue-100 text-sm font-mono">{profile.patient_code}</p>
              {profile.created_at && (
                <p className="text-blue-200 text-xs mt-0.5">
                  Patient since {format(new Date(profile.created_at), 'MMMM yyyy')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Clinical info (read-only) ─────────────────────────────────── */}
        {profile && (profile.blood_group || profile.allergies || profile.insurance_provider) && (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[var(--color-text-secondary)]" />
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
                Medical Info — managed by clinic
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {profile.blood_group && (
                <div className="bg-red-50 rounded-[var(--radius)] px-3 py-2.5">
                  <p className="text-[0.65rem] text-red-400 font-semibold uppercase tracking-wide">Blood Group</p>
                  <p className="text-base font-bold text-red-700 mt-0.5">{profile.blood_group}</p>
                </div>
              )}
              {profile.allergies && (
                <div className="col-span-2 bg-amber-50 rounded-[var(--radius)] px-3 py-2.5">
                  <p className="text-[0.65rem] text-amber-500 font-semibold uppercase tracking-wide">Allergies</p>
                  <p className="text-sm font-semibold text-amber-800 mt-0.5">{profile.allergies}</p>
                </div>
              )}
              {profile.insurance_provider && (
                <div className="bg-[var(--color-bg)] rounded-[var(--radius)] px-3 py-2.5">
                  <p className="text-[0.65rem] text-[var(--color-text-secondary)] font-semibold uppercase tracking-wide">Insurance</p>
                  <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5">{profile.insurance_provider}</p>
                </div>
              )}
              {profile.insurance_number && (
                <div className="bg-[var(--color-bg)] rounded-[var(--radius)] px-3 py-2.5">
                  <p className="text-[0.65rem] text-[var(--color-text-secondary)] font-semibold uppercase tracking-wide">Policy No.</p>
                  <p className="text-sm font-semibold text-[var(--color-text)] mt-0.5">{profile.insurance_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Editable personal details ─────────────────────────────────── */}
        <form onSubmit={handleSave} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 space-y-4">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">{t('profile.personal')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={t('profile.firstName')} required
              value={form.first_name}
              onChange={e => { setForm(f => ({ ...f, first_name: e.target.value })); setFormErrors(v => ({ ...v, first_name: undefined })); }}
              error={formErrors.first_name}
            />
            <Field
              label={t('profile.lastName')}
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
            />
            <Field
              label={t('profile.email')}
              value={form.email}
              onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFormErrors(v => ({ ...v, email: undefined })); }}
              type="email" inputMode="email"
              error={formErrors.email}
            />
            <Field
              label={t('profile.address')}
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>

          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide pt-1">{t('profile.emergency')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label={t('profile.emName')}
              value={form.emergency_name}
              onChange={e => setForm(f => ({ ...f, emergency_name: e.target.value }))}
            />
            <Field
              label={t('profile.emPhone')}
              value={form.emergency_phone}
              onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))}
              type="tel" inputMode="tel"
            />
          </div>

          <div className="flex items-center gap-2 bg-[var(--color-bg)] rounded-[var(--radius)] px-3 py-2.5">
            <Phone className="w-3.5 h-3.5 text-[var(--color-text-secondary)] shrink-0" />
            <p className="text-xs text-[var(--color-text-secondary)]">
              Phone number and clinical data can only be updated by clinic staff.
            </p>
          </div>

          <Button type="submit" loading={saving} className="w-full">
            {t('profile.update')}
          </Button>
        </form>

        {/* ── Change password ───────────────────────────────────────────── */}
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => { setShowPwForm(v => !v); setPwErrors({}); }}
            className="w-full flex items-center gap-3 p-5 text-left hover:bg-[var(--color-bg)] transition-colors"
          >
            <div className="w-8 h-8 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[var(--color-text-secondary)]" />
            </div>
            <span className="flex-1 text-sm font-medium text-[var(--color-text)]">{t('profile.changePw')}</span>
            <ChevronRight className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform ${showPwForm ? 'rotate-90' : ''}`} />
          </button>

          {showPwForm && (
            <form onSubmit={handleChangePassword} className="border-t border-[var(--color-border)] p-5 space-y-4 bg-[var(--color-bg)]">
              {/* Current password */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t('profile.currentPw')} <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPw}
                    onChange={e => { setCurrentPw(e.target.value); setPwErrors(v => ({ ...v, currentPw: undefined })); }}
                    placeholder="Enter current password"
                    className={`w-full px-3 py-2 pr-10 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:border-transparent ${
                      pwErrors.currentPw
                        ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                        : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
                    }`}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {pwErrors.currentPw && <span className="text-xs text-[var(--color-danger)]">{pwErrors.currentPw}</span>}
              </div>

              {/* New password */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-text)]">
                  {t('profile.newPw')} <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setPwErrors(v => ({ ...v, newPw: undefined })); }}
                  placeholder="Min. 6 characters"
                  className={`w-full px-3 py-2 rounded-[var(--radius)] border text-sm bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:border-transparent ${
                    pwErrors.newPw
                      ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]'
                      : 'border-[var(--color-border)] focus:ring-[var(--color-primary)]'
                  }`}
                />
                {pwErrors.newPw && <span className="text-xs text-[var(--color-danger)]">{pwErrors.newPw}</span>}
              </div>

              <Button type="submit" loading={savingPw} variant="secondary" className="w-full">
                {t('profile.changePw')}
              </Button>
            </form>
          )}
        </div>

      </div>
    </PatientLayout>
  );
}
