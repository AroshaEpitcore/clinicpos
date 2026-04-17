/**
 * portal.routes.js — Phase 5.4 Patient Portal / Online Booking
 *
 * All routes are PUBLIC (no JWT required).
 * Tenant is identified via X-Tenant-Subdomain header (same as all routes).
 * The patient_portal_enabled flag in clinic_settings gates all booking endpoints.
 */

const express = require('express');
const { queryTenant } = require('../config/db');
const { tenantMiddleware } = require('../middleware/tenant');
const { nextPatientCode }     = require('../utils/patientCode');
const { nextBookingReference } = require('../utils/bookingReference');

const router = express.Router();
router.use(tenantMiddleware);

// ── Helper: next token number for a doctor on a date ─────────────────────────
async function nextToken(schema, doctorId, date) {
  const r = await queryTenant(
    schema,
    `SELECT COALESCE(MAX(token_number), 0) + 1 AS next
     FROM appointments
     WHERE doctor_id = $1 AND appointment_date = $2`,
    [doctorId, date]
  );
  return r.rows[0].next;
}

// ── Helper: generate slot times ───────────────────────────────────────────────
function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end = eh * 60 + em;
  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += durationMinutes;
  }
  return slots;
}

// ── Helper: check portal is enabled ──────────────────────────────────────────
async function checkPortalEnabled(schema, res) {
  const cfg = await queryTenant(
    schema,
    `SELECT patient_portal_enabled FROM clinic_settings LIMIT 1`
  );
  if (!cfg.rows.length || cfg.rows[0].patient_portal_enabled === false) {
    res.status(403).json({
      status: 'error',
      message: 'Online booking is not available for this clinic',
    });
    return false;
  }
  return true;
}

