import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Activity } from 'lucide-react';
import { Modal }  from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { vitalsApi } from '../../../api/vitals';

function Field({ label, unit, children }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-[var(--color-text)]">
        {label} {unit && <span className="text-[var(--color-text-secondary)] font-normal">({unit})</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]';

export function VitalsModal({ open, onClose, appointment }) {
  const [loading, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [existing, setExisting] = useState(null);

  const [bpSys,  setBpSys]  = useState('');
  const [bpDia,  setBpDia]  = useState('');
  const [temp,   setTemp]   = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [spo2,   setSpo2]   = useState('');
  const [pulse,  setPulse]  = useState('');
  const [notes,  setNotes]  = useState('');

  useEffect(() => {
    if (!open || !appointment) return;
    setFetching(true);
    vitalsApi.getByAppointment(appointment.id)
      .then(res => {
        const v = res.data.data;
        setExisting(v);
        if (v) {
          setBpSys(v.bp_systolic  ?? '');
          setBpDia(v.bp_diastolic ?? '');
          setTemp(v.temperature   ?? '');
          setWeight(v.weight      ?? '');
          setHeight(v.height      ?? '');
          setSpo2(v.spo2          ?? '');
          setPulse(v.pulse        ?? '');
          setNotes(v.notes        ?? '');
        } else {
          setBpSys(''); setBpDia(''); setTemp('');
          setWeight(''); setHeight(''); setSpo2('');
          setPulse(''); setNotes('');
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [open, appointment]);

  async function handleSave() {
    const anyFilled = bpSys || bpDia || temp || weight || height || spo2 || pulse;
    if (!anyFilled) {
      toast.error('Please enter at least one vital sign');
      return;
    }

    setSaving(true);
    try {
      await vitalsApi.record({
        appointment_id: appointment.id,
        patient_id:     appointment.patient_id,
        bp_systolic:    bpSys   ? parseInt(bpSys)     : null,
        bp_diastolic:   bpDia   ? parseInt(bpDia)     : null,
        temperature:    temp    ? parseFloat(temp)    : null,
        weight:         weight  ? parseFloat(weight)  : null,
        height:         height  ? parseFloat(height)  : null,
        spo2:           spo2    ? parseInt(spo2)      : null,
        pulse:          pulse   ? parseInt(pulse)     : null,
        notes:          notes.trim() || null,
      });
      toast.success(existing ? 'Vitals updated' : 'Vitals recorded');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (!appointment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Update Vitals' : 'Record Vitals'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} loading={loading}>
            {existing ? 'Update' : 'Save Vitals'}
          </Button>
        </>
      }
    >
      {/* Patient info */}
      <div className="flex items-center gap-3 p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] mb-5">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary-light)] flex items-center justify-center shrink-0">
          <Activity className="w-4 h-4 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">
            {appointment.patient_name}
            <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{appointment.patient_code}</span>
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">Token #{appointment.token_number} · {appointment.doctor_name}</p>
        </div>
        {existing && (
          <span className="ml-auto text-xs text-[var(--color-success)] font-semibold bg-[var(--color-success-light)] px-2 py-0.5 rounded-full">
            Recorded
          </span>
        )}
      </div>

      {fetching ? (
        <div className="text-center py-8 text-sm text-[var(--color-text-secondary)]">Loading...</div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Blood Pressure */}
          <Field label="Blood Pressure" unit="mmHg">
            <div className="flex items-center gap-2">
              <input type="number" placeholder="Systolic" value={bpSys} onChange={e => setBpSys(e.target.value)}
                className={inputCls} />
              <span className="text-[var(--color-text-secondary)] font-semibold">/</span>
              <input type="number" placeholder="Diastolic" value={bpDia} onChange={e => setBpDia(e.target.value)}
                className={inputCls} />
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pulse" unit="bpm">
              <input type="number" placeholder="e.g. 72" value={pulse} onChange={e => setPulse(e.target.value)} className={inputCls} />
            </Field>
            <Field label="SpO2" unit="%">
              <input type="number" placeholder="e.g. 98" min="0" max="100" value={spo2} onChange={e => setSpo2(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Temperature" unit="°C">
              <input type="number" step="0.1" placeholder="e.g. 37.0" value={temp} onChange={e => setTemp(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Weight" unit="kg">
              <input type="number" step="0.1" placeholder="e.g. 68.5" value={weight} onChange={e => setWeight(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Height" unit="cm">
              <input type="number" step="0.1" placeholder="e.g. 170.0" value={height} onChange={e => setHeight(e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Notes" >
            <input type="text" placeholder="Any observations (optional)" value={notes} onChange={e => setNotes(e.target.value)} className={inputCls} />
          </Field>

        </div>
      )}
    </Modal>
  );
}
