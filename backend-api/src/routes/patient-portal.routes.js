/**
 * patient-portal.routes.js
 * Authenticated patient-facing API — patients log in to view their own records.
 *
 * All routes use tenantMiddleware (no staff authMiddleware).
 * Auth routes (register/login) are fully public.
 * Data routes use patientAuthMiddleware to verify the patient JWT.
 *
 * JWT payload: { patientId, tenantSchema, role: 'patient' }
 */

const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { queryTenant }          = require('../config/db');
const { tenantMiddleware }     = require('../middleware/tenant');
const { patientAuthMiddleware } = require('../middleware/patientAuth');

const router = express.Router();
router.use(tenantMiddleware);

const SALT_ROUNDS = 10;
const TOKEN_EXPIRY = '7d';

function issueToken(patientId, tenantSchema) {
  const secret = process.env.PATIENT_JWT_SECRET || process.env.JWT_SECRET;
  return jwt.sign({ patientId, tenantSchema, role: 'patient' }, secret, { expiresIn: TOKEN_EXPIRY });
}

async function checkLoginEnabled(schema, res) {
  const r = await queryTenant(schema, `SELECT patient_login_enabled FROM clinic_settings LIMIT 1`);
  if (!r.rows.length || !r.rows[0].patient_login_enabled) {
    res.status(403).json({ status: 'error', message: 'Patient portal is not enabled for this clinic' });
    return false;
  }
  return true;
}

