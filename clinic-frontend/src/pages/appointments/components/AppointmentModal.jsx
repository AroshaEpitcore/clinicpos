import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Phone, Zap, Search, RefreshCw, Printer } from 'lucide-react';
import { DatePicker } from '../../../components/ui/DatePicker';
import { Drawer }  from '../../../components/ui/Drawer';
import { Button }  from '../../../components/ui/Button';
import { Select }  from '../../../components/ui/Select';
import { Spinner } from '../../../components/ui/Spinner';
import { appointmentsApi, doctorsApi } from '../../../api/appointments';
import { patientsApi } from '../../../api/patients';
import { useAuth }    from '../../../store/AuthContext';
import { printTokenSlip } from '../../../utils/printTokenSlip';
import { formatPhoneInput } from '../../../utils/format';
import { mediaUrl } from '../../../utils/mediaUrl';

const MODES = [
  { value: 'walkin',    label: 'Walk-in' },
  { value: 'booked',    label: 'Book Appointment' },
  { value: 'emergency', label: '⚡ Emergency' },
];

export function AppointmentModal({ open, onClose, onSuccess, defaultDate, allowWalkIns = true }) {
  const today = defaultDate || new Date().toISOString().split('T')[0];
  const availableModes = MODES.filter(m => m.value !== 'walkin' || allowWalkIns);
  const { clinic, tenantFlags } = useAuth();
  const dualQueueOn = !!tenantFlags?.dual_queue;

  const [bookedSlip, setBookedSlip] = useState(null); // shown after successful booking

  const [mode,         setMode]         = useState('walkin');
  const [doctors,      setDoctors]      = useState([]);
  const [slots,        setSlots]        = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSchedule,   setNoSchedule]   = useState(false);
  const [isHoliday,    setIsHoliday]    = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');

  // Patient
  const [phoneInput,    setPhoneInput]    = useState('');
  const [searching,     setSearching]     = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched,   setHasSearched]   = useState(false);
  const [patient,       setPatient]       = useState(null);

  // Auto-register inline (shown only when phone search returns no results)
  const [newFirst, setNewFirst] = useState('');
  const [newLast,  setNewLast]  = useState('');

  // Dual-queue patient type: 'new' | 'returning' | null (not yet decided)
  // Auto-populated from the API when a patient is selected/registered.
  const [visitType,         setVisitType]         = useState(null);
  const [detectedVisitType, setDetectedVisitType] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { appointment_date: today, doctor_id: '', reason: '' },
  });

  const doctorId = watch('doctor_id');
  const apptDate = watch('appointment_date');

  // Auto-suggest: search as user types once ≥5 digits are entered
  const searchTimerRef = useRef(null);
  useEffect(() => {
    if (patient) return;
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 5) {
      setSearchResults([]);
      setHasSearched(false);
      setNewFirst('');
      setNewLast('');
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      setHasSearched(false);
      try {
        const res = await patientsApi.searchReturning(digits);
        setSearchResults(res.data.data);
        setHasSearched(true);
      } catch {
        setHasSearched(true);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimerRef.current);
  }, [phoneInput, patient]);

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

  // Detect visit type when a patient is selected (dual-queue feature)
  useEffect(() => {
    if (!dualQueueOn) return;
    if (!patient?.id) {
      setVisitType(null);
      setDetectedVisitType(null);
      return;
    }
    appointmentsApi.detectVisitType(patient.id)
      .then(res => {
        const t = res.data?.data?.patient_visit_type || 'returning';
        setDetectedVisitType(t);
        setVisitType(t);
      })
      .catch(() => {
        setDetectedVisitType('returning');
        setVisitType('returning');
      });
  }, [patient?.id, dualQueueOn]);

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

  async function searchPatient() {
    const digits = phoneInput.replace(/\D/g, '');
    if (!digits) return;
    clearTimeout(searchTimerRef.current);
    setSearching(true);
    setSearchResults([]);
    setHasSearched(false);
    try {
      const res = await patientsApi.searchReturning(digits);
      setSearchResults(res.data.data);
      setHasSearched(true);
    } catch {
      setHasSearched(true);
    } finally {
      setSearching(false);
    }
  }

  function handleClose() {
    clearTimeout(searchTimerRef.current);
    reset({ appointment_date: today, doctor_id: '', reason: '' });
    setPatient(null);
    setPhoneInput('');
    setSearchResults([]);
    setHasSearched(false);
    setSlots([]);
    setSelectedSlot('');
    setMode(allowWalkIns ? 'walkin' : 'booked');
    setNewFirst('');
    setNewLast('');
    setVisitType(null);
    setDetectedVisitType(null);
    setFieldErrors({});
    setBookedSlip(null);
    onClose();
  }

  async function onSubmit(data) {
    const errs = {};
    let resolvedPatient = patient;

    if (!resolvedPatient) {
      const digits = phoneInput.replace(/\D/g, '');
      if (!digits) {
        errs.phone = 'Phone number is required';
      } else if (digits.length !== 10) {
        errs.phone = 'Must be exactly 10 digits';
      } else if (searchResults.length > 0) {
        errs.phone = 'Please select a patient from the list';
      } else if (!newFirst.trim()) {
        errs.newFirst = 'First name is required to register this patient';
      }
    }
    if (!data.doctor_id) errs.doctor = 'Please select a doctor';
    if (mode === 'booked' && !selectedSlot) errs.slot = 'Please select a time slot';

    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});

    // Auto-create patient if no existing patient was selected
    let wasJustRegistered = false;
    if (!resolvedPatient) {
      try {
        const res = await patientsApi.create({
          first_name: newFirst.trim(),
          last_name:  newLast.trim() || undefined,
          phone:      phoneInput.replace(/\D/g, ''),
        });
        resolvedPatient = res.data.data;
        wasJustRegistered = true;
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not register patient.');
        return;
      }
    }

    // Decide visit type to submit. When the patient was just registered we know
    // they're 'new'; otherwise honor the user's segmented-control selection
    // (which defaulted to the detected value).
    const submittedVisitType = dualQueueOn
      ? (wasJustRegistered ? 'new' : (visitType || 'returning'))
      : undefined;

    try {
      const res = await appointmentsApi.create({
        patient_id:         resolvedPatient.id,
        doctor_id:          data.doctor_id,
        appointment_date:   data.appointment_date,
        appointment_time:   selectedSlot || null,
        type:               mode,
        reason:             data.reason || null,
        patient_visit_type: submittedVisitType,
      });
      const appt = res.data?.data || {};
      const doctorOption = doctors.find(d => d.value === data.doctor_id);
      const doctorLabel  = doctorOption ? doctorOption.label.split(' — ')[0] : '—';

      // Show slip screen instead of closing
      setBookedSlip({
        apptId:      appt.id || null,
        clinicName:  clinic?.name || 'ClinicPOS',
        logoUrl:     mediaUrl(clinic?.logo_url) || null,
        patientName: `${resolvedPatient.first_name} ${resolvedPatient.last_name}`,
        patientCode: resolvedPatient.patient_code || '',
        doctorName:  doctorLabel,
        tokenNumber: appt.token_number || null,
        bookingRef:  appt.booking_reference || null,
        date:        data.appointment_date,
        time:        selectedSlot || null,
        type:        mode,
        visitType:   appt.patient_visit_type || submittedVisitType || null,
      });
      toast.success(mode === 'emergency' ? 'Emergency patient added' : 'Added to queue');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  }

  async function handlePrintAndArrive() {
    printTokenSlip(bookedSlip);
    if (bookedSlip?.apptId) {
      try {
        await appointmentsApi.updateStatus(bookedSlip.apptId, 'arrived');
        toast.success('Patient marked as arrived');
        onSuccess();
      } catch {
        // slip was printed — swallow the status update error silently
      }
    }
  }

  const showSlots = mode !== 'emergency' && doctorId && apptDate;

  return (
    <Drawer
      open={open}
      onClose={handleClose}
      title={bookedSlip ? 'Booking Confirmed' : 'Add to Queue'}
      width="50vw"
      footer={
        bookedSlip ? (
          <>
            <Button variant="secondary" onClick={handleClose}>Done</Button>
            <Button onClick={handlePrintAndArrive}>
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
          {bookedSlip.tokenNumber != null && (
            <div className="text-center">
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest mb-1">
                Token{bookedSlip.visitType === 'new' ? ' · New Patient' : bookedSlip.visitType === 'returning' ? ' · Returning' : ''}
              </p>
              <p className={`text-5xl font-black ${
                bookedSlip.visitType === 'new'
                  ? 'text-red-600'
                  : bookedSlip.visitType === 'returning'
                    ? 'text-blue-600'
                    : 'text-[var(--color-text)]'
              }`}>
                {bookedSlip.visitType === 'new' ? 'N-' : ''}{String(bookedSlip.tokenNumber).padStart(2, '0')}
              </p>
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

          <p className="text-xs text-[var(--color-text-secondary)]">Click <strong>Print Slip</strong> to print a token and mark the patient as <strong>arrived</strong>.</p>
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
              <Button variant="ghost" size="sm" onClick={() => {
                setPatient(null); setPhoneInput('');
                setSearchResults([]); setHasSearched(false);
                setNewFirst(''); setNewLast('');
              }}>Change</Button>
            </div>
          ) : (
            <>
              {/* Phone search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
                  <input type="text" inputMode="numeric" placeholder="077 123 4567"
                    value={phoneInput}
                    onChange={e => { setPhoneInput(formatPhoneInput(e.target.value)); setHasSearched(false); setNewFirst(''); setNewLast(''); }}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchPatient())}
                    className={`w-full pl-9 pr-3 py-2 rounded-[var(--radius)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] ${fieldErrors.phone ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                  />
                </div>
                <Button type="button" variant="secondary" size="md" onClick={searchPatient} loading={searching}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              {fieldErrors.phone && <p className="text-xs text-[var(--color-danger)] mt-1">{fieldErrors.phone}</p>}

              {searching && (
                <div className="flex items-center gap-2 mt-2 text-sm text-[var(--color-text-secondary)]">
                  <Spinner size="sm" /> Searching...
                </div>
              )}

              {/* Matching patients */}
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

              {/* No match → inline name fields for auto-registration */}
              {hasSearched && searchResults.length === 0 && !searching && (
                <div className="mt-2 p-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)]">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    No patient found — enter a name to register automatically.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[var(--color-text)]">
                        First Name <span className="text-[var(--color-danger)]">*</span>
                      </label>
                      <input type="text" placeholder="First name" value={newFirst}
                        onChange={e => { setNewFirst(e.target.value); setFieldErrors(p => ({...p, newFirst: undefined})); }}
                        className={`px-2.5 py-1.5 rounded-[var(--radius-sm)] border text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)] ${fieldErrors.newFirst ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'}`}
                      />
                      {fieldErrors.newFirst && <span className="text-xs text-[var(--color-danger)]">{fieldErrors.newFirst}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[var(--color-text)]">Last Name</label>
                      <input type="text" placeholder="Last name (optional)" value={newLast}
                        onChange={e => setNewLast(e.target.value)}
                        className="px-2.5 py-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-surface)]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Patient type (dual-queue feature) ── */}
        {dualQueueOn && patient && (
          <div>
            <label className="text-sm font-medium text-[var(--color-text)] block mb-2">
              Patient Type
            </label>
            <div className="flex rounded-[var(--radius)] border border-[var(--color-border)] overflow-hidden">
              <button
                type="button"
                onClick={() => setVisitType('new')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  visitType === 'new'
                    ? 'bg-red-600 text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
                }`}
              >
                New (Red token)
              </button>
              <button
                type="button"
                onClick={() => setVisitType('returning')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  visitType === 'returning'
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg)]'
                }`}
              >
                Returning (Blue token)
              </button>
            </div>
            {detectedVisitType && visitType !== detectedVisitType && (
              <p className="text-xs text-[var(--color-warning)] mt-1.5">
                Auto-detected as <strong>{detectedVisitType}</strong> from visit history. Override will be logged.
              </p>
            )}
          </div>
        )}

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
