import { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Edit2, KeyRound, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api/index';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatPhoneInput } from '../../utils/format';

const ROLES = ['doctor', 'nurse', 'receptionist', 'admin'];

const ROLE_COLORS = {
  admin:        'bg-purple-100 text-purple-700',
  doctor:       'bg-blue-100 text-blue-700',
  nurse:        'bg-green-100 text-green-700',
  receptionist: 'bg-amber-100 text-amber-700',
};

function StaffModal({ open, onClose, existing, onSaved }) {
  const isEdit = Boolean(existing);
  const EMPTY = { full_name: '', email: '', password: '', role: 'doctor', phone: '', specialization: '', registration_no: '' };
  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(isEdit ? {
        full_name:       existing.full_name       || '',
        email:           existing.email           || '',
        password:        '',
        role:            existing.role            || 'doctor',
        phone:           existing.phone           || '',
        specialization:  existing.specialization  || '',
        registration_no: existing.registration_no || '',
      } : EMPTY);
      setErrors({});
    }
  }, [open, existing]);

  function onChange(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  async function handleSave() {
    const errs = {};
    if (!form.full_name) errs.full_name = 'Required';
    if (!form.email)     errs.email     = 'Required';
    if (!isEdit && !form.password) errs.password = 'Required';
    if (!isEdit && form.password && form.password.length < 6) errs.password = 'Minimum 6 characters';
    if (!form.role)      errs.role      = 'Required';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      if (isEdit) {
        const payload = { full_name: form.full_name, email: form.email, phone: form.phone, role: form.role, specialization: form.specialization, registration_no: form.registration_no };
        const res = await api.put(`/staff/${existing.id}`, payload);
        toast.success('Staff member updated');
        onSaved(res.data.data, false);
      } else {
        const res = await api.post('/staff', form);
        toast.success('Staff member created');
        onSaved(res.data.data, true);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input value={form.full_name} onChange={e => onChange('full_name', e.target.value)} placeholder="Dr. John Silva" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="john@clinic.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={e => onChange('role', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white capitalize">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            {!isEdit && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input type="text" value={form.password} onChange={e => onChange('password', e.target.value)} placeholder="Min. 6 characters" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => onChange('phone', formatPhoneInput(e.target.value))} placeholder="077 123 4567" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Specialization</label>
              <input value={form.specialization} onChange={e => onChange('specialization', e.target.value)} placeholder="General Medicine" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Registration No.</label>
              <input value={form.registration_no} onChange={e => onChange('registration_no', e.target.value)} placeholder="SLMC/12345" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordModal({ open, onClose, staff }) {
  const [password, setPassword] = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { if (open) setPassword(''); }, [open]);

  async function handleReset() {
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/staff/${staff.id}/reset-password`, { new_password: password });
      toast.success(`Password reset for ${staff.full_name}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Reset Password</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Set a new password for <strong>{staff?.full_name}</strong>.</p>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="text"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleReset} disabled={saving} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [staff,        setStaff]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [resetTarget,  setResetTarget]  = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id of staff being toggled

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      setStaff(res.data.data);
    } catch {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(member, isNew) {
    if (isNew) {
      setStaff(prev => [...prev, member]);
    } else {
      setStaff(prev => prev.map(s => s.id === member.id ? member : s));
    }
  }

  async function handleToggleActive(member) {
    setActionLoading(member.id);
    try {
      const res = await api.put(`/staff/${member.id}`, { is_active: !member.is_active });
      setStaff(prev => prev.map(s => s.id === member.id ? res.data.data : s));
      toast.success(`${member.full_name} ${!member.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(null);
    }
  }

  const grouped = ROLES.reduce((acc, role) => {
    acc[role] = staff.filter(s => s.role === role);
    return acc;
  }, {});

  return (
    <PageLayout title="Staff Management">
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text)]">Staff Management</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{staff.length} staff member{staff.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-[var(--color-primary)] rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading...</div>
      ) : staff.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-gray-400">
          <Users className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No staff members yet. Add your first staff member.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ROLES.map(role => {
            const members = grouped[role];
            if (!members.length) return null;
            return (
              <div key={role} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_COLORS[role]}`}>{role}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center text-[var(--color-primary)] text-sm font-semibold shrink-0">
                        {member.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--color-text)] truncate">{member.full_name}</p>
                          {!member.is_active && (
                            <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">Inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">{member.email}</p>
                        {member.specialization && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">{member.specialization}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          title="Edit"
                          onClick={() => setEditTarget(member)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          title="Reset Password"
                          onClick={() => setResetTarget(member)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          title={member.is_active ? 'Deactivate' : 'Activate'}
                          disabled={actionLoading === member.id}
                          onClick={() => handleToggleActive(member)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            member.is_active
                              ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                              : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                          } disabled:opacity-40`}
                        >
                          {member.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <StaffModal
        open={showAdd || Boolean(editTarget)}
        onClose={() => { setShowAdd(false); setEditTarget(null); }}
        existing={editTarget}
        onSaved={handleSaved}
      />
      <ResetPasswordModal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        staff={resetTarget}
      />
    </div>
    </PageLayout>
  );
}