// ── GET /api/v1/portal/info ───────────────────────────────────────────────────
// Public: clinic name, phone, address — no portal_enabled check needed
router.get('/info', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT clinic_name, clinic_address, clinic_phone, clinic_email,
              clinic_logo_url AS logo_url, allow_walk_ins, patient_portal_enabled
       FROM clinic_settings LIMIT 1`
    );
    if (!result.rows.length) {
      return res.json({ status: 'success', data: {} });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/portal/doctors ────────────────────────────────────────────────
// Public: list active doctors
router.get('/doctors', async (req, res) => {
  try {
    if (!(await checkPortalEnabled(req.tenantSchema, res))) return;

    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, full_name, specialization, avatar_url
       FROM staff
       WHERE role = 'doctor' AND is_active = TRUE
       ORDER BY full_name ASC`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/portal/doctors/:id/slots?date= ────────────────────────────────
// Public: available time slots for a doctor on a specific date
router.get('/doctors/:id/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ status: 'error', message: 'date is required' });

  try {
    if (!(await checkPortalEnabled(req.tenantSchema, res))) return;

    // Holiday check
    const holiday = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM clinic_holidays WHERE holiday_date = $1`,
      [date]
    );
    if (holiday.rows.length > 0) {
      return res.json({ status: 'success', data: [], holiday: true });
    }

    // Doctor's schedule for that day of week
    const dayOfWeek = new Date(date).getDay();
    const schedule = await queryTenant(
      req.tenantSchema,
      `SELECT start_time, end_time, slot_duration_minutes
       FROM doctor_schedules
       WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = TRUE
       LIMIT 1`,
      [req.params.id, dayOfWeek]
    );

    if (!schedule.rows.length) {
      return res.json({ status: 'success', data: [], noSchedule: true });
    }

    const { start_time, end_time, slot_duration_minutes } = schedule.rows[0];
    const allSlots = generateSlots(
      start_time.slice(0, 5),
      end_time.slice(0, 5),
      slot_duration_minutes
    );

    // All taken time slots for this doctor on this date (any type — walk-in, booked, online)
    const booked = await queryTenant(
      req.tenantSchema,
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND status NOT IN ('cancelled')
         AND appointment_time IS NOT NULL`,
      [req.params.id, date]
    );
    const bookedTimes = new Set(booked.rows.map(r => r.appointment_time?.slice(0, 5)));

    const slots = allSlots.map(time => ({
      time,
      available: !bookedTimes.has(time),
    }));

    res.json({ status: 'success', data: slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/v1/portal/book ─────────────────────────────────────────────────
// Public: book an appointment online
// Body: { doctor_id, appointment_date, appointment_time,
//         patient_name, patient_phone, patient_dob (optional), reason (optional) }
router.post('/book', async (req, res) => {
  const {
    doctor_id,
    appointment_date,
    appointment_time,
    patient_name,
    patient_phone,
    patient_dob,
    reason,
  } = req.body;

  if (!doctor_id || !appointment_date || !appointment_time || !patient_name || !patient_phone) {
    return res.status(400).json({
      status: 'error',
      message: 'Please fill in all required fields',
    });
  }

  try {
    if (!(await checkPortalEnabled(req.tenantSchema, res))) return;

    // Holiday check
    const holiday = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM clinic_holidays WHERE holiday_date = $1`,
      [appointment_date]
    );
    if (holiday.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'This date is a clinic holiday. Booking not allowed.',
      });
    }

    // Slot conflict check — prevent double booking (any appointment type at this time)
    const conflict = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND appointment_time = $3
         AND status NOT IN ('cancelled')
         AND appointment_time IS NOT NULL`,
      [doctor_id, appointment_date, appointment_time]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'This time slot has just been taken. Please select another slot.',
      });
    }

    // Find or create patient by phone number (normalize digits to match stored format)
    const phoneDigits = patient_phone.replace(/\D/g, '');
    const existing = await queryTenant(
      req.tenantSchema,
      `SELECT id, first_name, last_name FROM patients WHERE phone = $1 LIMIT 1`,
      [phoneDigits]
    );

    let patientId;
    let resolvedPatientName;
    if (existing.rows.length > 0) {
      // Use existing patient — return their actual name, not what was typed
      const p = existing.rows[0];
      patientId = p.id;
      resolvedPatientName = p.first_name + (p.last_name ? ' ' + p.last_name : '');
    } else {
      // Create minimal patient record — only first_name and phone are required
      const nameParts = patient_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || null;
      const code = await nextPatientCode(req.tenantSchema);

      const newPatient = await queryTenant(
        req.tenantSchema,
        `INSERT INTO patients
           (patient_code, first_name, last_name, phone, date_of_birth)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [code, firstName, lastName, patient_phone.replace(/\D/g, ''), patient_dob || null]
      );
      patientId = newPatient.rows[0].id;
      resolvedPatientName = patient_name.trim();
    }

    // Generate booking reference and assign token number
    const bookingRef  = await nextBookingReference(req.tenantSchema);
    const tokenNumber = await nextToken(req.tenantSchema, doctor_id, appointment_date);

    // Create appointment
    await queryTenant(
      req.tenantSchema,
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_time,
          token_number, type, status, reason, booked_online, booking_reference, booking_source)
       VALUES ($1,$2,$3,$4,$5,'booked','pending',$6,TRUE,$7,'online')`,
      [
        patientId,
        doctor_id,
        appointment_date,
        appointment_time,
        tokenNumber,
        reason || null,
        bookingRef,
      ]
    );

    // Fetch doctor name for response
    const docResult = await queryTenant(
      req.tenantSchema,
      `SELECT full_name, specialization FROM staff WHERE id = $1`,
      [doctor_id]
    );
    const doctor = docResult.rows[0] || {};

    res.status(201).json({
      status: 'success',
      message: 'Appointment booked successfully',
      data: {
        booking_reference: bookingRef,
        token_number: tokenNumber,
        doctor_name: doctor.full_name,
        specialization: doctor.specialization,
        appointment_date,
        appointment_time,
        patient_name: resolvedPatientName,
        patient_phone,
        reason: reason || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/portal/booking/:reference ────────────────────────────────────
// Public: look up a booking by reference number
router.get('/booking/:reference', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         a.id, a.booking_reference, a.appointment_date, a.appointment_time,
         a.status, a.reason, a.type,
         p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
         p.phone AS patient_phone,
         s.full_name AS doctor_name,
         s.specialization
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN staff    s ON s.id = a.doctor_id
       WHERE a.booking_reference = $1`,
      [req.params.reference.toUpperCase()]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking reference not found',
      });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
