const express = require('express');
const { queryTenant }                  = require('../config/db');
const { authMiddleware, requireRole }  = require('../middleware/auth');
const { tenantMiddleware }             = require('../middleware/tenant');
const { nextBookingReference }         = require('../utils/bookingReference');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware);

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

// ── GET /api/v1/appointments ──────────────────────────────────────────────────
// Query params: date (required), doctor_id (optional), status (optional)
router.get('/', async (req, res) => {
  const { date, doctor_id, status } = req.query;
  if (!date) return res.status(400).json({ status: 'error', message: 'date is required' });
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(date)) return res.status(400).json({ status: 'error', message: 'date must be in YYYY-MM-DD format' });

  // Doctors can only see their own appointments — ignore any doctor_id param they send
  const effectiveDoctorId = req.user.role === 'doctor' ? req.user.id : (doctor_id || null);

  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         a.id, a.token_number, a.appointment_date, a.appointment_time,
         a.type, a.status, a.reason, a.notes, a.booked_online,
         a.booking_reference, a.booking_source,
         p.id           AS patient_id,
         p.patient_code,
         p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
         p.phone        AS patient_phone,
         p.allergies    AS patient_allergies,
         s.id           AS doctor_id,
         s.full_name    AS doctor_name,
         s.specialization,
         c.id           AS consultation_id,
         pr.id          AS prescription_id,
         (SELECT chief_complaint FROM consultations
          WHERE patient_id = p.id ORDER BY visit_date DESC LIMIT 1) AS last_complaint
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       JOIN staff    s ON s.id = a.doctor_id
       LEFT JOIN consultations c ON c.appointment_id = a.id
       LEFT JOIN prescriptions pr ON pr.consultation_id = c.id
       WHERE a.appointment_date = $1
         AND ($2::uuid IS NULL OR a.doctor_id = $2)
         AND ($3 = ''    OR a.status = $3)
         AND a.status != 'cancelled'
       ORDER BY
         CASE WHEN a.type = 'emergency' THEN 0 ELSE 1 END,
         a.token_number  ASC NULLS LAST,
         a.appointment_time ASC NULLS LAST`,
      [date, effectiveDoctorId, status || '']
    );

    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/v1/appointments ─────────────────────────────────────────────────
router.post('/', requireRole('receptionist', 'admin'), async (req, res) => {
  const { patient_id, doctor_id, appointment_date, appointment_time, type = 'walkin', reason, notes } = req.body;

  if (!patient_id || !doctor_id || !appointment_date) {
    return res.status(400).json({ status: 'error', message: 'Please fill in all required fields' });
  }

  try {
    // Block walk-ins if the setting is disabled
    if (type === 'walkin') {
      const cfg = await queryTenant(req.tenantSchema, `SELECT allow_walk_ins FROM clinic_settings LIMIT 1`);
      if (cfg.rows.length && cfg.rows[0].allow_walk_ins === false) {
        return res.status(403).json({ status: 'error', message: 'Walk-in appointments are not allowed at this clinic. Please book a time slot.' });
      }
    }

    // Block any appointment type from taking an already-occupied time slot
    if (appointment_time) {
      const conflict = await queryTenant(
        req.tenantSchema,
        `SELECT id FROM appointments
         WHERE doctor_id = $1
           AND appointment_date = $2
           AND appointment_time = $3
           AND status NOT IN ('cancelled')`,
        [doctor_id, appointment_date, appointment_time]
      );
      if (conflict.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'This time slot is already taken. Please select a different time.',
        });
      }
    }

    // Block booking on holidays
    const holiday = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM clinic_holidays WHERE holiday_date = $1`,
      [appointment_date]
    );
    if (holiday.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'This date is a clinic holiday. Booking not allowed.' });
    }

    // Assign token for all appointment types
    const token = await nextToken(req.tenantSchema, doctor_id, appointment_date);

    // Generate booking reference for booked appointments (staff or online)
    let bookingRef = null;
    if (type === 'booked') {
      bookingRef = await nextBookingReference(req.tenantSchema);
    }

    // Emergency status is immediately 'arrived'
    const initialStatus = type === 'emergency' ? 'arrived' : 'pending';

    const result = await queryTenant(
      req.tenantSchema,
      `INSERT INTO appointments
         (patient_id, doctor_id, appointment_date, appointment_time,
          token_number, type, status, reason, notes, booked_by,
          booking_reference, booking_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [patient_id, doctor_id, appointment_date, appointment_time || null,
       token, type, initialStatus, reason || null, notes || null, req.user.id,
       bookingRef, bookingRef ? 'staff' : 'admin']
    );

    res.status(201).json({
      status: 'success',
      message: type === 'emergency' ? 'Emergency patient added to queue' : 'Appointment created successfully',
      data: { id: result.rows[0].id, token_number: token, booking_reference: bookingRef },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── PUT /api/v1/appointments/:id ──────────────────────────────────────────────
// Update status: arrived | completed | cancelled
router.put('/:id', requireRole('receptionist', 'admin', 'doctor', 'nurse'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ status: 'error', message: 'Invalid status value' });
  }

  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE appointments SET status=$1, updated_at=NOW()
       WHERE id=$2 RETURNING id`,
      [status, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    res.json({ status: 'success', message: 'Changes saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── PUT /api/v1/appointments/:id/emergency ────────────────────────────────────
// Mark existing appointment as emergency — moves to top of queue
router.put('/:id/emergency', requireRole('receptionist', 'admin'), async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE appointments
       SET type='emergency', status='arrived', token_number=0, updated_at=NOW()
       WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    res.json({ status: 'success', message: 'Marked as emergency — moved to top of queue' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── DELETE /api/v1/appointments/:id ──────────────────────────────────────────
router.delete('/:id', requireRole('receptionist', 'admin'), async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE appointments SET status='cancelled', updated_at=NOW()
       WHERE id=$1 AND status != 'cancelled' RETURNING id`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Appointment not found' });
    }
    res.json({ status: 'success', message: 'Appointment cancelled' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/appointments/my-day ──────────────────────────────────────────
// Doctor's personal daily summary: appointments + pending labs + today's Rx
router.get('/my-day', requireRole('doctor'), async (req, res) => {
  const schema   = req.tenantSchema;
  const doctorId = req.user.id;
  const today    = new Date().toISOString().slice(0, 10);

  const safeQuery = (sql, params) =>
    queryTenant(schema, sql, params).catch(() => ({ rows: [] }));

  try {
    const [apptResult, labResult, rxResult] = await Promise.all([
      // Today's appointments for this doctor
      queryTenant(schema, `
        SELECT
          a.id, a.token_number, a.appointment_time, a.type, a.status,
          a.reason, a.notes, a.booked_online, a.booking_source,
          p.id           AS patient_id,
          p.patient_code,
          p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
          p.phone        AS patient_phone,
          p.allergies    AS patient_allergies,
          c.id           AS consultation_id,
          pr.id          AS prescription_id
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        LEFT JOIN consultations c  ON c.appointment_id = a.id
        LEFT JOIN prescriptions pr ON pr.consultation_id = c.id
        WHERE a.doctor_id = $1
          AND a.appointment_date = $2
          AND a.status != 'cancelled'
        ORDER BY
          CASE WHEN a.type = 'emergency' THEN 0 ELSE 1 END,
          a.token_number ASC NULLS LAST,
          a.appointment_time ASC NULLS LAST
      `, [doctorId, today]),

      // Pending lab requests ordered by this doctor (not yet resulted)
      safeQuery(`
        SELECT
          lr.id, lr.status, lr.created_at,
          p.id AS patient_id, p.patient_code,
          p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
          t.name AS test_name, t.code AS test_code, t.category
        FROM lab_requests lr
        JOIN patients  p ON p.id = lr.patient_id
        JOIN lab_tests t ON t.id = lr.test_id
        WHERE lr.requested_by = $1
          AND lr.status IN ('pending', 'collected')
        ORDER BY lr.created_at ASC
        LIMIT 30
      `, [doctorId]),

      // Prescriptions written today by this doctor
      safeQuery(`
        SELECT
          pr.id, pr.rx_number, pr.created_at, pr.notes,
          p.id AS patient_id, p.patient_code,
          p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
          COUNT(pi.id)::int AS item_count
        FROM prescriptions pr
        JOIN patients p ON p.id = pr.patient_id
        LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
        WHERE pr.doctor_id = $1
          AND DATE(pr.created_at) = $2
        GROUP BY pr.id, p.id, p.patient_code, p.first_name, p.last_name
        ORDER BY pr.created_at ASC
      `, [doctorId, today]),
    ]);

    res.json({
      status: 'success',
      data: {
        appointments: apptResult.rows,
        lab_pending:  labResult.rows,
        rx_today:     rxResult.rows,
      }
    });
  } catch (err) {
    console.error('GET /appointments/my-day', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

module.exports = router;
