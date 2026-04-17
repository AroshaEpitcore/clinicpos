import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AlertTriangle, Clock, User, Search, Trash2, Plus, Printer } from 'lucide-react';
import { Modal }        from '../../components/ui/Modal';
import { Button }       from '../../components/ui/Button';
import { Input }        from '../../components/ui/Input';
import { DatePicker }   from '../../components/ui/DatePicker';
import { consultationsApi } from '../../api/consultations';
import { prescriptionsApi } from '../../api/prescriptions';
import { medicinesApi }     from '../../api/medicines';
import { printPrescription } from '../../utils/printPrescription';
import { useAuth }      from '../../store/AuthContext';
import { formatDate }   from '../../utils/format';

// ── Prescription presets ──────────────────────────────────────────────────────
const DOSAGE_PRESETS    = ['1 tablet', '2 tablets', '½ tablet', '1 capsule', '5 ml', '10 ml', '1 teaspoon'];
const FREQUENCY_PRESETS = ['Once daily', 'Twice daily', 'Three times daily', 'Four times daily', 'Every 8 hours', 'Every 12 hours', 'As needed'];
const DURATION_PRESETS  = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Ongoing'];
const FOOD_PRESETS      = ['Before food', 'After food', 'With food', 'At bedtime'];

const DOSAGE_UNITS      = { '1 tablet': 1, '2 tablets': 2, '½ tablet': 0.5, '1 capsule': 1, '5 ml': 5, '10 ml': 10, '1 teaspoon': 5 };
const FREQUENCY_PER_DAY = { 'Once daily': 1, 'Twice daily': 2, 'Three times daily': 3, 'Four times daily': 4, 'Every 8 hours': 3, 'Every 12 hours': 2 };
const DURATION_DAYS     = { '3 days': 3, '5 days': 5, '7 days': 7, '10 days': 10, '14 days': 14, '1 month': 30 };

function calcQuantity(dosage, frequency, duration) {
  const units  = DOSAGE_UNITS[dosage];
  const perDay = FREQUENCY_PER_DAY[frequency];
  const days   = DURATION_DAYS[duration];
  if (units == null || perDay == null || days == null) return null;
  return Math.ceil(units * perDay * days);
}

function emptyItem() {
  return {
    medicine_id: '', medicine_name: '', custom_medicine_name: '',
    generic_name: '', strength: '', unit: '',
    dosage: '', frequency: '', duration: '', instructions: '', quantity_given: null,
  };
}

