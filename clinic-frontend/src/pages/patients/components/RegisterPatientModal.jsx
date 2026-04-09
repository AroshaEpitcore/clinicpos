import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { DuplicateWarningModal } from './DuplicateWarningModal';
import { patientsApi } from '../../../api/patients';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }));
const GENDERS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

export function RegisterPatientModal({ open, onClose, onSuccess, prefillPhone = '' }) {
  const [duplicates, setDuplicates]     = useState([]);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [pendingData, setPendingData]   = useState(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { phone: prefillPhone },
  });

  const phone      = watch('phone');
  const first_name = watch('first_name');
  const last_name  = watch('last_name');

  async function checkAndSubmit(data) {
    // Run duplicate check first
    try {
      const res = await patientsApi.checkDuplicate({
        phone:      data.phone,
        first_name: data.first_name,
        last_name:  data.last_name,
        national_id: data.national_id || '',
      });
      if (res.data.data.length > 0) {
        setDuplicates(res.data.data);
        setPendingData(data);
        setShowDuplicate(true);
        return;
      }
    } catch {
      // If duplicate check fails, proceed with registration
    }
    await submitPatient(data);
  }

  async function submitPatient(data) {
    try {
      const res = await patientsApi.create(data);
      toast.success(`${data.first_name} ${data.last_name} registered successfully`);
      reset();
      onSuccess(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  function handleUseExisting(patient) {
    setShowDuplicate(false);
    toast.info(`Using existing patient — ${patient.first_name} ${patient.last_name}`);
    onSuccess(patient);
    onClose();
  }

  function handleRegisterAnyway() {
    setShowDuplicate(false);
    submitPatient(pendingData);
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Register New Patient"
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" form="register-patient-form" loading={isSubmitting}>
              Register Patient
            </Button>
          </>
        }
      >
        <form id="register-patient-form" onSubmit={handleSubmit(checkAndSubmit)}>

          {/* ── Basic Info ─────────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Basic Information
          </p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Input
              label="First Name" required
              placeholder="First name"
              error={errors.first_name?.message}
              {...register('first_name', { required: 'First name is required' })}
            />
            <Input
              label="Last Name" required
              placeholder="Last name"
              error={errors.last_name?.message}
              {...register('last_name', { required: 'Last name is required' })}
            />
            <Input
              label="Date of Birth" required
              type="date"
              error={errors.date_of_birth?.message}
              {...register('date_of_birth', { required: 'Date of birth is required' })}
            />
            <Select
              label="Gender" required
              options={GENDERS}
              value={watch('gender')}
              onValueChange={v => setValue('gender', v)}
              error={errors.gender?.message}
            />
            <Input
              label="Phone Number" required
              placeholder="+94771234567"
              error={errors.phone?.message}
              {...register('phone', { required: 'Phone number is required' })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="patient@email.com"
              {...register('email')}
            />
          </div>

          {/* ── Medical Info ───────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Medical Information
          </p>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Select
              label="Blood Group"
              options={BLOOD_GROUPS}
              value={watch('blood_group')}
              onValueChange={v => setValue('blood_group', v)}
            />
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-[var(--color-text)]">Allergies</label>
              <textarea
                rows={2}
                placeholder="List any known allergies (e.g. Penicillin, Aspirin)"
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                {...register('allergies')}
              />
            </div>
          </div>

          {/* ── Additional ─────────────────────────────────────────────────── */}
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wide mb-3">
            Additional Details
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="Address"
                placeholder="Street, city"
                {...register('address')}
              />
            </div>
            <Input
              label="National ID"
              placeholder="NIC number"
              {...register('national_id')}
            />
            <Input
              label="Emergency Contact Name"
              placeholder="Name"
              {...register('emergency_name')}
            />
            <Input
              label="Emergency Contact Phone"
              placeholder="+94771234567"
              {...register('emergency_phone')}
            />
            <Input
              label="Insurance Provider"
              placeholder="e.g. AIA, Union Assurance"
              {...register('insurance_provider')}
            />
            <Input
              label="Insurance Policy Number"
              placeholder="Policy number"
              {...register('insurance_number')}
            />
          </div>

        </form>
      </Modal>

      <DuplicateWarningModal
        open={showDuplicate}
        onClose={() => setShowDuplicate(false)}
        matches={duplicates}
        onUseExisting={handleUseExisting}
        onRegisterAnyway={handleRegisterAnyway}
      />
    </>
  );
}
