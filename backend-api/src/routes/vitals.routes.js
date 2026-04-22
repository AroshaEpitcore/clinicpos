const express = require('express');
const { queryTenant }                 = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware);

// ── POST /api/v1/vitals ───────────────────────────────────────────────────────
// Record or update vitals for an appointment (nurse / doctor / admin)
router.post('/', requireRole('nurse', 'doctor', 'admin'), async (req, res) => {
  const {
    appointment_id, patient_id,
    bp_systolic, bp_diastolic,
    temperature, weight, height, spo2, pulse,
    notes,
  } = req.body;

  if (!patient_id) {
    return res.status(400).json({ status: 'error', message: 'patient_id is required' });
  }

  try {
    // Upsert: if vitals already exist for this appointment, update them
    if (appointment_id) {
      const existing = await queryTenant(
        req.tenantSchema,
        `SELECT id FROM patient_vitals WHERE appointment_id = $1`,
        [appointment_id]
      );
      if (existing.rows.length > 0) {
        await queryTenant(
          req.tenantSchema,
          `UPDATE patient_vitals SET
             bp_systolic=$1, bp_diastolic=$2, temperature=$3,
             weight=$4, height=$5, spo2=$6, pulse=$7,
             notes=$8, recorded_by=$9, recorded_at=NOW()
           WHERE appointment_id=$10`,
          [
            bp_systolic  || null, bp_diastolic || null,
            temperature  || null, weight       || null,
            height       || null, spo2         || null,
            pulse        || null, notes        || null,
            req.user.id, appointment_id,
          ]
        );
        return res.json({ status: 'success', message: 'Vitals updated successfully' });
      }
    }

    await queryTenant(
      req.tenantSchema,
      `INSERT INTO patient_vitals
         (appointment_id, patient_id, recorded_by,
          bp_systolic, bp_diastolic, temperature, weight, height, spo2, pulse, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        appointment_id || null, patient_id, req.user.id,
        bp_systolic  || null, bp_diastolic || null,
        temperature  || null, weight       || null,
        height       || null, spo2         || null,
        pulse        || null, notes        || null,
      ]
    );

    res.status(201).json({ status: 'success', message: 'Vitals recorded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/vitals/appointment/:id ───────────────────────────────────────
// Fetch the most recent vitals for an appointment
router.get('/appointment/:id', async (req, res) => {
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT v.*, s.full_name AS recorded_by_name
       FROM patient_vitals v
       LEFT JOIN staff s ON s.id = v.recorded_by
       WHERE v.appointment_id = $1
       ORDER BY v.recorded_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    res.json({ status: 'success', data: r.rows[0] || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