// ── Preset chips ──────────────────────────────────────────────────────────────
function PresetChips({ value, presets, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {presets.map(p => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onChange(p)}
          className={`px-2 py-0.5 rounded-full text-xs border transition-colors disabled:opacity-50 ${
            value === p
              ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function ConsultationModal({ open, onClose, onSuccess, appointment }) {
  const { clinic } = useAuth();

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { isSubmitting, errors },
  } = useForm();

  // ── Prescription state ────────────────────────────────────────────────────
  const [rxItems,       setRxItems]       = useState([emptyItem()]);
  const [rxItemErrors,  setRxItemErrors]  = useState([{}]);
  const [rxNotes,       setRxNotes]       = useState('');
  const [savedRx,       setSavedRx]       = useState(null);   // { id, rx_number } after save
  const [searchQueries, setSearchQueries] = useState(['']);
  const [suggestions,   setSuggestions]   = useState([[]]);
  const [searching,     setSearching]     = useState([false]);
  const [showDropdown,  setShowDropdown]  = useState([false]);
  const searchTimers = useRef([]);

  useEffect(() => {
    if (open && appointment) {
      reset();
      setRxItems([emptyItem()]);
      setRxItemErrors([{}]);
      setRxNotes('');
      setSavedRx(null);
      setSearchQueries(['']);
      setSuggestions([[]]);
      setSearching([false]);
      setShowDropdown([false]);
    }
  }, [open, appointment, reset]);

  // ── Rx helpers ────────────────────────────────────────────────────────────
  function updateRxItem(index, field, value) {
    setRxItems(prev => prev.map((it, i) => {
      if (i !== index) return it;
      const updated = { ...it, [field]: value };
      if (['dosage', 'frequency', 'duration'].includes(field)) {
        const auto = calcQuantity(updated.dosage, updated.frequency, updated.duration);
        if (auto !== null) updated.quantity_given = auto;
      }
      return updated;
    }));
    setRxItemErrors(prev => prev.map((e, i) => i === index ? { ...e, [field]: undefined } : e));
  }

  function addRxRow() {
    setRxItems(p => [...p, emptyItem()]);
    setRxItemErrors(p => [...p, {}]);
    setSearchQueries(p => [...p, '']);
    setSuggestions(p => [...p, []]);
    setSearching(p => [...p, false]);
    setShowDropdown(p => [...p, false]);
  }

  function removeRxRow(index) {
    if (rxItems.length === 1) return;
    setRxItems(p => p.filter((_, i) => i !== index));
    setRxItemErrors(p => p.filter((_, i) => i !== index));
    setSearchQueries(p => p.filter((_, i) => i !== index));
    setSuggestions(p => p.filter((_, i) => i !== index));
    setSearching(p => p.filter((_, i) => i !== index));
    setShowDropdown(p => p.filter((_, i) => i !== index));
  }

  function handleSearchChange(index, value) {
    setSearchQueries(p => p.map((q, i) => i === index ? value : q));
    // Clear selected medicine when user edits the search field
    setRxItems(p => p.map((it, i) => i === index ? { ...it, medicine_id: '', medicine_name: '' } : it));
    if (searchTimers.current[index]) clearTimeout(searchTimers.current[index]);
    if (value.length < 2) {
      setSuggestions(p => p.map((s, i) => i === index ? [] : s));
      setShowDropdown(p => p.map((v, i) => i === index ? false : v));
      return;
    }
    searchTimers.current[index] = setTimeout(async () => {
      setSearching(p => p.map((v, i) => i === index ? true : v));
      try {
        const res = await medicinesApi.list({ search: value });
        setSuggestions(p => p.map((s, i) => i === index ? res.data.data : s));
        setShowDropdown(p => p.map((v, i) => i === index ? true : v));
      } catch { /* ignore */ } finally {
        setSearching(p => p.map((v, i) => i === index ? false : v));
      }
    }, 300);
  }

  function selectMedicine(index, med) {
    setRxItems(p => p.map((it, i) => i === index ? {
      ...it, medicine_id: med.id, medicine_name: med.name,
      custom_medicine_name: '',
      generic_name: med.generic_name || '', strength: med.strength || '', unit: med.unit || '',
    } : it));
    setSearchQueries(p => p.map((q, i) => i === index ? med.name + (med.strength ? ` ${med.strength}` : '') : q));
    setShowDropdown(p => p.map((v, i) => i === index ? false : v));
    setSuggestions(p => p.map((s, i) => i === index ? [] : s));
  }

  // Returns items that have any medicine (from store or custom text)
  function getFilledRxItems() {
    return rxItems.filter((it, i) => {
      const hasStore  = !!it.medicine_id;
      const hasCustom = searchQueries[i]?.trim().length >= 2 && !it.medicine_id;
      return hasStore || hasCustom;
    });
  }

  function validateRx(filledItems) {
    const errors = rxItems.map((item, i) => {
      const e = {};
      const hasStore  = !!item.medicine_id;
      const hasCustom = searchQueries[i]?.trim().length >= 2;
      if (!hasStore && !hasCustom) return e; // empty row — skip validation
      if (!item.dosage.trim())    e.dosage    = 'Required';
      if (!item.frequency.trim()) e.frequency = 'Required';
      if (!item.duration.trim())  e.duration  = 'Required';
      return e;
    });
    setRxItemErrors(errors);
    return errors.every(e => Object.keys(e).length === 0);
  }

  async function handlePrintRx() {
    if (!savedRx) return;
    try {
      const res = await prescriptionsApi.getById(savedRx.id);
      printPrescription(res.data.data, clinic);
    } catch {
      toast.error('Could not load prescription for printing.');
    }
  }

  // ── Submit: save consultation then optional prescription ──────────────────
  async function onSubmit(data) {
    // Validate Rx if any medicines filled
    const filledItems = getFilledRxItems();
    if (filledItems.length > 0 && !validateRx(filledItems)) return;

    try {
      // 1. Save consultation
      await consultationsApi.create({
        appointment_id:  appointment.id,
        patient_id:      appointment.patient_id,
        doctor_id:       appointment.doctor_id,
        chief_complaint: data.chief_complaint  || null,
        symptoms:        data.symptoms         || null,
        diagnosis:       data.diagnosis        || null,
        icd_code:        data.icd_code         || null,
        notes:           data.notes            || null,
        bp_systolic:     data.bp_systolic      ? parseInt(data.bp_systolic)   : null,
        bp_diastolic:    data.bp_diastolic     ? parseInt(data.bp_diastolic)  : null,
        temperature:     data.temperature      ? parseFloat(data.temperature) : null,
        weight:          data.weight           ? parseFloat(data.weight)      : null,
        pulse:           data.pulse            ? parseInt(data.pulse)         : null,
        follow_up_date:  data.follow_up_date   || null,
      });

      // 2. Save prescription if medicines were added
      if (filledItems.length > 0) {
        const rxPayload = rxItems
          .map((item, i) => {
            const isStore  = !!item.medicine_id;
            const customTx = searchQueries[i]?.trim();
            if (!isStore && !customTx) return null;
            return {
              medicine_id:          isStore ? item.medicine_id : null,
              custom_medicine_name: isStore ? null : customTx,
              dosage:       item.dosage,
              frequency:    item.frequency,
              duration:     item.duration,
              instructions: item.instructions?.trim() || null,
              quantity_given: item.quantity_given ?? null,
            };
          })
          .filter(Boolean);

        const rxRes = await prescriptionsApi.create({
          appointment_id: appointment.id,
          patient_id:     appointment.patient_id,
          doctor_id:      appointment.doctor_id,
          notes:          rxNotes.trim() || null,
          items:          rxPayload,
        });
        const { id, rx_number } = rxRes.data.data;
        setSavedRx({ id, rx_number });
        toast.success(`Consultation saved · ${rx_number} written`);
      } else {
        toast.success('Consultation saved successfully');
        onClose();
      }

      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error('A consultation already exists for this appointment');
      } else {
        toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
      }
    }
  }

  if (!appointment) return null;
  const hasAllergies = appointment.patient_allergies;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={savedRx ? `Rx ${savedRx.rx_number} saved` : 'Consultation & Prescription'}
      size="xl"
      footer={
        <div className="flex items-center gap-3 w-full">
          {savedRx && (
            <Button variant="secondary" onClick={handlePrintRx}>
              <Printer className="w-4 h-4 mr-1.5" /> Print Rx
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="secondary" onClick={onClose}>
            {savedRx ? 'Close' : 'Cancel'}
          </Button>
          {!savedRx && (
            <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
              Save & Complete
            </Button>
          )}
        </div>
      }
    >
      {/* Patient info bar */}
      <div className="flex items-start justify-between p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {appointment.patient_name}
              <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{appointment.patient_code}</span>
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {appointment.doctor_name}
              {appointment.appointment_time && ` · ${appointment.appointment_time.slice(0, 5)}`}
            </p>
          </div>
        </div>
        {appointment.reason && (
          <p className="text-xs text-[var(--color-text-secondary)] max-w-[200px] text-right italic">
            "{appointment.reason}"
          </p>
        )}
      </div>

      {/* Allergy alert */}
      {hasAllergies && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-[var(--color-warning-light)] border border-[var(--color-warning)] mb-4">
          <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
          <p className="text-xs font-medium text-[var(--color-warning)]">
            Allergies: {appointment.patient_allergies}
          </p>
        </div>
      )}

      {/* Rx success banner */}
      {savedRx && (
        <div className="flex items-center gap-2 p-3 rounded-[var(--radius)] bg-[var(--color-success-light)] border border-[var(--color-success)] mb-4">
          <p className="text-sm font-semibold text-[var(--color-success)]">
            Prescription {savedRx.rx_number} saved. Use Print Rx to print.
          </p>
        </div>
      )}

      <form className="flex flex-col gap-5">

        {/* ── Vitals ─────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Vitals</p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-text)]">Blood Pressure (mmHg)</label>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Systolic"  {...register('bp_systolic')}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
                <span className="text-[var(--color-text-secondary)] text-sm">/</span>
                <input type="number" placeholder="Diastolic" {...register('bp_diastolic')}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
            </div>
            <Input label="Pulse (bpm)"      type="number" placeholder="e.g. 72"   {...register('pulse')} />
            <Input label="Temperature (°C)" type="number" step="0.1" placeholder="e.g. 37.0" {...register('temperature')} />
            <Input label="Weight (kg)"      type="number" step="0.1" placeholder="e.g. 68.5" {...register('weight')} />
          </div>
        </section>

        {/* ── Clinical Notes ──────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Clinical Notes</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Chief Complaint <span className="text-[var(--color-danger)]">*</span>
              </label>
              <textarea rows={2} placeholder="Main reason for today's visit"
                {...register('chief_complaint', { required: 'Chief complaint is required' })}
                className={`w-full px-3 py-2 rounded-[var(--radius)] border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  errors.chief_complaint ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                }`}
              />
              {errors.chief_complaint && (
                <span className="text-xs text-[var(--color-danger)]">{errors.chief_complaint.message}</span>
              )}
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Symptoms</label>
              <textarea rows={2} placeholder="Describe symptoms" {...register('symptoms')}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Diagnosis</label>
              <input type="text" placeholder="Diagnosis or impression" {...register('diagnosis')}
                className="w-full px-2.5 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">ICD-10 Code</label>
              <input type="text" placeholder="e.g. J06.9" {...register('icd_code')}
                className="w-full px-2.5 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Doctor's Notes</label>
              <textarea rows={2} placeholder="Treatment plan, advice, or additional notes" {...register('notes')}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </section>

        {/* ── Follow-up ───────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">Follow-up</p>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <DatePicker
              label="Follow-up Date (optional)"
              value={watch('follow_up_date') || ''}
              onChange={v => setValue('follow_up_date', v)}
            />
          </div>
        </section>

        {/* ── Prescription ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide">
              Medicines <span className="normal-case font-normal">(optional)</span>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {rxItems.map((item, index) => (
              <MedicineRow
                key={index}
                item={item}
                index={index}
                searchQuery={searchQueries[index]}
                suggestionList={suggestions[index]}
                isSearching={searching[index]}
                showDrop={showDropdown[index]}
                errors={rxItemErrors[index]}
                disabled={!!savedRx}
                showRemove={rxItems.length > 1}
                onSearchChange={v => handleSearchChange(index, v)}
                onSelectMedicine={med => selectMedicine(index, med)}
                onUpdate={(field, value) => updateRxItem(index, field, value)}
                onRemove={() => removeRxRow(index)}
              />
            ))}

            {!savedRx && (
              <button
                type="button"
                onClick={addRxRow}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius)] border border-dashed border-[var(--color-primary)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Another Medicine
              </button>
            )}
          </div>

          {/* Prescription general notes */}
          <div className="flex flex-col gap-1 mt-3">
            <label className="text-xs font-medium text-[var(--color-text)]">
              Prescription Notes <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Additional instructions for the patient..."
              value={rxNotes}
              onChange={e => setRxNotes(e.target.value)}
              disabled={!!savedRx}
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-[var(--color-bg)] disabled:cursor-default"
            />
          </div>
        </section>

      </form>
    </Modal>
  );
}

// ── Medicine row sub-component ────────────────────────────────────────────────
function MedicineRow({
  item, index, searchQuery, suggestionList, isSearching, showDrop,
  errors, disabled, showRemove,
  onSearchChange, onSelectMedicine, onUpdate, onRemove,
}) {
  const isFromStore  = !!item.medicine_id;
  const isCustomName = !isFromStore && searchQuery?.trim().length >= 2;

  return (
    <div className="p-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] flex flex-col gap-3">

      {/* Medicine search */}
      <div className="flex items-start gap-3">
        <div className="flex-1 flex flex-col gap-1 relative">
          <label className="text-xs font-medium text-[var(--color-text)]">
            Medicine
            {isFromStore  && <span className="ml-1.5 text-[10px] text-[var(--color-success)] font-normal">✓ from store</span>}
            {isCustomName && <span className="ml-1.5 text-[10px] text-[var(--color-warning)] font-normal">✎ custom name</span>}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder="Search store or type custom medicine name..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              disabled={disabled}
              className={`w-full pl-8 pr-3 py-2 rounded-[var(--radius)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                errors?.medicine ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
              } disabled:bg-[var(--color-surface)] disabled:cursor-default`}
            />
            {isSearching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-secondary)]">...</span>
            )}
          </div>
          {errors?.medicine && (
            <span className="text-xs text-[var(--color-danger)]">{errors.medicine}</span>
          )}

          {/* Suggestions dropdown */}
          {showDrop && suggestionList.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] shadow-lg max-h-48 overflow-y-auto">
              {suggestionList.map(med => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => onSelectMedicine(med)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--color-primary-light)] border-b border-[var(--color-border)] last:border-0 transition-colors"
                >
                  <span className="font-medium text-[var(--color-text)]">{med.name}</span>
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
        {!disabled && showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-6 p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] rounded-[var(--radius-sm)] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dosage / Frequency / Duration */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Dosage',    field: 'dosage',    presets: DOSAGE_PRESETS },
          { label: 'Frequency', field: 'frequency', presets: FREQUENCY_PRESETS },
          { label: 'Duration',  field: 'duration',  presets: DURATION_PRESETS },
        ].map(({ label, field, presets }) => (
          <div key={field} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-text)]">
              {label} <span className="text-[var(--color-danger)]">*</span>
            </label>
            <input
              type="text"
              value={item[field]}
              onChange={e => onUpdate(field, e.target.value)}
              disabled={disabled}
              className={`w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-[var(--color-surface)] disabled:cursor-default ${
                errors?.[field] ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
              }`}
            />
            {errors?.[field] && <span className="text-xs text-[var(--color-danger)]">{errors[field]}</span>}
            {!disabled && <PresetChips value={item[field]} presets={presets} onChange={v => onUpdate(field, v)} />}
          </div>
        ))}
      </div>

      {/* Instructions (food chips) + Qty */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-text)]">
            Instructions <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. After food, Avoid sunlight"
            value={item.instructions}
            onChange={e => onUpdate('instructions', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-[var(--color-surface)] disabled:cursor-default"
          />
          {!disabled && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {FOOD_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onUpdate('instructions', p)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    item.instructions === p
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-28 flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-text)]">
            Qty
            {item.quantity_given != null && !disabled && (
              <span className="ml-1 text-[10px] font-normal text-[var(--color-primary)]">(auto)</span>
            )}
          </label>
          <input
            type="number"
            min="1"
            placeholder="—"
            value={item.quantity_given ?? ''}
            onChange={e => onUpdate('quantity_given', e.target.value ? parseInt(e.target.value) : null)}
            disabled={disabled}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-[var(--color-surface)] disabled:cursor-default"
          />
          <span className="text-[10px] text-[var(--color-text-secondary)]">For invoice</span>
        </div>
      </div>
    </div>
  );
}
