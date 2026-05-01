import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { patientPortalApi } from '../../api/patientPortal';
import PatientLayout from './PatientLayout';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

export default function PatientProfilePage() {
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [form,     setForm]     = useState({});

  // password change
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

  const field = (label, key, type = 'text', readOnly = false) => (
    <div>
      <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key] ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        readOnly={readOnly}
        className={`w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg bg-white focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] ${readOnly ? 'bg-[var(--color-surface-alt)] text-[var(--color-ink-faint)] cursor-not-allowed' : ''}`}
      />
    </div>
  );

  if (loading) {
    return <PatientLayout><div className="h-40 flex items-center justify-center text-[var(--color-ink-faint)] text-sm">Loading…</div></PatientLayout>;
  }

  return (
    <PatientLayout>
      <div className="space-y-5">
        <h1 className="text-lg font-black text-[var(--color-ink)]">My Profile</h1>

        {/* Read-only info */}
        {profile && (
          <div className="bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)] flex items-center justify-center text-white text-lg font-black shrink-0">
              {profile.first_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--color-ink)]">{profile.first_name} {profile.last_name || ''}</p>
              <p className="text-xs text-[var(--color-ink-light)]">{profile.patient_code}</p>
              {profile.created_at && (
                <p className="text-xs text-[var(--color-ink-faint)]">Patient since {format(new Date(profile.created_at), 'MMMM yyyy')}</p>
              )}
            </div>
          </div>
        )}

        {/* Read-only clinical info */}
        {profile && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5 space-y-3">
            <p className="text-xs font-semibold text-[var(--color-ink-light)] uppercase tracking-wide">Medical Info (managed by clinic)</p>
            <div className="grid grid-cols-2 gap-3">
              {profile.blood_group && (
                <div><p className="text-[0.65rem] text-[var(--color-ink-faint)]">Blood Group</p><p className="text-sm font-semibold text-[var(--color-ink)]">{profile.blood_group}</p></div>
              )}
              {profile.allergies && (
                <div className="col-span-2"><p className="text-[0.65rem] text-[var(--color-ink-faint)]">Allergies</p><p className="text-sm text-red-600 font-medium">{profile.allergies}</p></div>
              )}
              {profile.insurance_provider && (
                <div><p className="text-[0.65rem] text-[var(--color-ink-faint)]">Insurance</p><p className="text-sm text-[var(--color-ink)]">{profile.insurance_provider}</p></div>
              )}
              {profile.insurance_number && (
                <div><p className="text-[0.65rem] text-[var(--color-ink-faint)]">Policy No.</p><p className="text-sm text-[var(--color-ink)]">{profile.insurance_number}</p></div>
              )}
            </div>
          </div>
        )}

        {/* Editable form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
          <p className="text-xs font-semibold text-[var(--color-ink-light)] uppercase tracking-wide">Personal Details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('First Name *', 'first_name')}
            {field('Last Name',   'last_name')}
            {field('Email',       'email', 'email')}
            {field('Address',     'address')}
          </div>

          <p className="text-xs font-semibold text-[var(--color-ink-light)] uppercase tracking-wide pt-1">Emergency Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Contact Name',  'emergency_name')}
            {field('Contact Phone', 'emergency_phone', 'tel')}
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--color-surface-alt)] rounded-lg px-3 py-2">
            <User className="w-3.5 h-3.5 text-[var(--color-ink-faint)]" />
            <p className="text-xs text-[var(--color-ink-faint)]">Phone number and clinical data can only be updated by clinic staff.</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>

        {/* Change password */}
        <div className="bg-white rounded-2xl border border-[var(--color-border)] p-5">
          <button
            onClick={() => setShowPwForm(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)] w-full text-left"
          >
            <Lock className="w-4 h-4 text-[var(--color-ink-light)]" />
            Change Password
          </button>

          {showPwForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">Current Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={e => setCurrentPw(e.target.value)}
                    required
                    className="w-full px-3 pr-9 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-faint)]">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-ink)] mb-1.5">New Password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 text-sm border border-[var(--color-border)] rounded-lg focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={savingPw}
                className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
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
