/**
 * BookingPage.jsx — Phase 5.4 Patient Portal / Online Booking
 *
 * Public page (no login required). Multi-step flow:
 *   Step 1 → Select Doctor
 *   Step 2 → Pick Date & Time Slot
 *   Step 3 → Patient Details
 *   Step 4 → Confirmation (BK-XXXXXX reference + print)
 *
 * Design: full CSS variable theming (dark/light), same patterns as app shell.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  User, Calendar, Clock, CheckCircle, ChevronLeft,
  Phone, AlertCircle, Printer, RefreshCw, Globe,
  Moon, Sun, Stethoscope,
} from 'lucide-react';
import { portalApi } from '../../api/portal';
import { formatPhoneInput } from '../../utils/format';
import { mediaUrl } from '../../utils/mediaUrl';
import { useTheme } from '../../store/ThemeContext';

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

// ── Step Indicator ────────────────────────────────────────────────────────────
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
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  background: done
                    ? 'var(--color-success)'
                    : active
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                  color: done || active ? '#fff' : 'var(--color-text-secondary)',
                }}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : idx}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{
                  color: active
                    ? 'var(--color-primary)'
                    : done
                      ? 'var(--color-success)'
                      : 'var(--color-text-secondary)',
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="w-12 sm:w-20 h-0.5 mx-1 mt-[-12px] transition-colors"
                style={{ background: done ? 'var(--color-success)' : 'var(--color-border)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Doctor Card ───────────────────────────────────────────────────────────────
function DoctorCard({ doctor, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 flex items-center gap-4 transition-all rounded-[var(--radius-lg)] border-2"
      style={{
        borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
        background: selected ? 'var(--color-primary-light)' : 'var(--color-surface)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-primary-light)' }}
      >
        {doctor.avatar_url ? (
          <img
            src={mediaUrl(doctor.avatar_url)}
            alt={doctor.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <User className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold" style={{ color: 'var(--color-text)' }}>
          {doctor.full_name}
        </p>
        {doctor.specialization && (
          <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
            {doctor.specialization}
          </p>
        )}
      </div>
      {selected && (
        <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--color-primary)' }} />
      )}
    </button>
  );
}

// ── Slot Button ───────────────────────────────────────────────────────────────
function SlotButton({ time, available, selected, onClick }) {
  if (!available) {
    return (
      <div
        className="py-2 px-3 rounded-[var(--radius)] text-sm font-medium text-center line-through select-none"
        style={{
          background: 'var(--color-border)',
          color: 'var(--color-text-secondary)',
          opacity: 0.6,
        }}
      >
        {formatTime(time)}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="py-2 px-3 rounded-[var(--radius)] border text-sm font-medium transition-all"
      style={
        selected
          ? {
              background: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              color: '#fff',
            }
          : {
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }
      }
    >
      {formatTime(time)}
    </button>
  );
}

// ── Date Strip ────────────────────────────────────────────────────────────────
function DateStrip({ value, onChange }) {
  const today = todayStr();
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
              className="flex flex-col items-center rounded-[var(--radius-lg)] border-2 px-3 py-2 min-w-[58px] transition-all"
              style={
                isSelected
                  ? {
                      background: 'var(--color-primary)',
                      borderColor: 'var(--color-primary)',
                      color: '#fff',
                    }
                  : {
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }
              }
            >
              <span className="text-xs font-medium opacity-80">
                {date.toLocaleDateString('en-GB', { weekday: 'short' })}
              </span>
              <span className="text-lg font-bold leading-tight">{date.getDate()}</span>
              <span className="text-xs opacity-70">
                {date.toLocaleDateString('en-GB', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Form Input ────────────────────────────────────────────────────────────────
function FormInput({ label, required, type = 'text', value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-4 py-2.5 rounded-[var(--radius)] border text-sm focus:outline-none transition-colors"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
      />
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border p-6 ${className}`}
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      {children}
    </div>
  );
}

// ── Back button ───────────────────────────────────────────────────────────────
function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium mb-5 -ml-1 transition-colors"
      style={{ color: 'var(--color-primary)' }}
    >
      <ChevronLeft className="w-4 h-4" /> Back
    </button>
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
function PrimaryButton({ onClick, disabled, children, variant = 'primary', type = 'button' }) {
  const base = {
    primary: {
      background: 'var(--color-primary)',
      color: '#fff',
      border: 'none',
    },
    success: {
      background: 'var(--color-success)',
      color: '#fff',
      border: 'none',
    },
    outline: {
      background: 'var(--color-surface)',
      color: 'var(--color-text)',
      border: '1px solid var(--color-border)',
    },
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-5 py-2.5 rounded-[var(--radius)] font-semibold text-sm flex items-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      style={base}
    >
      {children}
    </button>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────
function Alert({ type = 'warning', children }) {
  const styles = {
    warning: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'var(--color-warning)' },
    error:   { bg: 'var(--color-danger-light)',  text: 'var(--color-danger)',  border: 'var(--color-danger)'  },
  }[type];

  return (
    <div
      className="flex items-start gap-2.5 text-sm rounded-[var(--radius)] px-4 py-3 border"
      style={{ background: styles.bg, color: styles.text, borderColor: `${styles.border}40` }}
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ── Confirmation Card ─────────────────────────────────────────────────────────
function ConfirmationCard({ booking, clinicName }) {
  return (
    <div
      id="confirmation-card"
      className="rounded-[var(--radius-lg)] border-2 p-6"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-success)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'var(--color-success-light)' }}
        >
          <CheckCircle className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
        </div>
        <div>
          <p className="font-bold text-lg" style={{ color: 'var(--color-text)' }}>Booking Confirmed!</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{clinicName || 'Clinic'}</p>
        </div>
      </div>

      {/* Token + Reference */}
      <div className="flex gap-3 mb-6">
        {booking.token_number != null && (
          <div
            className="flex-1 rounded-[var(--radius)] p-4 text-center text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">Your Token</p>
            <p className="text-5xl font-black leading-none">
              {String(booking.token_number).padStart(2, '0')}
            </p>
            <p className="text-xs opacity-70 mt-1">Queue number</p>
          </div>
        )}
        <div
          className={`${booking.token_number != null ? 'flex-1' : 'w-full'} rounded-[var(--radius)] p-4 text-center border`}
          style={{
            background: 'var(--color-primary-light)',
            borderColor: 'var(--color-primary)',
          }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-primary)' }}>
            Booking Reference
          </p>
          <p className="text-2xl font-black tracking-wider" style={{ color: 'var(--color-primary)' }}>
            {booking.booking_reference}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Keep for your records
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            label: 'Patient',
            content: (
              <>
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{booking.patient_name}</p>
                <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                  <Phone className="w-3 h-3" />{booking.patient_phone}
                </p>
              </>
            ),
          },
          {
            label: 'Doctor',
            content: (
              <>
                <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{booking.doctor_name}</p>
                {booking.specialization && (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{booking.specialization}</p>
                )}
              </>
            ),
          },
          {
            label: 'Date',
            content: (
              <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                {formatDateDisplay(booking.appointment_date)}
              </p>
            ),
          },
          {
            label: 'Time',
            content: (
              <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                {formatTime(booking.appointment_time)}
              </p>
            ),
          },
        ].map(({ label, content }) => (
          <div key={label} className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              {label}
            </p>
            {content}
          </div>
        ))}

        {booking.reason && (
          <div className="col-span-full flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              Reason for Visit
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{booking.reason}</p>
          </div>
        )}
      </div>

      <p
        className="text-xs text-center mt-5 border-t pt-4"
        style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
      >
        Please arrive 10 minutes before your appointment time. Bring this reference number.
      </p>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BookingPage() {
  const { theme, toggle: toggleTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [clinicInfo, setClinicInfo] = useState(null);
  const [portalEnabled, setPortalEnabled] = useState(null);

  // Step 1
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Step 2
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMsg, setSlotsMsg] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  // Step 3
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientDob, setPatientDob] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 4
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    portalApi.getInfo()
      .then(r => {
        setClinicInfo(r.data.data || {});
        setPortalEnabled(r.data.data?.patient_portal_enabled !== false);
      })
      .catch(() => setPortalEnabled(false));
  }, []);

  useEffect(() => {
    if (step === 1 && portalEnabled) {
      setLoadingDoctors(true);
      portalApi.getDoctors()
        .then(r => setDoctors(r.data.data || []))
        .catch(() => setDoctors([]))
        .finally(() => setLoadingDoctors(false));
    }
  }, [step, portalEnabled]);

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
        if (!r.data.data?.length) setSlotsMsg('No slots configured for this date.');
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
      if (err.response?.status === 409) {
        setTimeout(() => { setStep(2); setSubmitError(''); }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep(1);
    setSelectedDoctor(null);
    setSelectedDate(todayStr());
    setSelectedSlot('');
    setPatientName('');
    setPatientPhone('');
    setPatientDob('');
    setReason('');
    setBooking(null);
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (portalEnabled === null) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <RefreshCw className="w-7 h-7 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  // ── Portal Disabled ────────────────────────────────────────────────────────
  if (portalEnabled === false) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <div
          className="rounded-[var(--radius-lg)] border p-8 max-w-sm w-full text-center"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <Globe className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-secondary)' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Online Booking Unavailable
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            This clinic has not enabled online booking. Please call the clinic to schedule an appointment.
          </p>
          {clinicInfo?.clinic_phone && (
            <a
              href={`tel:${clinicInfo.clinic_phone}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius)] font-semibold text-sm text-white"
              style={{ background: 'var(--color-primary)' }}
            >
              <Phone className="w-4 h-4" />
              {clinicInfo.clinic_phone}
            </a>
          )}
        </div>
      </div>
    );
  }

  // ── Main Layout ────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#booking-print-root) { display: none !important; }
          #booking-print-root * { display: block !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="no-print sticky top-0 z-10 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Logo or icon */}
          {clinicInfo?.logo_url ? (
            <img
              src={mediaUrl(clinicInfo.logo_url)}
              alt="Clinic logo"
              className="h-9 w-9 rounded-[var(--radius)] object-contain shrink-0 border"
              style={{ borderColor: 'var(--color-border)' }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-primary)' }}
            >
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
          )}

          {/* Clinic name */}
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight truncate" style={{ color: 'var(--color-text)' }}>
              {clinicInfo?.clinic_name || 'Clinic'}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Online Appointment Booking
            </p>
          </div>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center border transition-colors"
            style={{
              background: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6">

          {/* Step indicator */}
          {step < 4 && (
            <StepIndicator
              current={step}
              steps={['Doctor', 'Date & Time', 'Your Details', 'Confirmed']}
            />
          )}

          {/* ── Step 1: Select Doctor ──────────────────────────────────── */}
          {step === 1 && (
            <Card>
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                Choose a Doctor
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
                Select the doctor you'd like to see
              </p>

              {loadingDoctors ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
                </div>
              ) : doctors.length === 0 ? (
                <p className="text-center py-12 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No doctors available at this time.
                </p>
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
                <PrimaryButton disabled={!selectedDoctor} onClick={() => setStep(2)}>
                  Next — Date &amp; Time <ChevronLeft className="w-4 h-4 rotate-180" />
                </PrimaryButton>
              </div>
            </Card>
          )}

          {/* ── Step 2: Date & Time ────────────────────────────────────── */}
          {step === 2 && (
            <Card>
              <BackButton onClick={() => setStep(1)} />

              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                Pick a Date &amp; Time
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
                With {selectedDoctor?.full_name}
                {selectedDoctor?.specialization && ` · ${selectedDoctor.specialization}`}
              </p>

              {/* Date strip */}
              <div className="mb-6">
                <p className="text-sm font-medium mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                  Select Date
                </p>
                <DateStrip
                  value={selectedDate}
                  onChange={d => { setSelectedDate(d); setSelectedSlot(''); }}
                />
              </div>

              {/* Slots */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: 'var(--color-text)' }}>
                    <Clock className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                    Available Times
                  </p>
                  {!loadingSlots && (
                    <button
                      type="button"
                      onClick={loadSlots}
                      className="text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Refresh
                    </button>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin" style={{ color: 'var(--color-primary)' }} />
                  </div>
                ) : slotsMsg ? (
                  <Alert type="warning">{slotsMsg}</Alert>
                ) : (
                  <>
                    {/* Legend */}
                    <div className="flex items-center gap-4 mb-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-sm border"
                          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
                        />
                        Available
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-3 h-3 rounded-sm line-through"
                          style={{ background: 'var(--color-border)' }}
                        />
                        Taken
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
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
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <PrimaryButton disabled={!selectedSlot} onClick={() => setStep(3)}>
                  Next — Your Details <ChevronLeft className="w-4 h-4 rotate-180" />
                </PrimaryButton>
              </div>
            </Card>
          )}

          {/* ── Step 3: Patient Details ────────────────────────────────── */}
          {step === 3 && (
            <Card>
              <BackButton onClick={() => setStep(2)} />

              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>
                Your Details
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    Reason for Visit <span style={{ color: 'var(--color-text-secondary)' }}>(optional)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Brief description of your concern..."
                    rows={3}
                    className="px-4 py-2.5 rounded-[var(--radius)] border text-sm focus:outline-none resize-none transition-colors"
                    style={{
                      background: 'var(--color-surface)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                  />
                </div>
              </div>

              {submitError && (
                <div className="mt-4">
                  <Alert type="error">{submitError}</Alert>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <PrimaryButton variant="success" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Confirming...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Confirm Booking</>
                  )}
                </PrimaryButton>
              </div>
            </Card>
          )}

          {/* ── Step 4: Confirmation ───────────────────────────────────── */}
          {step === 4 && booking && (
            <div id="booking-print-root">
              <ConfirmationCard booking={booking} clinicName={clinicInfo?.clinic_name} />

              <div className="mt-4 flex flex-wrap gap-3 justify-center no-print">
                <PrimaryButton onClick={() => window.print()}>
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </PrimaryButton>
                <PrimaryButton variant="outline" onClick={resetFlow}>
                  Book Another Appointment
                </PrimaryButton>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      {step < 4 && (
        <footer className="no-print py-6">
          <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
            Powered by Doctor POS — Secure Online Booking
          </p>
        </footer>
      )}
    </div>
  );
}
