import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Modal }   from '../../../components/ui/Modal';
import { Button }  from '../../../components/ui/Button';
import { Input }      from '../../../components/ui/Input';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Select }  from '../../../components/ui/Select';
import { patientsApi } from '../../../api/patients';
import { formatPhoneInput, validatePhone } from '../../../utils/format';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }));
const GENDERS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

export function EditPatientModal({ patient, onClose, onSuccess }) {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      first_name:         patient.first_name,
      last_name:          patient.last_name,
      date_of_birth:      patient.date_of_birth?.split('T')[0],
      gender:             patient.gender,
      phone:              patient.phone,
      email:              patient.email              || '',
      address:            patient.address            || '',
      blood_group:        patient.blood_group        || '',
      allergies:          patient.allergies          || '',
      emergency_name:     patient.emergency_name     || '',
      emergency_phone:    patient.emergency_phone    || '',
      national_id:        patient.national_id        || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_number:   patient.insurance_number   || '',
    },
  });

  async function onSubmit(data) {
    try {
      await patientsApi.update(patient.id, data);
      toast.success('Changes saved successfully');
      onSuccess();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit Patient"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-patient-form" loading={isSubmitting}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-patient-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name" required error={errors.first_name?.message}
            {...register('first_name', { required: 'First name is required' })} />
          <Input label="Last Name" required error={errors.last_name?.message}
            {...register('last_name', { required: 'Last name is required' })} />
          <DatePicker label="Date of Birth" required
            max={new Date().toISOString().slice(0, 10)}
            value={watch('date_of_birth') || ''}
            onChange={v => setValue('date_of_birth', v, { shouldValidate: true })}
            error={errors.date_of_birth?.message} />
          <Select label="Gender" required options={GENDERS}
            value={watch('gender')} onValueChange={v => setValue('gender', v)} />
          <Input label="Phone Number" required error={errors.phone?.message}
            placeholder="077 123 4567"
            value={watch('phone') || ''}
            {...register('phone', { validate: validatePhone })}
            onChange={e => setValue('phone', formatPhoneInput(e.target.value), { shouldValidate: !!errors.phone })} />
          <Input label="Email Address" type="email" {...register('email')} />
          <Select label="Blood Group" options={BLOOD_GROUPS}
            value={watch('blood_group')} onValueChange={v => setValue('blood_group', v)} />
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Allergies</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              {...register('allergies')}
            />
          </div>
          <Input label="National ID"               {...register('national_id')} />
          <Input label="Address"                   {...register('address')} />
          <Input label="Emergency Contact Name"    {...register('emergency_name')} />
          <Input label="Emergency Contact Phone"
            placeholder="077 123 4567"
            value={watch('emergency_phone') || ''}
            {...register('emergency_phone', {
              validate: v => !v || validatePhone(v) === undefined || validatePhone(v)
            })}
            onChange={e => setValue('emergency_phone', formatPhoneInput(e.target.value), { shouldValidate: !!errors.emergency_phone })} />
          <Input label="Insurance Provider"        {...register('insurance_provider')} />
          <Input label="Insurance Policy Number"   {...register('insurance_number')} />
        </div>
      </form>
    </Modal>
  );
}
