const express = require('express');
const { queryTenant }                 = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware);

// ── POST /api/v1/consultations ────────────────────────────────────────────────
// Create a consultation record (doctor/nurse/admin)
router.post('/', requireRole('doctor', 'nurse', 'admin'), async (req, res) => {
  const {
    appointment_id, patient_id, doctor_id,
    chief_complaint, symptoms, diagnosis, icd_code, notes,
    bp_systolic, bp_diastolic, temperature, weight, pulse,
    follow_up_date,
  } = req.body;

  if (!patient_id || !doctor_id) {
    return res.status(400).json({ status: 'error', message: 'Please fill in all required fields' });
  }

  try {
    // Check for existing consultation on this appointment (prevent duplicates)
    if (appointment_id) {
      const existing = await queryTenant(
        req.tenantSchema,
        `SELECT id FROM consultations WHERE appointment_id = $1`,
        [appointment_id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'A consultation already exists for this appointment',
          data: { id: existing.rows[0].id },
        });
      }
    }

    const result = await queryTenant(
      req.tenantSchema,
      `INSERT INTO consultations
         (appointment_id, patient_id, doctor_id,
          chief_complaint, symptoms, diagnosis, icd_code, notes,
          bp_systolic, bp_diastolic, temperature, weight, pulse,
          follow_up_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        appointment_id || null,
        patient_id,
        doctor_id,
        chief_complaint || null,
        symptoms       || null,
        diagnosis      || null,
        icd_code       || null,
        notes          || null,
        bp_systolic    || null,
        bp_diastolic   || null,
        temperature    || null,
        weight         || null,
        pulse          || null,
        follow_up_date || null,
      ]
    );

    // Auto-complete the appointment when consultation is saved
    if (appointment_id) {
      await queryTenant(
        req.tenantSchema,
        `UPDATE appointments SET status='completed', updated_at=NOW() WHERE id=$1`,
        [appointment_id]
      );
    }

    res.status(201).json({
      status: 'success',
      message: 'Consultation saved successfully',
      data: { id: result.rows[0].id },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/consultations ─────────────────────────────────────────────────
// List consultations, filtered by date and/or doctor
router.get('/', async (req, res) => {
  const { date, doctor_id, limit = 50 } = req.query;
  try {
    const params = [];
    const conditions = [];

    if (date) {
      params.push(date);
      conditions.push(`c.visit_date::date = $${params.length}`);
    }
    if (doctor_id) {
      params.push(doctor_id);
      conditions.push(`c.doctor_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit));

    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         c.id, c.visit_date, c.chief_complaint, c.diagnosis, c.icd_code,
         c.follow_up_date, c.created_at,
         p.first_name || ' ' || p.last_name AS patient_name,
         p.patient_code, p.id AS patient_id, p.allergies,
         s.full_name AS doctor_name, s.id AS doctor_id
       FROM consultations c
       JOIN patients p ON p.id = c.patient_id
       JOIN staff    s ON s.id = c.doctor_id
       ${where}
       ORDER BY c.visit_date DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/consultations/patient/:patientId ──────────────────────────────
// Full visit history for a patient — must be declared before /:id
router.get('/patient/:patientId', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         c.id, c.visit_date, c.chief_complaint, c.diagnosis, c.icd_code,
         c.bp_systolic, c.bp_diastolic, c.temperature, c.weight, c.pulse,
         c.notes, c.follow_up_date,
         s.full_name AS doctor_name, s.specialization
       FROM consultations c
       JOIN staff s ON s.id = c.doctor_id
       WHERE c.patient_id = $1
       ORDER BY c.visit_date DESC`,
      [req.params.patientId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/consultations/:id ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         c.*,
         p.first_name || ' ' || p.last_name AS patient_name,
         p.patient_code, p.phone, p.date_of_birth, p.gender, p.allergies,
         p.blood_group,
         s.full_name   AS doctor_name,
         s.specialization
       FROM consultations c
       JOIN patients p ON p.id = c.patient_id
       JOIN staff    s ON s.id = c.doctor_id
       WHERE c.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Consultation not found' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── PUT /api/v1/consultations/:id ─────────────────────────────────────────────
// Update — only within 24 hours, doctor or admin only
router.put('/:id', requireRole('doctor', 'admin'), async (req, res) => {
  const {
    chief_complaint, symptoms, diagnosis, icd_code, notes,
    bp_systolic, bp_diastolic, temperature, weight, pulse,
    follow_up_date,
  } = req.body;

  try {
    // Enforce 24-hour edit window
    const check = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM consultations
       WHERE id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
      [req.params.id]
    );
    if (!check.rows.length) {
      return res.status(403).json({
        status: 'error',
        message: 'Consultation can only be edited within 24 hours of creation',
      });
    }

    await queryTenant(
      req.tenantSchema,
      `UPDATE consultations SET
         chief_complaint = $1, symptoms     = $2, diagnosis  = $3,
         icd_code        = $4, notes        = $5,
         bp_systolic     = $6, bp_diastolic = $7, temperature = $8,
         weight          = $9, pulse        = $10, follow_up_date = $11,
         updated_at      = NOW()
       WHERE id = $12`,
      [
        chief_complaint || null,
        symptoms        || null,
        diagnosis       || null,
        icd_code        || null,
        notes           || null,
        bp_systolic     || null,
        bp_diastolic    || null,
        temperature     || null,
        weight          || null,
        pulse           || null,
        follow_up_date  || null,
        req.params.id,
      ]
    );
    res.json({ status: 'success', message: 'Changes saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
