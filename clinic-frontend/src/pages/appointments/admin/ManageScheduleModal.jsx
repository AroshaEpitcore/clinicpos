import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Modal }  from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { LoadingState } from '../../../components/ui/Spinner';
import { doctorsApi }   from '../../../api/appointments';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DURATION_OPTIONS = [
  { value: '10', label: '10 min' },
  { value: '15', label: '15 min' },
  { value: '20', label: '20 min' },
  { value: '30', label: '30 min' },
];

function defaultRow(day) {
  return { day_of_week: day, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 15, is_active: false };
}

export function ManageScheduleModal({ open, onClose }) {
  const [doctors,    setDoctors]    = useState([]);
  const [doctorId,   setDoctorId]   = useState('');
  const [schedule,   setSchedule]   = useState(DAYS.map((_, i) => defaultRow(i)));
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    if (!open) return;
    doctorsApi.list().then(res => setDoctors(res.data.data));
  }, [open]);

  useEffect(() => {
    if (!doctorId) return;
    setLoading(true);
    doctorsApi.getSchedule(doctorId).then(res => {
      const saved = res.data.data;
      const merged = DAYS.map((_, i) => {
        const existing = saved.find(s => s.day_of_week === i);
        return existing
          ? { ...existing, start_time: existing.start_time.slice(0, 5), end_time: existing.end_time.slice(0, 5) }
          : defaultRow(i);
      });
      setSchedule(merged);
    }).finally(() => setLoading(false));
  }, [doctorId]);

  function updateDay(dayIndex, field, value) {
    setSchedule(prev => prev.map((row, i) => i === dayIndex ? { ...row, [field]: value } : row));
  }

  async function save() {
    if (!doctorId) { toast.error('Please fill in all required fields'); return; }
    setSaving(true);
    const active = schedule.filter(s => s.is_active);
    try {
      await Promise.all(active.map(s =>
        doctorsApi.saveScheduleDay({
          doctor_id:            doctorId,
          day_of_week:          s.day_of_week,
          start_time:           s.start_time,
          end_time:             s.end_time,
          slot_duration_minutes: parseInt(s.slot_duration_minutes),
          is_active:            true,
        })
      ));
      // Mark inactive days
      const inactive = schedule.filter(s => !s.is_active && s.id);
      await Promise.all(inactive.map(s =>
        doctorsApi.saveScheduleDay({ doctor_id: doctorId, day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time, slot_duration_minutes: s.slot_duration_minutes, is_active: false })
      ));
      toast.success('Changes saved successfully');
      onClose();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const doctorOptions = doctors.map(d => ({ value: d.id, label: d.full_name }));

  return (
    <Modal open={open} onClose={onClose} title="Doctor Working Hours" size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>Save Schedule</Button>
        </>
      }
    >
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
          {loading ? <LoadingState message="Loading schedule..." /> : (
            <div className="flex flex-col gap-2">
              {DAYS.map((day, i) => {
                const row = schedule[i];
                return (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-[var(--radius)] border ${row.is_active ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]' : 'border-[var(--color-border)]'}`}>
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={e => updateDay(i, 'is_active', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                    <span className="text-sm font-medium w-24 text-[var(--color-text)]">{day}</span>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        value={row.start_time}
                        disabled={!row.is_active}
                        onChange={e => updateDay(i, 'start_time', e.target.value)}
                        className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm disabled:opacity-40"
                      />
                      <span className="text-sm text-[var(--color-text-secondary)]">to</span>
                      <input
                        type="time"
                        value={row.end_time}
                        disabled={!row.is_active}
                        onChange={e => updateDay(i, 'end_time', e.target.value)}
                        className="px-2 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm disabled:opacity-40"
                      />
                      <Select
                        options={DURATION_OPTIONS}
                        value={String(row.slot_duration_minutes)}
                        onValueChange={v => updateDay(i, 'slot_duration_minutes', v)}
                        disabled={!row.is_active}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
