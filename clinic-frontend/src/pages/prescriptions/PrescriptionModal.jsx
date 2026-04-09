import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Printer, Trash2, Plus, Search, User, AlertTriangle } from 'lucide-react';
import { Modal }   from '../../components/ui/Modal';
import { Button }  from '../../components/ui/Button';
import { Input }   from '../../components/ui/Input';
import { medicinesApi }     from '../../api/medicines';
import { prescriptionsApi } from '../../api/prescriptions';
import { printPrescription } from '../../utils/printPrescription';
import { useAuth } from '../../store/AuthContext';

const DOSAGE_PRESETS    = ['1 tablet', '2 tablets', '½ tablet', '1 capsule', '5 ml', '10 ml', '1 teaspoon'];
const FREQUENCY_PRESETS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'Every 12 hours', 'As needed'];
const DURATION_PRESETS  = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Ongoing'];

function emptyItem() {
  return {
    medicine_id: '', medicine_name: '', generic_name: '', strength: '', unit: '',
    dosage: '', frequency: '', duration: '', instructions: '',
  };
}

export function PrescriptionModal({ open, onClose, onSuccess, appointment }) {
  const { clinic } = useAuth();

  const [items,          setItems]          = useState([emptyItem()]);
  const [itemErrors,     setItemErrors]     = useState([{}]);
  const [notes,          setNotes]          = useState('');
  const [saving,         setSaving]         = useState(false);
  const [savedRx,        setSavedRx]        = useState(null);   // { id, rx_number } after save

  // Medicine search state per row
  const [searchQueries,  setSearchQueries]  = useState(['']);
  const [suggestions,    setSuggestions]    = useState([[]]);
  const [searching,      setSearching]      = useState([false]);
  const [showDropdown,   setShowDropdown]   = useState([false]);
  const searchTimers = useRef([]);

  useEffect(() => {
    if (open) {
      setItems([emptyItem()]);
      setItemErrors([{}]);
      setNotes('');
      setSavedRx(null);
      setSearchQueries(['']);
      setSuggestions([[]]);
      setSearching([false]);
      setShowDropdown([false]);
    }
  }, [open]);

  function updateItem(index, field, value) {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
    setItemErrors(prev => prev.map((e, i) => i === index ? { ...e, [field]: undefined } : e));
  }

  function addRow() {
    setItems(prev => [...prev, emptyItem()]);
    setItemErrors(prev => [...prev, {}]);
    setSearchQueries(prev => [...prev, '']);
    setSuggestions(prev => [...prev, []]);
    setSearching(prev => [...prev, false]);
    setShowDropdown(prev => [...prev, false]);
  }

  function removeRow(index) {
    if (items.length === 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
    setItemErrors(prev => prev.filter((_, i) => i !== index));
    setSearchQueries(prev => prev.filter((_, i) => i !== index));
    setSuggestions(prev => prev.filter((_, i) => i !== index));
    setSearching(prev => prev.filter((_, i) => i !== index));
    setShowDropdown(prev => prev.filter((_, i) => i !== index));
  }

  function handleSearchChange(index, value) {
    setSearchQueries(prev => prev.map((q, i) => i === index ? value : q));
    if (searchTimers.current[index]) clearTimeout(searchTimers.current[index]);
    if (value.length < 2) {
      setSuggestions(prev => prev.map((s, i) => i === index ? [] : s));
      setShowDropdown(prev => prev.map((v, i) => i === index ? false : v));
      return;
    }
    searchTimers.current[index] = setTimeout(async () => {
      setSearching(prev => prev.map((v, i) => i === index ? true : v));
      try {
        const res = await medicinesApi.list({ search: value });
        setSuggestions(prev => prev.map((s, i) => i === index ? res.data.data : s));
        setShowDropdown(prev => prev.map((v, i) => i === index ? true : v));
      } catch { /* ignore */ } finally {
        setSearching(prev => prev.map((v, i) => i === index ? false : v));
      }
    }, 300);
  }

  function selectMedicine(index, med) {
    setItems(prev => prev.map((it, i) => i === index ? {
      ...it,
      medicine_id:   med.id,
      medicine_name: med.name,
      generic_name:  med.generic_name || '',
      strength:      med.strength || '',
      unit:          med.unit || '',
    } : it));
    setSearchQueries(prev => prev.map((q, i) => i === index ? med.name + (med.strength ? ` ${med.strength}` : '') : q));
    setShowDropdown(prev => prev.map((v, i) => i === index ? false : v));
    setSuggestions(prev => prev.map((s, i) => i === index ? [] : s));
  }

  function validate() {
    const errors = items.map(item => {
      const e = {};
      if (!item.medicine_id)      e.medicine = 'Select a medicine';
      if (!item.dosage.trim())    e.dosage    = 'Required';
      if (!item.frequency.trim()) e.frequency = 'Required';
      if (!item.duration.trim())  e.duration  = 'Required';
      return e;
    });
    setItemErrors(errors);
    return errors.every(e => Object.keys(e).length === 0);
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await prescriptionsApi.create({
        appointment_id: appointment.id,
        patient_id:     appointment.patient_id,
        doctor_id:      appointment.doctor_id,
        notes:          notes.trim() || null,
        items:          items.map(({ medicine_id, dosage, frequency, duration, instructions }) => ({
          medicine_id, dosage, frequency, duration, instructions: instructions.trim() || null,
        })),
      });
      const { id, rx_number } = res.data.data;
      setSavedRx({ id, rx_number });
      toast.success(`${rx_number} saved successfully`);
      onSuccess?.();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('A prescription already exists for this consultation');
      } else {
        toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePrint() {
    if (!savedRx) return;
    try {
      const res = await prescriptionsApi.getById(savedRx.id);
      printPrescription(res.data.data, clinic);
    } catch {
      toast.error('Could not load prescription for printing.');
    }
  }

  if (!appointment) return null;
  const hasAllergies = appointment.patient_allergies;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={savedRx ? `Prescription ${savedRx.rx_number}` : 'Write Prescription'}
      size="xl"
      footer={
        <div className="flex items-center gap-3 w-full">
          {savedRx && (
            <Button variant="secondary" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" /> Print
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            {savedRx ? 'Close' : 'Cancel'}
          </Button>
          {!savedRx && (
            <Button onClick={handleSave} loading={saving}>
              Save Prescription
            </Button>
          )}
        </div>
      }
    >
      {/* Patient bar */}
      <div className="flex items-center justify-between p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {appointment.patient_name}
              <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{appointment.patient_code}</span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">Dr. {appointment.doctor_name}</p>
          </div>
        </div>
      </div>

      {/* Allergy alert */}
      {hasAllergies && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-[var(--color-warning-light)] border border-[var(--color-warning)] mb-4">
          <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
          <p className="text-xs font-medium text-[var(--color-warning)]">Allergies: {appointment.patient_allergies}</p>
        </div>
      )}

      {/* Success banner after save */}
      {savedRx && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-[var(--color-success-light)] border border-[var(--color-success)] mb-4">
          <p className="text-sm font-semibold text-[var(--color-success)]">
            Prescription {savedRx.rx_number} saved. Use the Print button below to print.
          </p>
        </div>
      )}

      {/* Medicine rows */}
      <div className="flex flex-col gap-3 mb-4">
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">Medicines</p>

        {items.map((item, index) => (
          <div key={index} className="p-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col gap-3">

            {/* Medicine search */}
            <div className="flex items-start gap-3">
              <div className="flex-1 flex flex-col gap-1 relative">
                <label className="text-xs font-medium text-[var(--color-text)]">
                  Medicine <span className="text-[var(--color-danger)]">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
                  <input
                    type="text"
                    placeholder="Type medicine name..."
                    value={searchQueries[index]}
                    onChange={e => handleSearchChange(index, e.target.value)}
                    disabled={!!savedRx}
                    className={`w-full pl-8 pr-3 py-2 rounded-[var(--radius)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                      itemErrors[index]?.medicine ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                    } disabled:bg-white disabled:cursor-default`}
                  />
                  {searching[index] && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">...</span>
                  )}
                </div>
                {itemErrors[index]?.medicine && (
                  <span className="text-xs text-[var(--color-danger)]">{itemErrors[index].medicine}</span>
                )}

                {/* Suggestions dropdown */}
                {showDropdown[index] && suggestions[index].length > 0 && (
                  <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-[var(--color-border)] rounded-[var(--radius)] shadow-lg max-h-48 overflow-y-auto">
                    {suggestions[index].map(med => (
                      <button
                        key={med.id}
                        type="button"
                        onClick={() => selectMedicine(index, med)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--color-primary-light)] border-b border-[var(--color-border)] last:border-0 transition-colors"
                      >
                        <span className="font-medium">{med.name}</span>
                        {med.strength && <span className="text-xs text-[var(--color-text-secondary)] ml-1">{med.strength}</span>}
                        {med.unit && <span className="text-xs text-[var(--color-text-secondary)] ml-1">· {med.unit}</span>}
                        {med.generic_name && <span className="text-xs text-[var(--color-text-secondary)] ml-2">({med.generic_name})</span>}
                        <span className={`float-right text-xs font-medium ${med.stock_quantity <= med.reorder_level ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                          Stock: {med.stock_quantity}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Remove row */}
              {!savedRx && items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="mt-6 p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-[var(--radius-sm)] transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dosage / Frequency / Duration */}
            <div className="grid grid-cols-3 gap-3">
              <FieldWithPresets
                label="Dosage" required
                value={item.dosage}
                onChange={v => updateItem(index, 'dosage', v)}
                presets={DOSAGE_PRESETS}
                error={itemErrors[index]?.dosage}
                disabled={!!savedRx}
              />
              <FieldWithPresets
                label="Frequency" required
                value={item.frequency}
                onChange={v => updateItem(index, 'frequency', v)}
                presets={FREQUENCY_PRESETS}
                error={itemErrors[index]?.frequency}
                disabled={!!savedRx}
              />
              <FieldWithPresets
                label="Duration" required
                value={item.duration}
                onChange={v => updateItem(index, 'duration', v)}
                presets={DURATION_PRESETS}
                error={itemErrors[index]?.duration}
                disabled={!!savedRx}
              />
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-text)]">Instructions <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Take after food, Avoid sunlight"
                value={item.instructions}
                onChange={e => updateItem(index, 'instructions', e.target.value)}
                disabled={!!savedRx}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-white disabled:cursor-default"
              />
            </div>
          </div>
        ))}

        {/* Add medicine row */}
        {!savedRx && (
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius)] border border-dashed border-[var(--color-primary)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Another Medicine
          </button>
        )}
      </div>

      {/* General notes */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-[var(--color-text)]">
          General Notes <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="Additional instructions for the patient..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={!!savedRx}
          className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-white disabled:cursor-default"
        />
      </div>
    </Modal>
  );
}

// Inline sub-component: text input + quick-select preset chips
function FieldWithPresets({ label, required, value, onChange, presets, error, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-text)]">
        {label} {required && <span className="text-[var(--color-danger)]">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-white disabled:cursor-default ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
        }`}
      />
      {error && <span className="text-xs text-[var(--color-danger)]">{error}</span>}
      {!disabled && (
        <div className="flex flex-wrap gap-1 mt-1">
          {presets.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                value === p
                  ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                  : 'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
