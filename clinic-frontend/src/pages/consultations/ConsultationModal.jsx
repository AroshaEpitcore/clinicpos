import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AlertTriangle, Clock, User } from 'lucide-react';
import { Modal }   from '../../components/ui/Modal';
import { Button }  from '../../components/ui/Button';
import { Input }   from '../../components/ui/Input';
import { consultationsApi } from '../../api/consultations';
import { formatDate } from '../../utils/format';

export function ConsultationModal({ open, onClose, onSuccess, appointment }) {
  const [lastVisit, setLastVisit] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm();

  useEffect(() => {
    if (open && appointment) {
      reset();
      setLastVisit(null);
    }
  }, [open, appointment, reset]);

  async function onSubmit(data) {
    try {
      await consultationsApi.create({
        appointment_id:  appointment.id,
        patient_id:      appointment.patient_id,
        doctor_id:       appointment.doctor_id,
        chief_complaint: data.chief_complaint  || null,
        symptoms:        data.symptoms         || null,
        diagnosis:       data.diagnosis        || null,
        icd_code:        data.icd_code         || null,
        notes:           data.notes            || null,
        bp_systolic:     data.bp_systolic      ? parseInt(data.bp_systolic)       : null,
        bp_diastolic:    data.bp_diastolic     ? parseInt(data.bp_diastolic)      : null,
        temperature:     data.temperature      ? parseFloat(data.temperature)     : null,
        weight:          data.weight           ? parseFloat(data.weight)          : null,
        pulse:           data.pulse            ? parseInt(data.pulse)             : null,
        follow_up_date:  data.follow_up_date   || null,
      });
      toast.success('Consultation saved successfully');
      onClose();
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) {
        toast.error('A consultation already exists for this appointment');
      } else {
        toast.error(msg || 'Something went wrong. Please try again.');
      }
    }
  }

  if (!appointment) return null;

  const hasAllergies = appointment.patient_allergies;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Consultation"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Save & Complete
          </Button>
        </>
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
              Dr. {appointment.doctor_name}
              {appointment.appointment_time && ` · ${appointment.appointment_time.slice(0,5)}`}
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

      <form className="flex flex-col gap-5">

        {/* ── Vitals ── */}
        <section>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Vitals
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-text)]">Blood Pressure (mmHg)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Systolic"
                  {...register('bp_systolic')}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--color-text-secondary)] text-sm">/</span>
                <input
                  type="number"
                  placeholder="Diastolic"
                  {...register('bp_diastolic')}
                  className="w-full px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>
            <Input
              label="Pulse (bpm)"
              type="number"
              placeholder="e.g. 72"
              {...register('pulse')}
            />
            <Input
              label="Temperature (°C)"
              type="number"
              step="0.1"
              placeholder="e.g. 37.0"
              {...register('temperature')}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              placeholder="e.g. 68.5"
              {...register('weight')}
            />
          </div>
        </section>

        {/* ── Clinical ── */}
        <section>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Clinical Notes
          </p>
          <div className="grid grid-cols-2 gap-4">
            {/* Chief Complaint — required */}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">
                Chief Complaint <span className="text-[var(--color-danger)]">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Main reason for today's visit"
                {...register('chief_complaint', { required: 'Chief complaint is required' })}
                className={`w-full px-3 py-2 rounded-[var(--radius)] border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
                  errors.chief_complaint ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
                }`}
              />
              {errors.chief_complaint && (
                <span className="text-xs text-[var(--color-danger)]">{errors.chief_complaint.message}</span>
              )}
            </div>

            {/* Symptoms */}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Symptoms</label>
              <textarea
                rows={2}
                placeholder="Describe symptoms"
                {...register('symptoms')}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Diagnosis + ICD */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Diagnosis</label>
              <input
                type="text"
                placeholder="Diagnosis or impression"
                {...register('diagnosis')}
                className="w-full px-2.5 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">ICD-10 Code</label>
              <input
                type="text"
                placeholder="e.g. J06.9"
                {...register('icd_code')}
                className="w-full px-2.5 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>

            {/* Doctor's Notes */}
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Doctor's Notes</label>
              <textarea
                rows={3}
                placeholder="Treatment plan, advice, or additional notes"
                {...register('notes')}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              />
            </div>
          </div>
        </section>

        {/* ── Follow-up ── */}
        <section>
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Follow-up
          </p>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
            <Input
              label="Follow-up Date (optional)"
              type="date"
              {...register('follow_up_date')}
            />
          </div>
        </section>

      </form>
    </Modal>
  );
}
