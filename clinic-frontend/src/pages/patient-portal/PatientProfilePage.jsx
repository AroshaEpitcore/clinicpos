import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { User, Lock, Eye, EyeOff, ChevronRight, Shield, Phone } from 'lucide-react';

function Field({ label, value, onChange, type = 'text', readOnly = false, inputMode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[var(--color-ink)] mb-2">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        value={value ?? ''}
        onChange={onChange}
        readOnly={readOnly}
        className={`w-full px-4 py-3.5 text-base border-2 rounded-2xl transition-all placeholder:text-gray-300 ${
          readOnly
            ? 'bg-gray-50 border-gray-100 text-[var(--color-ink-light)] cursor-not-allowed'
            : 'bg-gray-50 border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] focus:bg-white'
        }`}
      />
    </div>
  );
}

export default function PatientProfilePage() {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});

  const [showPwForm,  setShowPwForm]  = useState(false);
  const [currentPw,   setCurrentPw]  = useState('');
  const [newPw,       setNewPw]      = useState('');
  const [showPw,      setShowPw]     = useState(false);
  const [savingPw,    setSavingPw]   = useState(false);

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

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await patientPortalApi.updateMe(form);
      toast.success('Profile updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setSavingPw(true);
    try {
      await patientPortalApi.changePassword({ current_password: currentPw, new_password: newPw });
      toast.success('Password changed');
      setCurrentPw(''); setNewPw(''); setShowPwForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <PatientLayout>
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-white rounded-2xl border border-[var(--color-border)]" />
          <div className="h-64 bg-white rounded-2xl border border-[var(--color-border)]" />
        </div>
      </PatientLayout>
    );
  }

  const initial = profile?.first_name?.[0]?.toUpperCase() || '?';

  return (
    <PatientLayout>
      <div className="space-y-4">
        <h1 className="text-lg font-black text-[var(--color-ink)]">My Profile</h1>

        {/* ── Patient card ─────────────────────────────────────────────── */}
        {profile && (
          <div className="rounded-2xl p-5 text-white flex items-center gap-4" style={{ background: 'var(--color-primary)' }}>
            <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-xl font-black shrink-0">
              {initial}
            </div>
            <div>
              <p className="font-black text-base">{profile.first_name} {profile.last_name || ''}</p>
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
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-[var(--color-ink-light)]" />
              <p className="text-xs font-bold text-[var(--color-ink-light)] uppercase tracking-wide">
                Medical Info — managed by clinic
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {profile.blood_group && (
                <div className="bg-red-50 rounded-xl px-3 py-2.5">
                  <p className="text-[0.6rem] text-red-400 font-bold uppercase tracking-wide">Blood Group</p>
                  <p className="text-base font-black text-red-700 mt-0.5">{profile.blood_group}</p>
                </div>
              )}
              {profile.allergies && (
                <div className="col-span-2 bg-amber-50 rounded-xl px-3 py-2.5">
                  <p className="text-[0.6rem] text-amber-500 font-bold uppercase tracking-wide">Allergies</p>
                  <p className="text-sm font-semibold text-amber-800 mt-0.5">{profile.allergies}</p>
                </div>
              )}
              {profile.insurance_provider && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[0.6rem] text-gray-400 font-bold uppercase tracking-wide">Insurance</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">{profile.insurance_provider}</p>
                </div>
              )}
              {profile.insurance_number && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[0.6rem] text-gray-400 font-bold uppercase tracking-wide">Policy No.</p>
                  <p className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">{profile.insurance_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Editable personal details ─────────────────────────────────── */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
          <p className="text-xs font-bold text-[var(--color-ink-light)] uppercase tracking-wide">Personal Details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="First Name *" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            <Field label="Last Name"    value={form.last_name}  onChange={e => setForm(f => ({ ...f, last_name:  e.target.value }))} />
            <Field label="Email"        value={form.email}      onChange={e => setForm(f => ({ ...f, email:      e.target.value }))} type="email" inputMode="email" />
            <Field label="Address"      value={form.address}    onChange={e => setForm(f => ({ ...f, address:    e.target.value }))} />
          </div>

          <p className="text-xs font-bold text-[var(--color-ink-light)] uppercase tracking-wide pt-1">Emergency Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name"  value={form.emergency_name}  onChange={e => setForm(f => ({ ...f, emergency_name:  e.target.value }))} />
            <Field label="Contact Phone" value={form.emergency_phone} onChange={e => setForm(f => ({ ...f, emergency_phone: e.target.value }))} type="tel" inputMode="tel" />
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <p className="text-xs text-[var(--color-ink-faint)]">
              Phone number and clinical data can only be updated by clinic staff.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-[var(--color-primary)] text-white text-base font-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-md shadow-blue-500/20"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* ── Change password ───────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] overflow-hidden">
          <button
            onClick={() => setShowPwForm(v => !v)}
            className="w-full flex items-center gap-3 p-5 text-left active:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-[var(--color-border)] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-[var(--color-ink-light)]" />
            </div>
            <span className="flex-1 text-sm font-bold text-[var(--color-ink)]">Change Password</span>
            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPwForm ? 'rotate-90' : ''}`} />
          </button>

          {showPwForm && (
            <form onSubmit={handleChangePassword} className="border-t border-[var(--color-border)] p-5 space-y-4 bg-gray-50/50">
              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] mb-2">Current Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full px-4 pr-12 py-3.5 text-base border-2 border-[var(--color-border)] rounded-2xl bg-white focus:outline-none focus:border-[var(--color-primary)] transition-all placeholder:text-gray-300"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-[var(--color-ink)] rounded-lg transition-colors">
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--color-ink)] mb-2">New Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3.5 text-base border-2 border-[var(--color-border)] rounded-2xl bg-white focus:outline-none focus:border-[var(--color-primary)] transition-all placeholder:text-gray-300"
                />
              </div>
              <button
                type="submit"
                disabled={savingPw}
                className="w-full py-3.5 rounded-2xl bg-[var(--color-ink)] text-white text-base font-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {savingPw ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

      </div>
    </PatientLayout>
  );
}
