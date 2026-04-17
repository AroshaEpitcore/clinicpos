const express = require('express');
const { queryTenant }                  = require('../config/db');
const { authMiddleware, requireRole }  = require('../middleware/auth');
const { tenantMiddleware }             = require('../middleware/tenant');
const { generatePrescriptionPDF }      = require('../utils/pdfGenerator');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware);

// ── POST /api/v1/prescriptions ────────────────────────────────────────────────
// Create prescription with items — doctor or admin
router.post('/', requireRole('doctor', 'admin'), async (req, res) => {
  const { appointment_id, patient_id, doctor_id, items = [], notes } = req.body;

  if (!patient_id || !doctor_id) {
    return res.status(400).json({ status: 'error', message: 'patient_id and doctor_id are required' });
  }

  // Doctors can only write prescriptions for their own patients
  if (req.user.role === 'doctor' && String(doctor_id) !== String(req.user.id)) {
    return res.status(403).json({ status: 'error', message: 'You can only write prescriptions for your own patients' });
  }

  if (!items.length) {
    return res.status(400).json({ status: 'error', message: 'At least one medicine is required' });
  }
  for (const item of items) {
    if (!item.medicine_id || !item.dosage?.trim() || !item.frequency?.trim() || !item.duration?.trim()) {
      return res.status(400).json({ status: 'error', message: 'Each medicine needs dosage, frequency, and duration' });
    }
  }

  try {
    // Resolve consultation_id from appointment
    let consultation_id = null;
    if (appointment_id) {
      const consult = await queryTenant(
        req.tenantSchema,
        `SELECT id FROM consultations WHERE appointment_id = $1`,
        [appointment_id]
      );
      if (consult.rows.length > 0) consultation_id = consult.rows[0].id;
    }

    // Block duplicate prescription on same consultation
    if (consultation_id) {
      const existing = await queryTenant(
        req.tenantSchema,
        `SELECT id, rx_number FROM prescriptions WHERE consultation_id = $1`,
        [consultation_id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          status: 'error',
          message: 'A prescription already exists for this consultation',
          data: { id: existing.rows[0].id, rx_number: existing.rows[0].rx_number },
        });
      }
    }

    // Auto-generate Rx number
    const countRes = await queryTenant(req.tenantSchema, `SELECT COUNT(*) FROM prescriptions`, []);
    const rxNumber = 'RX-' + String(parseInt(countRes.rows[0].count) + 1).padStart(5, '0');

    // Insert prescription header
    const prescRes = await queryTenant(
      req.tenantSchema,
      `INSERT INTO prescriptions (rx_number, consultation_id, patient_id, doctor_id, notes)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [rxNumber, consultation_id, patient_id, doctor_id, notes || null]
    );
    const prescriptionId = prescRes.rows[0].id;

    // Insert items
    for (const item of items) {
      await queryTenant(
        req.tenantSchema,
        `INSERT INTO prescription_items
           (prescription_id, medicine_id, dosage, frequency, duration, instructions, quantity_given)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          prescriptionId,
          item.medicine_id,
          item.dosage.trim(),
          item.frequency.trim(),
          item.duration.trim(),
          item.instructions?.trim() || null,
          item.quantity_given       || null,
        ]
      );
    }

    res.status(201).json({
      status: 'success',
      message: `Prescription ${rxNumber} saved`,
      data: { id: prescriptionId, rx_number: rxNumber },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/prescriptions/patient/:patientId ──────────────────────────────
// Full medicine history for a patient — declared before /:id
router.get('/patient/:patientId', async (req, res) => {
  try {
    // Prescription headers
    const prescRes = await queryTenant(
      req.tenantSchema,
      `SELECT
         pr.id, pr.rx_number, pr.created_at, pr.notes,
         s.full_name AS doctor_name,
         COUNT(pi.id) AS item_count
       FROM prescriptions pr
       JOIN staff s ON s.id = pr.doctor_id
       LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
       WHERE pr.patient_id = $1
       GROUP BY pr.id, s.full_name
       ORDER BY pr.created_at DESC`,
      [req.params.patientId]
    );

    // For each prescription, fetch items
    const result = await Promise.all(
      prescRes.rows.map(async pr => {
        const itemsRes = await queryTenant(
          req.tenantSchema,
          `SELECT
             pi.dosage, pi.frequency, pi.duration, pi.instructions,
             m.name AS medicine_name, m.generic_name, m.strength, m.unit
           FROM prescription_items pi
           JOIN medicines m ON m.id = pi.medicine_id
           WHERE pi.prescription_id = $1
           ORDER BY pi.id`,
          [pr.id]
        );
        return { ...pr, items: itemsRes.rows };
      })
    );

    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/prescriptions ─────────────────────────────────────────────────
// List by date, for PrescriptionsPage
router.get('/', async (req, res) => {
  const { date, limit = 50 } = req.query;
  try {
    const params = [];
    const conditions = [];

    if (date) {
      params.push(date);
      conditions.push(`pr.created_at::date = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(parseInt(limit));

    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         pr.id, pr.rx_number, pr.created_at,
         p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
         p.patient_code, p.id AS patient_id,
         s.full_name AS doctor_name,
         COUNT(pi.id) AS item_count
       FROM prescriptions pr
       JOIN patients p  ON p.id  = pr.patient_id
       JOIN staff    s  ON s.id  = pr.doctor_id
       LEFT JOIN prescription_items pi ON pi.prescription_id = pr.id
       ${where}
       GROUP BY pr.id, p.first_name, p.last_name, p.patient_code, p.id, s.full_name
       ORDER BY pr.created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/prescriptions/:id ─────────────────────────────────────────────
// Full prescription with all items and medicine details
router.get('/:id', async (req, res) => {
  try {
    const prescRes = await queryTenant(
      req.tenantSchema,
      `SELECT
         pr.id, pr.rx_number, pr.created_at, pr.notes,
         p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
         p.patient_code, p.date_of_birth, p.gender, p.phone, p.allergies,
         p.id AS patient_id,
         s.full_name AS doctor_name, s.specialization,
         s.registration_no, s.signature_url
       FROM prescriptions pr
       JOIN patients p ON p.id = pr.patient_id
       JOIN staff    s ON s.id = pr.doctor_id
       WHERE pr.id = $1`,
      [req.params.id]
    );
    if (!prescRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    }

    const itemsRes = await queryTenant(
      req.tenantSchema,
      `SELECT
         pi.id, pi.dosage, pi.frequency, pi.duration, pi.instructions, pi.quantity_given,
         m.id AS medicine_id, m.name AS medicine_name, m.generic_name,
         m.strength, m.unit, m.category
       FROM prescription_items pi
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = $1
       ORDER BY pi.id`,
      [req.params.id]
    );

    res.json({
      status: 'success',
      data: { ...prescRes.rows[0], items: itemsRes.rows },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/prescriptions/:id/pdf ─────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  try {
    const prescRes = await queryTenant(
      req.tenantSchema,
      `SELECT
         pr.id, pr.rx_number, pr.created_at, pr.notes,
         p.first_name, p.last_name,
         p.patient_code, p.date_of_birth, p.gender, p.phone, p.allergies,
         p.id AS patient_id,
         s.full_name AS doctor_name, s.specialization,
         s.registration_no, s.signature_url
       FROM prescriptions pr
       JOIN patients p ON p.id = pr.patient_id
       JOIN staff    s ON s.id = pr.doctor_id
       WHERE pr.id = $1`,
      [req.params.id]
    );
    if (!prescRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    }

    const itemsRes = await queryTenant(
      req.tenantSchema,
      `SELECT
         pi.id, pi.dosage, pi.frequency, pi.duration, pi.instructions, pi.quantity_given,
         m.name AS medicine_name, m.generic_name, m.strength, m.unit
       FROM prescription_items pi
       JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = $1
       ORDER BY pi.id`,
      [req.params.id]
    );

    const settingsRes = await queryTenant(
      req.tenantSchema,
      `SELECT * FROM clinic_settings LIMIT 1`, []
    );
    const settings = settingsRes.rows[0] || {};

    generatePrescriptionPDF(res, {
      prescription: prescRes.rows[0],
      items:        itemsRes.rows,
      settings,
      tenantSchema: req.tenantSchema,
    });
  } catch (err) {
    console.error('GET /prescriptions/:id/pdf', err);
    if (!res.headersSent) res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

module.exports = router;
