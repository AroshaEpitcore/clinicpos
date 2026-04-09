import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Modal }        from '../../../components/ui/Modal';
import { Button }       from '../../../components/ui/Button';
import { Input }        from '../../../components/ui/Input';
import { LoadingState } from '../../../components/ui/Spinner';
import { EmptyState }   from '../../../components/ui/EmptyState';
import { ConfirmDialog }from '../../../components/ui/ConfirmDialog';
import { doctorsApi }   from '../../../api/appointments';
import { formatDate }   from '../../../utils/format';
import { Calendar }     from 'lucide-react';

export function HolidaysModal({ open, onClose }) {
  const [holidays,     setHolidays]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [date,         setDate]         = useState('');
  const [label,        setLabel]        = useState('');
  const [adding,       setAdding]       = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    if (!open) return;
    load();
  }, [open]);

  async function load() {
    setLoading(true);
    try {
      const res = await doctorsApi.listHolidays();
      setHolidays(res.data.data);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function addHoliday() {
    if (!date || !label.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    setAdding(true);
    try {
      await doctorsApi.addHoliday({ holiday_date: date, label: label.trim() });
      toast.success(`${label} added as a holiday`);
      setDate('');
      setLabel('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await doctorsApi.deleteHoliday(deleteTarget.id);
      toast.success('Deleted successfully');
      setDeleteTarget(null);
      load();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Clinic Holidays" size="md"
        footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
      >
        {/* Add holiday form */}
        <div className="flex gap-3 mb-5">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <input
            type="text"
            placeholder="Holiday name (e.g. Christmas Day)"
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="flex-1 px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <Button onClick={addHoliday} loading={adding} size="md">Add</Button>
        </div>

        {/* List */}
        {loading ? <LoadingState /> : holidays.length === 0 ? (
          <EmptyState icon={Calendar} title="No holidays added yet" description="Appointments on holiday dates will be blocked automatically." />
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
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Remove Holiday"
        message={`Remove "${deleteTarget?.label}" from clinic holidays?`}
        confirmLabel="Yes, Remove"
      />
    </>
  );
}
