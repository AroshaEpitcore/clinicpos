import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Phone, Zap, UserPlus, Search, AlertTriangle, RefreshCw, Printer } from 'lucide-react';
import { Drawer }     from '../../../components/ui/Drawer';
import { Button }     from '../../../components/ui/Button';
import { Input }      from '../../../components/ui/Input';
import { Select }     from '../../../components/ui/Select';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Spinner }    from '../../../components/ui/Spinner';
import { appointmentsApi, doctorsApi } from '../../../api/appointments';
import { patientsApi } from '../../../api/patients';
import { useAuth }    from '../../../store/AuthContext';
import { printTokenSlip } from '../../../utils/printTokenSlip';

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

export function AppointmentModal({ open, onClose, onSuccess, defaultDate, allowWalkIns = true }) {
  const today = defaultDate || new Date().toISOString().split('T')[0];
  const availableModes = MODES.filter(m => m.value !== 'walkin' || allowWalkIns);
  const { clinic } = useAuth();

  const [bookedSlip, setBookedSlip] = useState(null); // shown after successful booking

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

  const [newDuplicates, setNewDuplicates] = useState([]);
  const [newConfirmed,  setNewConfirmed]  = useState(false);
  const [fieldErrors,   setFieldErrors]   = useState({});

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { appointment_date: today, doctor_id: '', reason: '' },
  });

  const doctorId = watch('doctor_id');
  const apptDate = watch('appointment_date');

  // Load doctors when drawer opens
  useEffect(() => {
    if (!open) return;
    if (!allowWalkIns && mode === 'walkin') setMode('booked');
    doctorsApi.list().then(res => {
      setDoctors(res.data.data.map(d => ({
        value: d.id,
        label: `${d.full_name}${d.specialization ? ` — ${d.specialization}` : ''}`,
      })));
    });
  }, [open, allowWalkIns]);

  // Load slots whenever doctor, date, or mode changes (all modes now)
  useEffect(() => {
    if (!doctorId || !apptDate || mode === 'emergency') {
      setSlots([]); setNoSchedule(false); setIsHoliday(false);
      return;
    }
    loadSlots();
  }, [doctorId, apptDate, mode]);

  function loadSlots() {
    setLoadingSlots(true);
    setNoSchedule(false);
    setIsHoliday(false);
    setSelectedSlot('');
    doctorsApi.slots(doctorId, apptDate)
      .then(res => {
        if (res.data.holiday)    { setIsHoliday(true);  setSlots([]); return; }
        if (res.data.noSchedule) { setNoSchedule(true); setSlots([]); return; }
        setSlots(res.data.data || []);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }

  function selectPatient(p) {
    setPatient({ ...p, first_name: p.first_name, last_name: p.last_name });
    setSearchResults([]);
  }

  function switchToNew() {
    setPatientTab('new');
    setNewPhone(phoneInput);
    setSearchResults([]);
  }

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
      setHasSearched(true);
    } finally {
      setSearching(false);
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
    setMode(allowWalkIns ? 'walkin' : 'booked');
    setNewFirst(''); setNewLast(''); setNewPhone('');
    setNewGender(''); setNewDob('');
    setNewDuplicates([]); setNewConfirmed(false);
    setFieldErrors({});
    setBookedSlip(null);
    onClose();
  }

  async function onSubmit(data) {
    const errs = {};
    let resolvedPatient = patient;

    if (!resolvedPatient && patientTab === 'search') errs.patient = 'Please search and select a patient';
    if (patientTab === 'new' && !patient) {
      if (!newFirst.trim())  errs.newFirst  = 'Required';
      if (!newLast.trim())   errs.newLast   = 'Required';
      if (!newPhone.trim())  errs.newPhone  = 'Required';
      if (!newGender)        errs.newGender = 'Required';
      if (!newDob)           errs.newDob    = 'Required';
    }
    if (!data.doctor_id) errs.doctor = 'Please select a doctor';

    // Slot required for booked mode
    if (mode === 'booked' && !selectedSlot) errs.slot = 'Please select a time slot';

    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});

    // Create new patient on the fly if needed
    if (patientTab === 'new' && !patient) {
      if (!newConfirmed) {
        try {
          const dupRes = await patientsApi.checkDuplicate({
            phone: newPhone.trim(), first_name: newFirst.trim(), last_name: newLast.trim(),
          });
          if (dupRes.data.data.length > 0) { setNewDuplicates(dupRes.data.data); return; }
        } catch { /* proceed */ }
      }
      try {
        const res = await patientsApi.create({
          first_name: newFirst.trim(), last_name: newLast.trim(),
          phone: newPhone.trim(), gender: newGender, date_of_birth: newDob,
        });
        resolvedPatient = res.data.data;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not register patient.');
        return;
      }
    }

    try {
      const res = await appointmentsApi.create({
        patient_id:       resolvedPatient.id,
        doctor_id:        data.doctor_id,
        appointment_date: data.appointment_date,
        appointment_time: selectedSlot || null,
        type:             mode,
        reason:           data.reason || null,
      });
      const appt = res.data?.data || {};
      const doctorOption = doctors.find(d => d.value === data.doctor_id);
      const doctorLabel  = doctorOption ? doctorOption.label.split(' — ')[0] : '—';

      // Show slip screen instead of closing
      setBookedSlip({
        clinicName:  clinic?.name || 'ClinicPOS',
        patientName: `${resolvedPatient.first_name} ${resolvedPatient.last_name}`,
        patientCode: resolvedPatient.patient_code || '',
        doctorName:  doctorLabel,
        tokenNumber: appt.token_number || null,
        bookingRef:  appt.booking_reference || null,
        date:        data.appointment_date,
        time:        selectedSlot || null,
        type:        mode,
      });
      toast.success(mode === 'emergency' ? 'Emergency patient added' : 'Added to queue');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  const showSlots = mode !== 'emergency' && doctorId && apptDate;

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={bookedSlip ? 'Booking Confirmed' : 'Add to Queue'}
      width="540px"
      footer={
        bookedSlip ? (
          <>
            <Button variant="secondary" onClick={handleClose}>Done</Button>
            <Button onClick={() => printTokenSlip(bookedSlip)}>
              <Printer className="w-4 h-4" /> Print Slip
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose}>Cancel</Button>
            <Button
              onClick={handleSubmit(onSubmit)}
              variant={mode === 'emergency' ? 'danger' : 'primary'}
            >
              {mode === 'emergency' ? '⚡ Add Emergency' : mode === 'walkin' ? 'Add to Queue' : 'Book Appointment'}
            </Button>
          </>
        )
      }
    >
      {/* ── Slip confirmation screen ── */}
      {bookedSlip && (
        <div className="flex flex-col items-center py-6 space-y-5">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-[var(--color-text)]">{bookedSlip.patientName}</p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">has been added to the queue</p>
          </div>

          {/* Token / Reference */}
          {bookedSlip.tokenNumber && (
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest mb-1">Token</p>
              <p className="text-5xl font-black text-[var(--color-text)]">{String(bookedSlip.tokenNumber).padStart(2, '0')}</p>
            </div>
          )}
          {!bookedSlip.tokenNumber && bookedSlip.bookingRef && (
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest mb-1">Booking Ref</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{bookedSlip.bookingRef}</p>
            </div>
          )}

          {/* Details */}
          <div className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl p-4 space-y-2 text-sm">
            {[
              ['Doctor', bookedSlip.doctorName],
              ['Date',   new Date(bookedSlip.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
              bookedSlip.time ? ['Time', bookedSlip.time] : null,
              ['Type',   bookedSlip.type === 'emergency' ? '⚡ Emergency' : bookedSlip.type === 'booked' ? 'Booked' : 'Walk-in'],
            ].filter(Boolean).map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">{label}</span>
                <span className="font-medium text-[var(--color-text)]">{value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--color-text-secondary)]">Click <strong>Print Slip</strong> to print a token for the patient.</p>
        </div>
      )}

      {/* ── Booking form (hidden once slip is shown) ── */}
      {!bookedSlip && <>
      {/* ── Mode toggle ── */}
      <div className="flex rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden mb-6">
        {availableModes.map(m => (
          <button key={m.value} type="button"
            onClick={() => { setMode(m.value); setSelectedSlot(''); setFieldErrors({}); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              mode === m.value
                ? m.value === 'emergency'
                  ? 'bg-[var(--color-danger)] text-white'
                  : 'bg-[var(--color-primary)] text-white'
                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
            }`}>
            {m.label}
          </button>
        ))}
      </div>

      <form className="flex flex-col gap-5">

        {/* ── Patient ── */}
        <div>
          <label className="text-sm font-medium text-[var(--color-text)] block mb-2">
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
              {/* Search / New tabs */}
              <div className="flex rounded-[var(--radius-sm)] border border-[var(--color-border)] overflow-hidden mb-3">
                <button type="button" onClick={() => setPatientTab('search')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    patientTab === 'search' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
                  }`}>
                  <Search className="w-3.5 h-3.5" /> Search Existing
                </button>
                <button type="button" onClick={() => { setPatientTab('new'); setNewDuplicates([]); setNewConfirmed(false); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    patientTab === 'new' ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
                  }`}>
                  <UserPlus className="w-3.5 h-3.5" /> New Patient
                </button>
              </div>

              {/* Search tab */}
              {patientTab === 'search' && (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                      <input type="text" inputMode="numeric" placeholder="Enter phone number..."
                        value={phoneInput}
                        onChange={e => { setPhoneInput(e.target.value); setHasSearched(false); }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchPatient())}
                        className="w-full pl-9 pr-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)]"
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
                          <span className="text-[var(--color-text-secondary)] ml-2 text-xs">{p.phone} · {p.patient_code}</span>
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

              {/* New patient tab */}
              {patientTab === 'new' && (
                <div className="flex flex-col gap-3 p-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                  {newDuplicates.length > 0 ? (
                    <div className="rounded-[var(--radius)] border border-[var(--color-warning)] bg-[var(--color-warning-light)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] shrink-0" />
                        <p className="text-xs font-semibold text-[var(--color-warning)]">Possible duplicate</p>
                      </div>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {newDuplicates.map(dup => (
                          <button key={dup.id} type="button" onClick={() => { setPatient(dup); setNewDuplicates([]); }}
                            className="w-full text-left px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-surface)] border border-[var(--color-border)] text-sm hover:border-[var(--color-primary)] transition-colors">
                            <span className="font-medium">{dup.first_name} {dup.last_name}</span>
                            <span className="text-[var(--color-text-secondary)] ml-2 text-xs">{dup.phone} · {dup.patient_code}</span>
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setNewConfirmed(true); setNewDuplicates([]); }}
                        className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] underline">
                        None of these — register anyway
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-[var(--color-text-secondary)]">
                        Patient will be registered when you submit.
                        {newConfirmed && <span className="text-[var(--color-warning)] ml-1">(Duplicate check skipped)</span>}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">First Name <span className="text-[var(--color-danger)]">*</span></label>
                          <input type="text" value={newFirst}
                            onChange={e => { setNewFirst(e.target.value); setNewConfirmed(false); setFieldErrors(p => ({...p, newFirst: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] ${fieldErrors.newFirst ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                          />
                          {fieldErrors.newFirst && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newFirst}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">Last Name <span className="text-[var(--color-danger)]">*</span></label>
                          <input type="text" value={newLast}
                            onChange={e => { setNewLast(e.target.value); setNewConfirmed(false); setFieldErrors(p => ({...p, newLast: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] ${fieldErrors.newLast ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                          />
                          {fieldErrors.newLast && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newLast}</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[var(--color-text)]">Phone <span className="text-[var(--color-danger)]">*</span></label>
                          <input type="text" inputMode="numeric" value={newPhone}
                            onChange={e => { setNewPhone(e.target.value); setNewConfirmed(false); setFieldErrors(p => ({...p, newPhone: undefined})); }}
                            className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] ${fieldErrors.newPhone ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                          />
                          {fieldErrors.newPhone && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newPhone}</span>}
                        </div>
                        <Select label="Gender" required options={GENDER_OPTIONS} value={newGender}
                          onValueChange={v => { setNewGender(v); setFieldErrors(p => ({...p, newGender: undefined})); }}
                          placeholder="Select..." error={fieldErrors.newGender}
                        />
                      </div>
                      <DatePicker label="Date of Birth" required value={newDob} max={today}
                        onChange={v => { setNewDob(v); setFieldErrors(p => ({...p, newDob: undefined})); }}
                        error={fieldErrors.newDob}
                      />
                    </>
                  )}
                </div>
              )}

              {fieldErrors.patient && (
                <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.patient}</p>
              )}
            </>
          )}
        </div>

        {/* ── Doctor ── */}
        <Select
          label="Doctor"
          required
          options={doctors}
          value={doctorId}
          onValueChange={v => { setValue('doctor_id', v); setFieldErrors(p => ({...p, doctor: undefined})); }}
          placeholder="Select a doctor..."
          error={fieldErrors.doctor}
        />

        {/* ── Date (all modes except emergency) ── */}
        {mode !== 'emergency' && (
          <DatePicker
            label="Date"
            required={mode === 'booked'}
            min={today}
            value={apptDate}
            onChange={v => setValue('appointment_date', v)}
          />
        )}

        {/* ── Time slots (walk-in + booked, not emergency) ── */}
        {showSlots && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-sm font-medium text-[var(--color-text)]">
                  Time Slot
                  {mode === 'booked'
                    ? <span className="text-[var(--color-danger)] ml-0.5">*</span>
                    : <span className="ml-2 text-xs font-normal text-[var(--color-text-secondary)]">(optional for walk-in)</span>
                  }
                </label>
              </div>
              {!loadingSlots && doctorId && apptDate && (
                <button type="button" onClick={loadSlots}
                  className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              )}
            </div>

            {loadingSlots && (
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <Spinner size="sm" /> Loading slots...
              </div>
            )}
            {isHoliday && (
              <p className="text-sm text-[var(--color-danger)]">This date is a clinic holiday.</p>
            )}
            {noSchedule && !isHoliday && (
              <p className="text-sm text-[var(--color-warning)]">No schedule set for this doctor on this day.</p>
            )}

            {!loadingSlots && !isHoliday && !noSchedule && slots.length > 0 && (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {slots.map(s => (
                    <button key={s.time} type="button"
                      disabled={!s.available}
                      title={!s.available ? 'Already booked' : s.time}
                      onClick={() => {
                        setSelectedSlot(prev => prev === s.time ? '' : s.time);
                        setFieldErrors(p => ({...p, slot: undefined}));
                      }}
                      className={`py-2 rounded-[var(--radius-sm)] text-xs font-medium border transition-colors ${
                        !s.available
                          ? 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border-[var(--color-border)] cursor-not-allowed line-through opacity-40'
                          : selectedSlot === s.time
                            ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm'
                            : 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]'
                      }`}>
                      {s.time}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <span className="w-3 h-3 rounded-sm bg-[var(--color-primary)] inline-block" /> Selected
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                    <span className="w-3 h-3 rounded-sm border border-[var(--color-border)] bg-[var(--color-bg)] inline-block opacity-40 line-through" /> Booked
                  </span>
                  {selectedSlot && (
                    <button type="button" onClick={() => setSelectedSlot('')}
                      className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-danger)] ml-auto">
                      Clear selection
                    </button>
                  )}
                </div>

                {slots.some(s => !s.available) && (
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                    Crossed-out slots include online portal bookings.
                  </p>
                )}
              </>
            )}

            {!loadingSlots && !isHoliday && !noSchedule && slots.length === 0 && doctorId && apptDate && (
              <p className="text-xs text-[var(--color-text-secondary)]">No slots available for this date.</p>
            )}

            {fieldErrors.slot && (
              <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.slot}</p>
            )}
          </div>
        )}

        {/* ── Reason ── */}
        {mode !== 'emergency' && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text)]">Reason for Visit</label>
            <textarea rows={2} placeholder="Chief complaint or reason..."
              className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--color-border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)]"
              {...register('reason')}
            />
          </div>
        )}

        {/* ── Emergency notice ── */}
        {mode === 'emergency' && (
          <div className="p-3 rounded-[var(--radius)] bg-[var(--color-danger-light)] border border-[var(--color-danger)] text-sm text-[var(--color-danger)] flex items-center gap-2">
            <Zap className="w-4 h-4 shrink-0" />
            Emergency patients are placed at the top of the queue immediately.
          </div>
        )}

      </form>
      </>}
    </Drawer>
  );
}
