const express = require('express');
const { queryTenant }                  = require('../config/db');
const { authMiddleware, requireRole }  = require('../middleware/auth');
const { tenantMiddleware }             = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware);

// ── Helper: generate time slots ───────────────────────────────────────────────
function generateSlots(startTime, endTime, durationMinutes) {
  const slots = [];
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let current = sh * 60 + sm;
  const end    = eh * 60 + em;
  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    current += durationMinutes;
  }
  return slots;
}

// ── GET /api/v1/doctors ───────────────────────────────────────────────────────
// List all active doctors — used to populate dropdowns
router.get('/', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, full_name, specialization, avatar_url
       FROM staff
       WHERE role = 'doctor' AND is_active = TRUE
       ORDER BY full_name ASC`,
      []
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/doctors/:id/slots ─────────────────────────────────────────────
// Available time slots for a doctor on a specific date
router.get('/:id/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ status: 'error', message: 'date is required' });

  try {
    // Check if holiday
    const holiday = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM clinic_holidays WHERE holiday_date = $1`,
      [date]
    );
    if (holiday.rows.length > 0) {
      return res.json({ status: 'success', data: [], holiday: true });
    }

    // Get doctor's schedule for that day of week
    const dayOfWeek = new Date(date).getDay(); // 0=Sun, 6=Sat
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

    // Get all taken time slots for that doctor on that date (any type, any non-cancelled status)
    const booked = await queryTenant(
      req.tenantSchema,
      `SELECT appointment_time FROM appointments
       WHERE doctor_id = $1
         AND appointment_date = $2
         AND appointment_time IS NOT NULL
         AND status != 'cancelled'`,
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

// ── GET /api/v1/doctor-schedules/:doctorId ────────────────────────────────────
router.get('/schedules/:doctorId', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, is_active
       FROM doctor_schedules
       WHERE doctor_id = $1
       ORDER BY day_of_week ASC`,
      [req.params.doctorId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/v1/doctor-schedules ─────────────────────────────────────────────
// Upsert a day's schedule for a doctor
router.post('/schedules', requireRole('admin'), async (req, res) => {
  const { doctor_id, day_of_week, start_time, end_time, slot_duration_minutes = 15, is_active = true } = req.body;

  if (!doctor_id || day_of_week === undefined || !start_time || !end_time) {
    return res.status(400).json({ status: 'error', message: 'Please fill in all required fields' });
  }

  try {
    await queryTenant(
      req.tenantSchema,
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (doctor_id, day_of_week)
       DO UPDATE SET start_time=$3, end_time=$4, slot_duration_minutes=$5, is_active=$6`,
      [doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active]
    );
    res.json({ status: 'success', message: 'Changes saved successfully' });
  } catch (err) {
    // If no unique constraint exists yet, fall back to delete+insert
    if (err.code === '23505' || err.message.includes('conflict')) {
      try {
        await queryTenant(req.tenantSchema,
          `DELETE FROM doctor_schedules WHERE doctor_id=$1 AND day_of_week=$2`,
          [doctor_id, day_of_week]);
        await queryTenant(req.tenantSchema,
          `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active]);
        return res.json({ status: 'success', message: 'Changes saved successfully' });
      } catch (e) {
        console.error(e);
      }
    }
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/clinic-holidays ───────────────────────────────────────────────
router.get('/holidays', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, holiday_date, label, created_at
       FROM clinic_holidays
       ORDER BY holiday_date ASC`,
      []
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/v1/clinic-holidays ─────────────────────────────────────────────
router.post('/holidays', requireRole('admin'), async (req, res) => {
  const { holiday_date, label } = req.body;
  if (!holiday_date || !label) {
    return res.status(400).json({ status: 'error', message: 'Please fill in all required fields' });
  }
  try {
    await queryTenant(
      req.tenantSchema,
      `INSERT INTO clinic_holidays (holiday_date, label, created_by) VALUES ($1,$2,$3)`,
      [holiday_date, label, req.user.id]
    );
    res.status(201).json({ status: 'success', message: `${label} added as a holiday` });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ status: 'error', message: 'A holiday already exists on this date' });
    }
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── DELETE /api/v1/clinic-holidays/:id ───────────────────────────────────────
router.delete('/holidays/:id', requireRole('admin'), async (req, res) => {
  try {
    await queryTenant(
      req.tenantSchema,
      `DELETE FROM clinic_holidays WHERE id=$1`,
      [req.params.id]
    );
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