// ── POST /api/v1/patient-portal/register ─────────────────────────────────────
// Phone must already exist in patients table. Patient sets a password.
router.post('/register', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ status: 'error', message: 'Phone and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
  }

  const schema = req.tenantSchema;
  try {
    if (!await checkLoginEnabled(schema, res)) return;

    const clean = phone.replace(/\D/g, '');
    const r = await queryTenant(schema, `SELECT id, portal_password_hash FROM patients WHERE phone = $1 AND is_active = TRUE LIMIT 1`, [clean]);
    if (!r.rows.length) {
      return res.status(404).json({ status: 'error', message: 'No patient record found. Please visit the clinic first.' });
    }
    if (r.rows[0].portal_password_hash) {
      return res.status(409).json({ status: 'error', message: 'Account already exists. Please log in instead.' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await queryTenant(schema,
      `UPDATE patients SET portal_password_hash = $1, portal_registered_at = NOW() WHERE id = $2`,
      [hash, r.rows[0].id]
    );

    res.json({ status: 'success', message: 'Account created. Please log in.' });
  } catch (err) {
    console.error('POST /patient-portal/register', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/patient-portal/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) {
    return res.status(400).json({ status: 'error', message: 'Phone and password are required' });
  }

  const schema = req.tenantSchema;
  try {
    if (!await checkLoginEnabled(schema, res)) return;

    const clean = phone.replace(/\D/g, '');
    const r = await queryTenant(schema,
      `SELECT id, first_name, portal_password_hash FROM patients WHERE phone = $1 AND is_active = TRUE LIMIT 1`,
      [clean]
    );

    if (!r.rows.length || !r.rows[0].portal_password_hash) {
      return res.status(401).json({ status: 'error', message: 'Invalid phone or password' });
    }

    const match = await bcrypt.compare(password, r.rows[0].portal_password_hash);
    if (!match) {
      return res.status(401).json({ status: 'error', message: 'Invalid phone or password' });
    }

    await queryTenant(schema, `UPDATE patients SET portal_last_login_at = NOW() WHERE id = $1`, [r.rows[0].id]);

    const token = issueToken(r.rows[0].id, schema);
    res.json({ status: 'success', data: { token, first_name: r.rows[0].first_name } });
  } catch (err) {
    console.error('POST /patient-portal/login', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/patient-portal/change-password ──────────────────────────────
router.post('/change-password', patientAuthMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ status: 'error', message: 'Both passwords are required' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'New password must be at least 6 characters' });
  }

  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema, `SELECT portal_password_hash FROM patients WHERE id = $1`, [req.patient.patientId]);
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Patient not found' });

    const match = await bcrypt.compare(current_password, r.rows[0].portal_password_hash);
    if (!match) return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await queryTenant(schema, `UPDATE patients SET portal_password_hash = $1 WHERE id = $2`, [hash, req.patient.patientId]);

    res.json({ status: 'success', message: 'Password updated' });
  } catch (err) {
    console.error('POST /patient-portal/change-password', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/me ────────────────────────────────────────────
router.get('/me', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema,
      `SELECT patient_code, first_name, last_name, date_of_birth, gender, phone, email,
              address, blood_group, allergies, emergency_name, emergency_phone,
              insurance_provider, insurance_number, created_at
       FROM patients WHERE id = $1`,
      [req.patient.patientId]
    );
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Patient not found' });
    res.json({ status: 'success', data: r.rows[0] });
  } catch (err) {
    console.error('GET /patient-portal/me', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── PUT /api/v1/patient-portal/me ────────────────────────────────────────────
// Patients can update personal/contact info. Clinical fields (allergies, insurance) are staff-only.
router.put('/me', patientAuthMiddleware, async (req, res) => {
  const { first_name, last_name, email, address, emergency_name, emergency_phone } = req.body;
  if (!first_name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'First name is required' });
  }

  const schema = req.tenantSchema;
  try {
    await queryTenant(schema,
      `UPDATE patients
       SET first_name = $1, last_name = $2, email = $3, address = $4,
           emergency_name = $5, emergency_phone = $6, updated_at = NOW()
       WHERE id = $7`,
      [first_name.trim(), last_name?.trim() || null, email?.trim() || null,
       address?.trim() || null, emergency_name?.trim() || null, emergency_phone?.replace(/\D/g, '') || null,
       req.patient.patientId]
    );
    res.json({ status: 'success', message: 'Profile updated' });
  } catch (err) {
    console.error('PUT /patient-portal/me', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/appointments ───────────────────────────────────
router.get('/appointments', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema,
      `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.type,
              a.token_number, a.booking_reference,
              s.full_name AS doctor_name, s.specialization
       FROM appointments a
       LEFT JOIN staff s ON s.id = a.doctor_id
       WHERE a.patient_id = $1
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [req.patient.patientId]
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error('GET /patient-portal/appointments', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── DELETE /api/v1/patient-portal/appointments/:id ───────────────────────────
// Only cancel if status is pending/confirmed AND date is today or future.
router.delete('/appointments/:id', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema,
      `SELECT id, patient_id, status, appointment_date FROM appointments WHERE id = $1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Appointment not found' });

    const appt = r.rows[0];
    if (String(appt.patient_id) !== String(req.patient.patientId)) {
      return res.status(403).json({ status: 'error', message: 'Not your appointment' });
    }
    if (!['pending', 'confirmed'].includes(appt.status)) {
      return res.status(400).json({ status: 'error', message: 'Only pending or confirmed appointments can be cancelled' });
    }
    const today = new Date().toISOString().split('T')[0];
    const apptDate = new Date(appt.appointment_date).toISOString().split('T')[0];
    if (apptDate < today) {
      return res.status(400).json({ status: 'error', message: 'Cannot cancel a past appointment' });
    }

    await queryTenant(schema, `UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [req.params.id]);
    res.json({ status: 'success', message: 'Appointment cancelled' });
  } catch (err) {
    console.error('DELETE /patient-portal/appointments/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/consultations ─────────────────────────────────
router.get('/consultations', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema,
      `SELECT c.id, c.created_at, c.chief_complaint, c.diagnosis, c.icd10_code,
              c.symptoms, c.notes, c.follow_up_date,
              c.bp_systolic, c.bp_diastolic, c.pulse, c.temperature, c.weight,
              s.full_name AS doctor_name, s.specialization
       FROM consultations c
       LEFT JOIN staff s ON s.id = c.doctor_id
       WHERE c.patient_id = $1
       ORDER BY c.created_at DESC`,
      [req.patient.patientId]
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error('GET /patient-portal/consultations', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/prescriptions ─────────────────────────────────
router.get('/prescriptions', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const rxList = await queryTenant(schema,
      `SELECT p.id, p.rx_number, p.created_at, p.notes, p.is_dispensed,
              s.full_name AS doctor_name
       FROM prescriptions p
       LEFT JOIN staff s ON s.id = p.doctor_id
       WHERE p.patient_id = $1
       ORDER BY p.created_at DESC`,
      [req.patient.patientId]
    );

    const ids = rxList.rows.map(r => r.id);
    if (!ids.length) return res.json({ status: 'success', data: [] });

    const items = await queryTenant(schema,
      `SELECT pi.prescription_id,
              COALESCE(m.name, pi.custom_medicine_name) AS medicine_name,
              pi.dosage, pi.frequency, pi.duration, pi.food_instruction, pi.quantity_given
       FROM prescription_items pi
       LEFT JOIN medicines m ON m.id = pi.medicine_id
       WHERE pi.prescription_id = ANY($1::uuid[])
       ORDER BY pi.id`,
      [ids]
    );

    const itemMap = {};
    items.rows.forEach(item => {
      if (!itemMap[item.prescription_id]) itemMap[item.prescription_id] = [];
      itemMap[item.prescription_id].push(item);
    });

    const data = rxList.rows.map(rx => ({ ...rx, items: itemMap[rx.id] || [] }));
    res.json({ status: 'success', data });
  } catch (err) {
    console.error('GET /patient-portal/prescriptions', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/labs ──────────────────────────────────────────
router.get('/labs', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema,
      `SELECT lr.id, lr.created_at, lr.status,
              lt.name AS test_name, lt.code AS test_code, lt.category,
              res.result_value, res.result_unit, res.reference_range, res.notes AS result_notes,
              res.result_file_url, res.recorded_at
       FROM lab_requests lr
       LEFT JOIN lab_tests    lt  ON lt.id  = lr.test_id
       LEFT JOIN lab_results  res ON res.request_id = lr.id
       WHERE lr.patient_id = $1
       ORDER BY lr.created_at DESC`,
      [req.patient.patientId]
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error('GET /patient-portal/labs', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/invoices ──────────────────────────────────────
router.get('/invoices', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const r = await queryTenant(schema,
      `SELECT i.id, i.invoice_number, i.created_at, i.status,
              i.total_amount, i.paid_amount,
              (i.total_amount - i.paid_amount) AS balance
       FROM invoices i
       WHERE i.patient_id = $1
       ORDER BY i.created_at DESC`,
      [req.patient.patientId]
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error('GET /patient-portal/invoices', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/invoices/:id ──────────────────────────────────
router.get('/invoices/:id', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const inv = await queryTenant(schema,
      `SELECT i.id, i.invoice_number, i.created_at, i.status,
              i.subtotal, i.discount, i.tax_amount, i.total_amount, i.paid_amount,
              (i.total_amount - i.paid_amount) AS balance,
              i.notes
       FROM invoices i
       WHERE i.id = $1 AND i.patient_id = $2`,
      [req.params.id, req.patient.patientId]
    );
    if (!inv.rows.length) return res.status(404).json({ status: 'error', message: 'Invoice not found' });

    const items = await queryTenant(schema,
      `SELECT description, quantity, unit_price, line_total FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
      [req.params.id]
    );
    const splits = await queryTenant(schema,
      `SELECT payment_method, amount, reference, created_at FROM payment_splits WHERE invoice_id = $1 ORDER BY created_at`,
      [req.params.id]
    );

    res.json({ status: 'success', data: { ...inv.rows[0], items: items.rows, payments: splits.rows } });
  } catch (err) {
    console.error('GET /patient-portal/invoices/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/patient-portal/summary ───────────────────────────────────────
// Dashboard summary: next appointment, recent visit, outstanding balance
router.get('/summary', patientAuthMiddleware, async (req, res) => {
  const schema = req.tenantSchema;
  const pid = req.patient.patientId;
  const today = new Date().toISOString().split('T')[0];

  try {
    const [nextAppt, lastVisit, outstanding] = await Promise.all([
      queryTenant(schema,
        `SELECT a.appointment_date, a.appointment_time, a.status, a.token_number,
                s.full_name AS doctor_name
         FROM appointments a
         LEFT JOIN staff s ON s.id = a.doctor_id
         WHERE a.patient_id = $1 AND a.appointment_date >= $2 AND a.status NOT IN ('cancelled','completed')
         ORDER BY a.appointment_date ASC, a.appointment_time ASC LIMIT 1`,
        [pid, today]
      ),
      queryTenant(schema,
        `SELECT c.created_at, c.chief_complaint, c.diagnosis, s.full_name AS doctor_name
         FROM consultations c LEFT JOIN staff s ON s.id = c.doctor_id
         WHERE c.patient_id = $1 ORDER BY c.created_at DESC LIMIT 1`,
        [pid]
      ),
      queryTenant(schema,
        `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding
         FROM invoices WHERE patient_id = $1 AND status != 'paid'`,
        [pid]
      ),
    ]);

    res.json({
      status: 'success',
      data: {
        next_appointment: nextAppt.rows[0] || null,
        last_visit:       lastVisit.rows[0] || null,
        outstanding_balance: parseFloat(outstanding.rows[0]?.outstanding || 0),
      },
    });
  } catch (err) {
    console.error('GET /patient-portal/summary', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
