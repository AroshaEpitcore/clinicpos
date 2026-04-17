const express = require('express');
const { queryTenant }      = require('../config/db');
const { authMiddleware, requireRole }   = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { nextPatientCode }  = require('../utils/patientCode');

const router = express.Router();

// Strip non-digits from phone and validate exactly 10 digits
function normalizePhone(value) {
  if (!value) return null;
  return String(value).replace(/\D/g, '');
}

function validatePhoneDigits(digits) {
  if (!digits) return 'Phone number is required';
  if (digits.length !== 10) return 'Phone number must be exactly 10 digits';
  return null;
}

// All patient routes require a valid tenant + authenticated user
router.use(tenantMiddleware, authMiddleware);

// ─── GET /api/v1/patients/check-duplicate ────────────────────────────────────
// MUST be before /:id route
router.get('/check-duplicate', async (req, res) => {
  const { phone, first_name, last_name, national_id } = req.query;
  // Normalize phone — strip spaces/dashes so formatted input still matches stored digits
  const phoneNorm = phone ? String(phone).replace(/\D/g, '') : '';
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, patient_code, first_name, last_name, phone, date_of_birth, gender
       FROM patients
       WHERE is_active = TRUE
         AND (
           ($1 <> '' AND phone = $1)
           OR ($2 <> '' AND $3 <> '' AND LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3))
           OR ($4 <> '' AND national_id = $4)
         )
       LIMIT 5`,
      [phoneNorm, first_name || '', last_name || '', national_id || '']
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/v1/patients/returning ──────────────────────────────────────────
// Quick lookup by phone for returning patient flow
router.get('/returning', async (req, res) => {
  const { phone } = req.query;
  if (!phone) {
    return res.status(400).json({ status: 'error', message: 'Phone number is required' });
  }
  // Normalize — strip spaces/dashes so formatted input still matches stored digits
  const phoneNorm = String(phone).replace(/\D/g, '');
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         p.id, p.patient_code, p.first_name, p.last_name,
         p.phone, p.date_of_birth, p.gender, p.allergies,
         (SELECT visit_date FROM consultations
          WHERE patient_id = p.id ORDER BY visit_date DESC LIMIT 1) AS last_visit
       FROM patients p
       WHERE p.phone ILIKE $1 AND p.is_active = TRUE
       LIMIT 5`,
      [`%${phoneNorm}%`]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/v1/patients ─────────────────────────────────────────────────────
// List with search and pagination
router.get('/', async (req, res) => {
  const search = req.query.search || '';
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(50, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  try {
    const searchParam = `%${search}%`;

    const countResult = await queryTenant(
      req.tenantSchema,
      `SELECT COUNT(*) FROM patients
       WHERE is_active = TRUE
         AND ($1 = '%%' OR
              first_name    ILIKE $1 OR
              last_name     ILIKE $1 OR
              phone         ILIKE $1 OR
              patient_code  ILIKE $1 OR
              (first_name || COALESCE(' ' || last_name, '')) ILIKE $1
         )`,
      [searchParam]
    );

    const dataResult = await queryTenant(
      req.tenantSchema,
      `SELECT
         id, patient_code, first_name, last_name,
         phone, date_of_birth, gender, allergies, created_at
       FROM patients
       WHERE is_active = TRUE
         AND ($1 = '%%' OR
              first_name    ILIKE $1 OR
              last_name     ILIKE $1 OR
              phone         ILIKE $1 OR
              patient_code  ILIKE $1 OR
              (first_name || COALESCE(' ' || last_name, '')) ILIKE $1
         )
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchParam, limit, offset]
    );

    const total      = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(total / limit);

    res.json({
      status: 'success',
      data: {
        patients: dataResult.rows,
        total,
        page,
        totalPages,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── POST /api/v1/patients ────────────────────────────────────────────────────
router.post('/', requireRole('receptionist', 'admin'), async (req, res) => {
  const {
    first_name, last_name, date_of_birth, gender, phone,
    email, address, blood_group, allergies,
    emergency_name, emergency_phone,
    national_id, insurance_provider, insurance_number,
  } = req.body;

  // Only first_name and phone are required — everything else is optional
  if (!first_name || !phone) {
    return res.status(400).json({ status: 'error', message: 'First name and phone number are required' });
  }

  const phoneDigits = normalizePhone(phone);
  const phoneErr = validatePhoneDigits(phoneDigits);
  if (phoneErr) return res.status(400).json({ status: 'error', message: phoneErr });

  const emergencyPhoneDigits = emergency_phone ? normalizePhone(emergency_phone) : null;
  if (emergencyPhoneDigits && emergencyPhoneDigits.length !== 10) {
    return res.status(400).json({ status: 'error', message: 'Emergency phone number must be exactly 10 digits' });
  }

  try {
    const patient_code = await nextPatientCode(req.tenantSchema);

    const result = await queryTenant(
      req.tenantSchema,
      `INSERT INTO patients
         (patient_code, first_name, last_name, date_of_birth, gender, phone,
          email, address, blood_group, allergies,
          emergency_name, emergency_phone,
          national_id, insurance_provider, insurance_number,
          registered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        patient_code,
        first_name.trim(), last_name?.trim() || null,
        date_of_birth || null, gender || null, phoneDigits,
        email || null, address || null, blood_group || null, allergies || null,
        emergency_name || null, emergencyPhoneDigits || null,
        national_id || null, insurance_provider || null, insurance_number || null,
        req.user.id,
      ]
    );

    res.status(201).json({
      status: 'success',
      message: `${first_name} ${last_name} registered successfully`,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── GET /api/v1/patients/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT
         p.*,
         COUNT(DISTINCT a.id) AS total_visits,
         COUNT(DISTINCT i.id) AS total_invoices,
         COALESCE(SUM(i.total_amount), 0) AS total_billed,
         (SELECT visit_date FROM consultations
          WHERE patient_id = p.id ORDER BY visit_date DESC LIMIT 1) AS last_visit
       FROM patients p
       LEFT JOIN appointments a  ON a.patient_id = p.id AND a.status = 'completed'
       LEFT JOIN invoices i      ON i.patient_id = p.id
       WHERE p.id = $1 AND p.is_active = TRUE
       GROUP BY p.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Patient not found' });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── PUT /api/v1/patients/:id ─────────────────────────────────────────────────
router.put('/:id', requireRole('receptionist', 'admin'), async (req, res) => {
  const {
    first_name, last_name, date_of_birth, gender, phone,
    email, address, blood_group, allergies,
    emergency_name, emergency_phone,
    national_id, insurance_provider, insurance_number,
  } = req.body;

  // Only first_name and phone are required — everything else is optional
  if (!first_name || !phone) {
    return res.status(400).json({ status: 'error', message: 'First name and phone number are required' });
  }

  const phoneDigits = normalizePhone(phone);
  const phoneErr = validatePhoneDigits(phoneDigits);
  if (phoneErr) return res.status(400).json({ status: 'error', message: phoneErr });

  const emergencyPhoneDigits = emergency_phone ? normalizePhone(emergency_phone) : null;
  if (emergencyPhoneDigits && emergencyPhoneDigits.length !== 10) {
    return res.status(400).json({ status: 'error', message: 'Emergency phone number must be exactly 10 digits' });
  }

  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE patients SET
         first_name=$1, last_name=$2, date_of_birth=$3, gender=$4, phone=$5,
         email=$6, address=$7, blood_group=$8, allergies=$9,
         emergency_name=$10, emergency_phone=$11,
         national_id=$12, insurance_provider=$13, insurance_number=$14,
         updated_at=NOW()
       WHERE id=$15 AND is_active=TRUE
       RETURNING *`,
      [
        first_name.trim(), last_name?.trim() || null, date_of_birth || null, gender || null, phoneDigits,
        email || null, address || null, blood_group || null, allergies || null,
        emergency_name || null, emergencyPhoneDigits || null,
        national_id || null, insurance_provider || null, insurance_number || null,
        req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Patient not found' });
    }

    res.json({
      status: 'success',
      message: 'Changes saved successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── DELETE /api/v1/patients/:id — soft delete ───────────────────────────────
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE patients SET is_active=FALSE, updated_at=NOW()
       WHERE id=$1 AND is_active=TRUE RETURNING id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Patient not found' });
    }

    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
