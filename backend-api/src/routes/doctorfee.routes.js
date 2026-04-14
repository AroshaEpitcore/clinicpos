const router = require('express').Router();
const { queryTenant } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

router.use(tenantMiddleware, authMiddleware);

// ── GET /api/v1/doctor-fees ───────────────────────────────────────────────────
// List all doctors with their fee (joins staff + doctor_fees)
router.get('/', async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId, `
      SELECT s.id AS doctor_id, s.full_name, s.specialization, s.signature_url,
             COALESCE(df.fee_label, 'Consultation Fee') AS fee_label,
             COALESCE(df.amount, 0)                     AS amount
      FROM staff s
      LEFT JOIN doctor_fees df ON df.doctor_id = s.id
      WHERE s.role = 'doctor' AND s.is_active = TRUE
      ORDER BY s.full_name
    `);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /doctor-fees', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── PUT /api/v1/doctor-fees/:doctorId ────────────────────────────────────────
// Upsert fee for a doctor (admin only)
router.put('/:doctorId', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { fee_label, amount } = req.body;
  if (amount == null) {
    return res.status(400).json({ status: 'error', message: 'amount is required' });
  }
  try {
    await queryTenant(tenantId, `
      INSERT INTO doctor_fees (doctor_id, fee_label, amount)
      VALUES ($1, $2, $3)
      ON CONFLICT (doctor_id) DO UPDATE
        SET fee_label  = EXCLUDED.fee_label,
            amount     = EXCLUDED.amount,
            updated_at = NOW()
    `, [req.params.doctorId, fee_label || 'Consultation Fee', amount]);
    res.json({ status: 'success', message: 'Fee updated' });
  } catch (err) {
    console.error('PUT /doctor-fees/:doctorId', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
