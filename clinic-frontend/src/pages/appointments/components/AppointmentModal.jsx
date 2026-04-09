import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Phone, Zap, UserPlus, Search, AlertTriangle } from 'lucide-react';
import { Modal }   from '../../../components/ui/Modal';
import { Button }  from '../../../components/ui/Button';
import { Input }   from '../../../components/ui/Input';
import { Select }  from '../../../components/ui/Select';
import { Spinner } from '../../../components/ui/Spinner';
import { appointmentsApi, doctorsApi } from '../../../api/appointments';
import { patientsApi } from '../../../api/patients';

const MODES = [
  { value: 'walkin',    label: 'Walk-in' },
  { value: 'booked',    label: 'Book Appointment' },
  { value: 'emergency', label: '⚡ Emergency' },
];

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
];

export function AppointmentModal({ open, onClose, onSuccess, defaultDate }) {
  const today = defaultDate || new Date().toISOString().split('T')[0];

  const [mode,         setMode]         = useState('walkin');
  const [doctors,      setDoctors]      = useState([]);
  const [slots,        setSlots]        = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSchedule,   setNoSchedule]   = useState(false);
  const [isHoliday,    setIsHoliday]    = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Patient
  const [patientTab,    setPatientTab]    = useState('search');
  const [phoneInput,    setPhoneInput]    = useState('');
  const [searching,     setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched,   setHasSearched]   = useState(false);
  const [patient,       setPatient]       = useState(null);

  // New patient inline form
  const [newFirst,  setNewFirst]  = useState('');
  const [newLast,   setNewLast]   = useState('');
  const [newPhone,  setNewPhone]  = useState('');
  const [newGender, setNewGender] = useState('');
  const [newDob,    setNewDob]    = useState('');

  // Duplicate check for new patient
  const [newDuplicates, setNewDuplicates] = useState([]);
  const [newConfirmed,  setNewConfirmed]  = useState(false);

  // Inline field errors
  const [fieldErrors, setFieldErrors] = useState({});

  const { register, handleSubmit, watch, setValue, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { appointment_date: today, doctor_id: '', reason: '' },
  });

  const doctorId = watch('doctor_id');
  const apptDate = watch('appointment_date');

  useEffect(() => {
    if (!open) return;
    doctorsApi.list().then(res => {
      setDoctors(res.data.data.map(d => ({ value: d.id, label: `${d.full_name}${d.specialization ? ` — ${d.specialization}` : ''}` })));
    });
  }, [open]);

  useEffect(() => {
    if (mode !== 'booked' || !doctorId || !apptDate) { setSlots([]); return; }
    setLoadingSlots(true);
    setNoSchedule(false);
    setIsHoliday(false);
    setSelectedSlot('');
    doctorsApi.slots(doctorId, apptDate).then(res => {
      if (res.data.holiday)    { setIsHoliday(true); setSlots([]); return; }
      if (res.data.noSchedule) { setNoSchedule(true); setSlots([]); return; }
      setSlots(res.data.data);
    }).finally(() => setLoadingSlots(false));
  }, [doctorId, apptDate, mode]);

  async function searchPatient() {
    if (!phoneInput.trim()) return;
    setSearching(true);
    setSearchResults([]);
    setHasSearched(false);
    try {
      const res = await patientsApi.searchReturning(phoneInput.trim());
      setSearchResults(res.data.data);
      setHasSearched(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  function selectPatient(p) {
    setPatient(p);
    setSearchResults([]);
    setPhoneInput('');
    setHasSearched(false);
    setFieldErrors(prev => ({ ...prev, patient: undefined }));
  }

  function switchToNew() {
    setNewPhone(phoneInput);
    setPatientTab('new');
    setSearchResults([]);
    setHasSearched(false);
    setNewDuplicates([]);
    setNewConfirmed(false);
  }

  async function onSubmit(data) {
    const errs = {};

    if (!data.doctor_id) errs.doctor = 'Please select a doctor';
    if (mode === 'booked' && !selectedSlot) errs.slot = 'Please select a time slot';

    let resolvedPatient = patient;

    if (patientTab === 'new' && !patient) {
      if (!newFirst.trim()) errs.newFirst = 'First name is required';
      if (!newLast.trim())  errs.newLast  = 'Last name is required';
      if (!newPhone.trim()) errs.newPhone = 'Phone is required';
      if (!newGender)       errs.newGender = 'Gender is required';
      if (!newDob)          errs.newDob   = 'Date of birth is required';
    } else if (!patient && patientTab === 'search') {
      errs.patient = 'Please select a patient';
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    // Create new patient on the fly
    if (patientTab === 'new' && !patient) {
      if (!newConfirmed) {
        try {
          const dupRes = await patientsApi.checkDuplicate({
            phone:      newPhone.trim(),
            first_name: newFirst.trim(),
            last_name:  newLast.trim(),
          });
          if (dupRes.data.data.length > 0) {
            setNewDuplicates(dupRes.data.data);
            return;
          }
        } catch { /* proceed */ }
      }

      try {
        const res = await patientsApi.create({
          first_name:    newFirst.trim(),
          last_name:     newLast.trim(),
          phone:         newPhone.trim(),
          gender:        newGender,
          date_of_birth: newDob,
        });
        resolvedPatient = res.data.data;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not register patient. Please try again.');
        return;
      }
    }

    try {
      await appointmentsApi.create({
        patient_id:       resolvedPatient.id,
        doctor_id:        data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_time: mode === 'booked' ? selectedSlot : null,
        type:             mode,
        reason:           data.reason || null,
      });
      const name = `${resolvedPatient.first_name} ${resolvedPatient.last_name}`;
      const msg = mode === 'emergency'
        ? 'Emergency patient added to queue'
        : mode === 'walkin'
        ? `${name} added to queue`
        : 'Appointment booked successfully';
      toast.success(msg);
      handleClose();
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  function handleClose() {
    reset({ appointment_date: today, doctor_id: '', reason: '' });
    setPatient(null);
    setPatientTab('search');
    setPhoneInput('');
    setSearchResults([]);
    setHasSearched(false);
    setSlots([]);
    setSelectedSlot('');
    setMode('walkin');
    setNewFirst(''); setNewLast(''); setNewPhone(''); setNewGender(''); setNewDob('');
    setNewDuplicates([]); setNewConfirmed(false);
    setFieldErrors({});
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add to Queue"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
            variant={mode === 'emergency' ? 'danger' : 'primary'}
          >
            {mode === 'emergency' ? '⚡ Add Emergency' : mode === 'walkin' ? 'Add to Queue' : 'Book Appointment'}
          </Button>
        </>
      }
    >
      {/* Mode toggle */}
      <div className="flex rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden mb-5">
        {MODES.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => { setMode(m.value); setSelectedSlot(''); setFieldErrors({}); }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === m.value
                ? m.value === 'emergency'
                  ? 'bg-[var(--color-danger)] text-white'
                  : 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-4">

        {/* ── Patient section ── */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-1">
            Patient <span className="text-[var(--color-danger)]">*</span>
          </label>

          {patient ? (
            <div className="flex items-center justify-between p-3 rounded-[var(--radius)] border border-[var(--color-primary)] bg-[var(--color-primary-light)]">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  {patient.first_name} {patient.last_name}
                  <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">{patient.patient_code}</span>
                </p>
                <p className="text-xs text-[var(--color-text-secondary)]">{patient.phone}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setPatient(null); setPatientTab('search'); }}>Change</Button>
            </div>
          ) : (
            <>
              {/* Search / New Patient tabs */}
              <div className="flex rounded-[var(--radius-sm)] border border-[var(--color-border)] overflow-hidden mb-3">
                <button type="button" onClick={() => setPatientTab('search')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                    patientTab === 'search' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
                  }`}>
                  <Search className="w-3.5 h-3.5" /> Search Existing
                </button>
                <button type="button" onClick={() => { setPatientTab('new'); setNewDuplicates([]); setNewConfirmed(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium transition-colors ${
                    patientTab === 'new' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
                  }`}>
                  <UserPlus className="w-3.5 h-3.5" /> New Patient
                </button>
              </div>

              {/* ── Search tab ── */}
              {patientTab === 'search' && (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                      <input
                        type="text" inputMode="numeric"
                        placeholder="Enter phone number..."
                        value={phoneInput}
                        onChange={e => { setPhoneInput(e.target.value); setHasSearched(false); }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchPatient())}
                        className="w-full pl-9 pr-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <Button type="button" variant="secondary" size="md" onClick={searchPatient} loading={searching}>Search</Button>
                  </div>

                  {searching && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-text-secondary)]">
                      <Spinner size="sm" /> Searching...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-[var(--color-border)] rounded-[var(--radius)] overflow-hidden">
                      {searchResults.map(p => (
                        <button key={p.id} type="button" onClick={() => selectPatient(p)}
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-[var(--color-primary-light)] border-b border-[var(--color-border)] last:border-0 transition-colors">
                          <span className="font-medium">{p.first_name} {p.last_name}</span>
                          <span className="text-[var(--color-text-secondary)] ml-2">{p.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {hasSearched && searchResults.length === 0 && !searching && (
                    <div className="mt-2 p-3 rounded-[var(--radius)] bg-[var(--color-bg)] border border-[var(--color-border)] flex items-center justify-between">
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        No patient found for <strong>{phoneInput}</strong>
                      </p>
                      <button type="button" onClick={switchToNew}
                        className="text-xs text-[var(--color-primary)] font-medium hover:underline flex items-center gap-1">
                        <UserPlus className="w-3.5 h-3.5" /> Register New
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* ── New Patient tab ── */}
              {patientTab === 'new' && (
                <div className="flex flex-col gap-3 p-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)]">

                  {newDuplicates.length > 0 ? (
                    <div className="rounded-[var(--radius)] border border-[var(--color-warning)] bg-[var(--color-warning-light)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                        <p className="text-xs font-semibold text-[var(--color-warning)]">
                          Possible duplicate — a patient with this name or phone already exists
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {newDuplicates.map(dup => (
                          <button key={dup.id} type="button" onClick={() => { setPatient(dup); setNewDuplicates([]); }}
                            className="w-full text-left px-3 py-2 rounded-[var(--radius-sm)] bg-white border border-[var(--color-border)] text-sm hover:border-[var(--color-primary)] transition-colors">
                            <span className="font-medium">{dup.first_name} {dup.last_name}</span>
                            <span className="text-[var(--color-text-secondary)] ml-2 text-xs">{dup.phone} · {dup.patient_code}</span>
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setNewConfirmed(true); setNewDuplicates([]); }}
                        className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] underline">
                        None of these — register as a new patient anyway
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Patient will be registered automatically when you add to queue.
                        {newConfirmed && <span className="text-[var(--color-warning)] ml-1">(Duplicate check skipped)</span>}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">First Name <span className="text-[var(--color-danger)]">*</span></label>
                          <input type="text" value={newFirst}
                            onChange={e => { setNewFirst(e.target.value); setNewConfirmed(false); setFieldErrors(p => ({...p, newFirst: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${fieldErrors.newFirst ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                          />
                          {fieldErrors.newFirst && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newFirst}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">Last Name <span className="text-[var(--color-danger)]">*</span></label>
                          <input type="text" value={newLast}
                            onChange={e => { setNewLast(e.target.value); setNewConfirmed(false); setFieldErrors(p => ({...p, newLast: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${fieldErrors.newLast ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                          />
                          {fieldErrors.newLast && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newLast}</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">Phone <span className="text-[var(--color-danger)]">*</span></label>
                          <input type="text" inputMode="numeric" value={newPhone}
                            onChange={e => { setNewPhone(e.target.value); setNewConfirmed(false); setFieldErrors(p => ({...p, newPhone: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${fieldErrors.newPhone ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                          />
                          {fieldErrors.newPhone && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newPhone}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">Gender <span className="text-[var(--color-danger)]">*</span></label>
                          <select value={newGender} onChange={e => { setNewGender(e.target.value); setFieldErrors(p => ({...p, newGender: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${fieldErrors.newGender ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}>
                            <option value="">Select...</option>
                            {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          {fieldErrors.newGender && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newGender}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[var(--color-text)]">Date of Birth <span className="text-[var(--color-danger)]">*</span></label>
                        <input type="date" value={newDob} max={today}
                          onChange={e => { setNewDob(e.target.value); setFieldErrors(p => ({...p, newDob: undefined})); }}
                          className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${fieldErrors.newDob ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                        />
                        {fieldErrors.newDob && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newDob}</span>}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Patient error (search tab — nothing selected) */}
              {fieldErrors.patient && (
                <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.patient}</p>
              )}
            </>
          )}
        </div>

        {/* Doctor */}
        <div className="flex flex-col gap-1">
          <Select
            label="Doctor"
            required
            options={doctors}
            value={watch('doctor_id')}
            onValueChange={v => { setValue('doctor_id', v); setFieldErrors(p => ({...p, doctor: undefined})); }}
            placeholder="Select a doctor..."
            error={fieldErrors.doctor}
          />
        </div>

        {/* Date — booked mode */}
        {mode === 'booked' && (
          <Input
            label="Appointment Date"
            type="date"
            required
            min={today}
            {...register('appointment_date')}
          />
        )}

        {/* Time slot picker — booked mode */}
        {mode === 'booked' && doctorId && apptDate && (
          <div>
            <label className="text-sm font-medium text-[var(--color-text)] block mb-2">
              Time Slot <span className="text-[var(--color-danger)]">*</span>
            </label>

            {loadingSlots && <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]"><Spinner size="sm" /> Loading slots...</div>}
            {isHoliday   && <p className="text-sm text-[var(--color-danger)]">This date is a clinic holiday. No appointments allowed.</p>}
            {noSchedule  && <p className="text-sm text-[var(--color-warning)]">No schedule set for this doctor on this day. Ask your admin to set working hours.</p>}

            {!loadingSlots && !isHoliday && !noSchedule && slots.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {slots.map(s => (
                  <button key={s.time} type="button" disabled={!s.available}
                    onClick={() => { setSelectedSlot(s.time); setFieldErrors(p => ({...p, slot: undefined})); }}
                    className={`py-1.5 rounded-[var(--radius-sm)] text-xs font-medium border transition-colors ${
                      !s.available
                        ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)] cursor-not-allowed line-through'
                        : selectedSlot === s.time
                        ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                        : 'bg-white text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                    }`}>
                    {s.time}
                  </button>
                ))}
              </div>
            )}

            {fieldErrors.slot && (
              <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.slot}</p>
            )}
          </div>
        )}

        {/* Reason */}
        {mode !== 'emergency' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Reason for Visit</label>
            <textarea rows={2} placeholder="Chief complaint or reason for visit"
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              {...register('reason')}
            />
          </div>
        )}

        {mode === 'emergency' && (
          <div className="p-3 rounded-[var(--radius)] bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-sm text-[var(--color-danger)] flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            Emergency patients are placed at the top of the queue immediately.
          </div>
        )}

      </form>
    </Modal>
  );
}
