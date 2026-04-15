const express = require('express');
const { queryTenant, pool }                    = require('../config/db');
const { authMiddleware, requireRole }          = require('../middleware/auth');
const { tenantMiddleware, requireFeature }     = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware, requireFeature('insurance'));

// ── CLAIM NUMBER GENERATOR ────────────────────────────────────────────────────
async function nextClaimNumber(schema) {
  const r = await queryTenant(schema,
    `SELECT claim_number FROM insurance_claims
     WHERE claim_number IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`, []);
  if (!r.rows.length) return 'CLM-00001';
  const last = r.rows[0].claim_number;
  const num  = parseInt(last.replace('CLM-', ''), 10) + 1;
  return `CLM-${String(num).padStart(5, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// INVOICE LOOKUP (used by New Claim modal)
// ══════════════════════════════════════════════════════════════════════════════

// GET /insurance/lookup-invoice?invoice_number=INV-00001
router.get('/lookup-invoice', requireRole('admin', 'receptionist'), async (req, res) => {
  const { invoice_number } = req.query;
  if (!invoice_number) {
    return res.status(400).json({ status: 'error', message: 'Invoice number is required' });
  }
  try {
    const r = await queryTenant(req.tenantSchema,
      `SELECT i.id AS invoice_id, i.invoice_number, i.total_amount, i.status AS invoice_status,
              p.id AS patient_id,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_code
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       WHERE UPPER(i.invoice_number) = UPPER($1)`,
      [invoice_number.trim()]);
    if (!r.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }
    res.json({ status: 'success', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE PROVIDERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /insurance/providers
router.get('/providers', async (req, res) => {
  try {
    const r = await queryTenant(req.tenantSchema,
      `SELECT id, name, contact_person, phone, email, notes, is_active, created_at
       FROM insurance_providers ORDER BY name ASC`, []);
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /insurance/providers
router.post('/providers', requireRole('admin', 'receptionist'), async (req, res) => {
  const { name, contact_person, phone, email, notes } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Provider name is required' });
  }
  try {
    const r = await queryTenant(req.tenantSchema,
      `INSERT INTO insurance_providers (name, contact_person, phone, email, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name.trim(), contact_person?.trim()||null, phone?.trim()||null,
       email?.trim()||null, notes?.trim()||null]);
    res.status(201).json({ status: 'success', message: `'${name}' created successfully`, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// PUT /insurance/providers/:id
router.put('/providers/:id', requireRole('admin', 'receptionist'), async (req, res) => {
  const { name, contact_person, phone, email, notes, is_active } = req.body;
  try {
    const r = await queryTenant(req.tenantSchema,
      `UPDATE insurance_providers SET
         name           = COALESCE($1, name),
         contact_person = $2,
         phone          = $3,
         email          = $4,
         notes          = $5,
         is_active      = COALESCE($6, is_active),
         updated_at     = NOW()
       WHERE id = $7 RETURNING *`,
      [name?.trim()||null, contact_person?.trim()??null, phone?.trim()??null,
       email?.trim()??null, notes?.trim()??null, is_active??null, req.params.id]);
    if (!r.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Provider not found' });
    }
    res.json({ status: 'success', message: 'Changes saved successfully', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /insurance/providers/:id  (soft delete)
router.delete('/providers/:id', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    await queryTenant(req.tenantSchema,
      `UPDATE insurance_providers SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// INSURANCE CLAIMS
// ══════════════════════════════════════════════════════════════════════════════

// GET /insurance/claims?status=&date_from=&date_to=&provider_id=
router.get('/claims', async (req, res) => {
  const { status, date_from, date_to, provider_id } = req.query;
  try {
    const params     = [];
    const conditions = [];

    if (status)      { params.push(status);      conditions.push(`c.status = $${params.length}`); }
    if (date_from)   { params.push(date_from);   conditions.push(`c.claim_date >= $${params.length}`); }
    if (date_to)     { params.push(date_to);     conditions.push(`c.claim_date <= $${params.length}`); }
    if (provider_id) { params.push(provider_id); conditions.push(`c.provider_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await queryTenant(req.tenantSchema,
      `SELECT c.id, c.claim_number, c.claim_date, c.amount_claimed, c.amount_approved,
              c.status, c.notes, c.submitted_at, c.resolved_at, c.created_at,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_code, p.id AS patient_id,
              ip.name AS provider_name, ip.id AS provider_id,
              i.invoice_number, i.total_amount AS invoice_total,
              s.full_name AS created_by_name
       FROM insurance_claims c
       JOIN patients p   ON c.patient_id  = p.id
       JOIN invoices i   ON c.invoice_id  = i.id
       LEFT JOIN insurance_providers ip ON c.provider_id = ip.id
       LEFT JOIN staff s ON c.created_by  = s.id
       ${where}
       ORDER BY c.created_at DESC`,
      params);
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /insurance/claims
router.post('/claims', requireRole('admin', 'receptionist'), async (req, res) => {
  const { invoice_id, patient_id, provider_id, amount_claimed, claim_date, notes } = req.body;
  if (!invoice_id || !patient_id || !amount_claimed) {
    return res.status(400).json({
      status: 'error',
      message: 'Invoice, patient, and amount claimed are required',
    });
  }
  try {
    const claim_number = await nextClaimNumber(req.tenantSchema);
    const r = await queryTenant(req.tenantSchema,
      `INSERT INTO insurance_claims
         (invoice_id, patient_id, provider_id, claim_number, claim_date, amount_claimed, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [invoice_id, patient_id, provider_id||null, claim_number,
       claim_date || new Date().toISOString().slice(0, 10),
       parseFloat(amount_claimed), notes?.trim()||null, req.user.id]);
    res.status(201).json({
      status:  'success',
      message: `Claim ${claim_number} created successfully`,
      data:    r.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// GET /insurance/claims/:id
router.get('/claims/:id', async (req, res) => {
  try {
    const r = await queryTenant(req.tenantSchema,
      `SELECT c.*,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_code, p.phone AS patient_phone,
              ip.name AS provider_name,
              i.invoice_number, i.total_amount AS invoice_total,
              s.full_name AS created_by_name
       FROM insurance_claims c
       JOIN patients p ON c.patient_id = p.id
       JOIN invoices i ON c.invoice_id = i.id
       LEFT JOIN insurance_providers ip ON c.provider_id = ip.id
       LEFT JOIN staff s ON c.created_by = s.id
       WHERE c.id = $1`,
      [req.params.id]);
    if (!r.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Claim not found' });
    }
    res.json({ status: 'success', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// PUT /insurance/claims/:id/status
router.put('/claims/:id/status', requireRole('admin', 'receptionist'), async (req, res) => {
  const { status, amount_approved, notes } = req.body;
  const valid = ['pending', 'submitted', 'approved', 'partial', 'rejected'];
  if (!status || !valid.includes(status)) {
    return res.status(400).json({
      status: 'error',
      message: `Status must be one of: ${valid.join(', ')}`,
    });
  }
  try {
    const r = await queryTenant(req.tenantSchema,
      `UPDATE insurance_claims SET
         status          = $1,
         amount_approved = CASE WHEN $2::TEXT IS NOT NULL THEN $2::DECIMAL ELSE amount_approved END,
         notes           = CASE WHEN $3::TEXT IS NOT NULL THEN $3 ELSE notes END,
         submitted_at    = CASE WHEN $4 AND submitted_at IS NULL THEN NOW() ELSE submitted_at END,
         resolved_at     = CASE WHEN $5 THEN NOW() ELSE resolved_at END,
         updated_at      = NOW()
       WHERE id = $6 RETURNING *`,
      [status,
       amount_approved != null ? String(amount_approved) : null,
       notes?.trim() || null,
       status === 'submitted',
       ['approved', 'partial', 'rejected'].includes(status),
       req.params.id]);
    if (!r.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Claim not found' });
    }
    res.json({ status: 'success', message: 'Changes saved successfully', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// CORPORATE ACCOUNTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /insurance/corporate-accounts
router.get('/corporate-accounts', async (req, res) => {
  try {
    const r = await queryTenant(req.tenantSchema,
      `SELECT ca.*,
              COUNT(p.id)::INT AS patient_count
       FROM corporate_accounts ca
       LEFT JOIN patients p ON p.corporate_account_id = ca.id
       GROUP BY ca.id
       ORDER BY ca.company_name ASC`, []);
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /insurance/corporate-accounts
router.post('/corporate-accounts', requireRole('admin', 'receptionist'), async (req, res) => {
  const { company_name, contact_person, phone, email, address, billing_cycle, credit_limit, notes } = req.body;
  if (!company_name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Company name is required' });
  }
  try {
    const r = await queryTenant(req.tenantSchema,
      `INSERT INTO corporate_accounts
         (company_name, contact_person, phone, email, address, billing_cycle, credit_limit, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [company_name.trim(), contact_person?.trim()||null, phone?.trim()||null,
       email?.trim()||null, address?.trim()||null,
       billing_cycle || 'monthly',
       credit_limit ? parseFloat(credit_limit) : null,
       notes?.trim()||null]);
    res.status(201).json({
      status:  'success',
      message: `'${company_name}' created successfully`,
      data:    r.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// PUT /insurance/corporate-accounts/:id
router.put('/corporate-accounts/:id', requireRole('admin', 'receptionist'), async (req, res) => {
  const { company_name, contact_person, phone, email, address, billing_cycle, credit_limit, notes, is_active } = req.body;
  try {
    const r = await queryTenant(req.tenantSchema,
      `UPDATE corporate_accounts SET
         company_name   = COALESCE($1, company_name),
         contact_person = $2,
         phone          = $3,
         email          = $4,
         address        = $5,
         billing_cycle  = COALESCE($6, billing_cycle),
         credit_limit   = $7,
         notes          = $8,
         is_active      = COALESCE($9, is_active),
         updated_at     = NOW()
       WHERE id = $10 RETURNING *`,
      [company_name?.trim()||null, contact_person?.trim()??null, phone?.trim()??null,
       email?.trim()??null, address?.trim()??null, billing_cycle||null,
       credit_limit !== undefined ? (credit_limit ? parseFloat(credit_limit) : null) : undefined,
       notes?.trim()??null, is_active??null, req.params.id]);
    if (!r.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Corporate account not found' });
    }
    res.json({ status: 'success', message: 'Changes saved successfully', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /insurance/corporate-accounts/:id  (soft delete)
router.delete('/corporate-accounts/:id', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    await queryTenant(req.tenantSchema,
      `UPDATE corporate_accounts SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]);
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// GET /insurance/corporate-accounts/:id/summary?month=2026-04
router.get('/corporate-accounts/:id/summary', async (req, res) => {
  const { month } = req.query;
  try {
    const targetMonth  = month || new Date().toISOString().slice(0, 7);
    const [year, mon]  = targetMonth.split('-');

    const acct = await queryTenant(req.tenantSchema,
      `SELECT * FROM corporate_accounts WHERE id = $1`, [req.params.id]);
    if (!acct.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Corporate account not found' });
    }

    const invoices = await queryTenant(req.tenantSchema,
      `SELECT i.id, i.invoice_number, i.invoice_date, i.total_amount, i.status,
              p.first_name || ' ' || p.last_name AS patient_name, p.patient_code
       FROM invoices i
       JOIN patients p ON i.patient_id = p.id
       WHERE p.corporate_account_id = $1
         AND EXTRACT(YEAR  FROM i.invoice_date) = $2
         AND EXTRACT(MONTH FROM i.invoice_date) = $3
       ORDER BY i.invoice_date DESC`,
      [req.params.id, parseInt(year), parseInt(mon)]);

    const total_billed = invoices.rows.reduce((s, r) => s + parseFloat(r.total_amount), 0);
    const total_unpaid = invoices.rows
      .filter(r => r.status !== 'paid')
      .reduce((s, r) => s + parseFloat(r.total_amount), 0);

    res.json({
      status: 'success',
      data: {
        account:       acct.rows[0],
        month:         targetMonth,
        invoices:      invoices.rows,
        total_billed,
        total_unpaid,
        invoice_count: invoices.rows.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
