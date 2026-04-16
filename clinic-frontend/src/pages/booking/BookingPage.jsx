/**
 * BookingPage.jsx — Phase 5.4 Patient Portal / Online Booking
 *
 * Public page (no login required). Multi-step flow:
 *   Step 1 → Select Doctor
 *   Step 2 → Pick Date & Time Slot
 *   Step 3 → Patient Details
 *   Step 4 → Confirmation (BK-XXXXXX reference + print)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  User, Calendar, Clock, CheckCircle, ChevronLeft,
  Phone, AlertCircle, Printer, RefreshCw, Globe
} from 'lucide-react';
import { portalApi } from '../../api/portal';
import { formatPhoneInput } from '../../utils/format';

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

// ── Step indicator ────────────────────────────────────────────────────────────
function StepIndicator({ current, steps }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${done ? 'bg-emerald-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? <CheckCircle className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 mt-[-12px] ${done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Doctor card ───────────────────────────────────────────────────────────────
function DoctorCard({ doctor, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-4 flex items-center gap-4 transition-all
        ${selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
    >
      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
        <User className="w-6 h-6 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{doctor.full_name}</p>
        {doctor.specialization && (
          <p className="text-sm text-gray-500 truncate">{doctor.specialization}</p>
        )}
      </div>
      {selected && <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />}
    </button>
  );
}

// ── Slot button ───────────────────────────────────────────────────────────────
function SlotButton({ time, available, selected, onClick }) {
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all
        ${!available
          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed line-through'
          : selected
            ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
            : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'}`}
    >
      {formatTime(time)}
    </button>
  );
}

// ── Date picker strip ─────────────────────────────────────────────────────────
function DateStrip({ value, onChange }) {
  const today = todayStr();
  // Show 14 upcoming days starting from today
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i));

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-max">
        {days.map(d => {
          const date = new Date(d + 'T00:00:00');
          const isSelected = d === value;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`flex flex-col items-center rounded-xl border-2 px-3 py-2 min-w-[56px] transition-all
                ${isSelected
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'}`}
            >
              <span className="text-xs font-medium">
                {date.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="text-lg font-bold leading-tight">
                {date.getDate()}
              </span>
              <span className="text-xs">
                {date.toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Input component ───────────────────────────────────────────────────────────
function FormInput({ label, required, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}

// ── Confirmation card ─────────────────────────────────────────────────────────
function ConfirmationCard({ booking, clinicName }) {
  return (
    <div id="confirmation-card" className="bg-white rounded-2xl border-2 border-emerald-400 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">Booking Confirmed!</p>
          <p className="text-sm text-gray-500">{clinicName || 'Clinic'}</p>
        </div>
      </div>

      {/* Reference number */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-center">
        <p className="text-xs font-medium text-blue-600 mb-1">Your Booking Reference</p>
        <p className="text-3xl font-black text-blue-700 tracking-wider">{booking.booking_reference}</p>
        <p className="text-xs text-blue-500 mt-1">Keep this number for your records</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Patient</p>
          <p className="font-semibold text-gray-900">{booking.patient_name}</p>
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Phone className="w-3 h-3" />{booking.patient_phone}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Doctor</p>
          <p className="font-semibold text-gray-900">{booking.doctor_name}</p>
          {booking.specialization && (
            <p className="text-sm text-gray-600">{booking.specialization}</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</p>
          <p className="font-semibold text-gray-900 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-blue-500" />
            {formatDateDisplay(booking.appointment_date)}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Time</p>
          <p className="font-semibold text-gray-900 flex items-center gap-1">
            <Clock className="w-4 h-4 text-blue-500" />
            {formatTime(booking.appointment_time)}
          </p>
        </div>
        {booking.reason && (
          <div className="col-span-full flex flex-col gap-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reason for Visit</p>
            <p className="text-sm text-gray-700">{booking.reason}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mt-5 border-t pt-4">
        Please arrive 10 minutes before your appointment time. Bring this reference number.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [portalEnabled, setPortalEnabled] = useState(null); // null = loading

  // Step 1: doctor
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Step 2: date + slot
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Step 3: patient details
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 4: confirmation
  const [booking, setBooking] = useState(null);

  // Load clinic info on mount
  useEffect(() => {
    portalApi.getInfo()
      .then(r => {
        setClinicInfo(r.data.data || {});
        setPortalEnabled(r.data.data?.patient_portal_enabled !== false);
      })
      .catch(() => setPortalEnabled(false));
  }, []);

  // Load doctors when entering step 1
  useEffect(() => {
    if (step === 1 && portalEnabled) {
      setLoadingDoctors(true);
      portalApi.getDoctors()
        .then(r => setDoctors(r.data.data || []))
        .catch(() => setDoctors([]))
        .finally(() => setLoadingDoctors(false));
    }
  }, [step, portalEnabled]);

  // Load slots when doctor or date changes (in step 2)
  const loadSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    setSlotsMsg('');
    setSelectedSlot('');
    try {
      const r = await portalApi.getSlots(selectedDoctor.id, selectedDate);
      if (r.data.holiday) {
        setSlotsMsg('This date is a clinic holiday. Please choose another date.');
        setSlots([]);
      } else if (r.data.noSchedule) {
        setSlotsMsg('The doctor is not available on this day. Please choose another date.');
        setSlots([]);
      } else {
        setSlots(r.data.data || []);
        if (!r.data.data?.length) {
          setSlotsMsg('No slots configured for this date.');
        }
      }
    } catch {
      setSlotsMsg('Could not load available slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDoctor, selectedDate]);

  useEffect(() => {
    if (step === 2) loadSlots();
  }, [step, loadSlots]);

  async function handleSubmit() {
    if (!patientName.trim()) { setSubmitError('Please enter your full name.'); return; }
    if (!patientPhone.trim()) { setSubmitError('Please enter your phone number.'); return; }
    if (patientPhone.replace(/\D/g, '').length !== 10) { setSubmitError('Phone number must be 10 digits.'); return; }

    setSubmitError('');
    setSubmitting(true);
    try {
      const r = await portalApi.book({
        doctor_id: selectedDoctor.id,
        appointment_date: selectedDate,
        appointment_time: selectedSlot,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        patient_dob: patientDob || undefined,
        reason: reason.trim() || undefined,
      });
      setBooking(r.data.data);
      setStep(4);
    } catch (err) {
      const msg = err.response?.data?.message || 'Booking failed. Please try again.';
      setSubmitError(msg);
      // If slot conflict, go back to step 2
      if (err.response?.status === 409) {
        setTimeout(() => { setStep(2); setSubmitError(''); }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // ── Portal disabled ────────────────────────────────────────────────────────
  if (portalEnabled === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (portalEnabled === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Online Booking Unavailable</h2>
          <p className="text-gray-500 text-sm">
            This clinic has not enabled online booking. Please call the clinic to schedule an appointment.
          </p>
          {clinicInfo?.clinic_phone && (
            <a
              href={`tel:${clinicInfo.clinic_phone}`}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              {clinicInfo.clinic_phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#booking-print-root) { display: none !important; }
          #booking-print-root * { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b shadow-sm no-print">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">{clinicInfo?.clinic_name || 'Clinic'}</p>
            <p className="text-xs text-gray-500">Online Appointment Booking</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step indicator */}
        {step < 4 && (
          <StepIndicator
            current={step}
            steps={['Doctor', 'Date & Time', 'Your Details', 'Confirmed']}
          />
        )}

        {/* ── Step 1: Select Doctor ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Choose a Doctor</h2>
            <p className="text-sm text-gray-500 mb-6">Select the doctor you'd like to see</p>

            {loadingDoctors ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : doctors.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No doctors available at this time.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {doctors.map(doc => (
                  <DoctorCard
                    key={doc.id}
                    doctor={doc}
                    selected={selectedDoctor?.id === doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                  />
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!selectedDoctor}
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Next — Select Date & Time →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Date & Time ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 -ml-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Pick a Date & Time</h2>
            <p className="text-sm text-gray-500 mb-1">
              With {selectedDoctor?.full_name}
              {selectedDoctor?.specialization && ` · ${selectedDoctor.specialization}`}
            </p>

            <div className="mt-5">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-blue-500" /> Select Date
              </p>
              <DateStrip value={selectedDate} onChange={d => { setSelectedDate(d); setSelectedSlot(''); }} />
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-500" /> Available Times
                </p>
                {!loadingSlots && (
                  <button type="button" onClick={loadSlots} className="text-xs text-blue-500 hover:text-blue-700">
                    Refresh
                  </button>
                )}
              </div>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : slotsMsg ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {slotsMsg}
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {slots.map(s => (
                    <SlotButton
                      key={s.time}
                      time={s.time}
                      available={s.available}
                      selected={selectedSlot === s.time}
                      onClick={() => setSelectedSlot(s.time)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
              >
                Next — Your Details →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Patient Details ───────────────────────────────────── */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4 -ml-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-1">Your Details</h2>
            <p className="text-sm text-gray-500 mb-6">
              {selectedDoctor?.full_name} · {formatDateDisplay(selectedDate)} · {formatTime(selectedSlot)}
            </p>

            <div className="flex flex-col gap-4">
              <FormInput
                label="Full Name" required
                value={patientName}
                onChange={setPatientName}
                placeholder="e.g. Maria Perera"
              />
              <FormInput
                label="Phone Number" required type="tel"
                value={patientPhone}
                onChange={v => setPatientPhone(formatPhoneInput(v))}
                placeholder="077 123 4567"
              />
              <FormInput
                label="Date of Birth (optional)" type="date"
                value={patientDob}
                onChange={setPatientDob}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Reason for Visit (optional)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Brief description of your concern..."
                  rows={3}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>

            {submitError && (
              <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-60 hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                {submitting ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Confirming...</>
                ) : (
                  <>Confirm Booking <CheckCircle className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ──────────────────────────────────────── */}
        {step === 4 && booking && (
          <div id="booking-print-root">
            <ConfirmationCard booking={booking} clinicName={clinicInfo?.clinic_name} />

            <div className="mt-4 flex gap-3 justify-center no-print">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedDoctor(null);
                  setSelectedDate(todayStr());
                  setSelectedSlot('');
                  setPatientName('');
                  setPatientPhone('');
                  setPatientDob('');
                  setReason('');
                  setBooking(null);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {step < 4 && (
        <div className="max-w-2xl mx-auto px-4 py-6 text-center no-print">
          <p className="text-xs text-gray-400">
            Powered by Doctor POS — Secure Online Booking
          </p>
        </div>
      )}
    </div>
  );
}
