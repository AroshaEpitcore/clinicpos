const router = require('express').Router();
const { queryTenant } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');
const { generateInvoicePDF }          = require('../utils/pdfGenerator');

router.use(tenantMiddleware, authMiddleware);

// ── POST /api/v1/invoices ──────────────────────────────────────────────────────
// Create invoice from a consultation. Auto-pulls doctor fee + prescribed medicines.
router.post('/', requireRole('receptionist', 'admin'), async (req, res) => {
  const { consultation_id, notes } = req.body;
  const tenantId = req.tenantSchema;

  if (!consultation_id) {
    return res.status(400).json({ status: 'error', message: 'consultation_id is required' });
  }

  try {
    // Check no duplicate invoice for this consultation
    const dup = await queryTenant(tenantId,
      `SELECT id FROM invoices WHERE consultation_id = $1`, [consultation_id]);
    if (dup.rows.length) {
      return res.status(409).json({
        status: 'error',
        message: 'Invoice already exists for this consultation',
        data: { id: dup.rows[0].id },
      });
    }

    // Load consultation + patient + doctor
    const cRes = await queryTenant(tenantId, `
      SELECT c.id, c.patient_id, c.doctor_id, c.appointment_id,
             p.first_name, p.last_name,
             s.full_name AS doctor_name
      FROM consultations c
      JOIN patients p ON p.id = c.patient_id
      JOIN staff    s ON s.id = c.doctor_id
      WHERE c.id = $1
    `, [consultation_id]);
    if (!cRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Consultation not found' });
    }
    const consult = cRes.rows[0];

    // Build line items array
    const items = [];

    // 1. Doctor consultation fee
    const feeRes = await queryTenant(tenantId,
      `SELECT fee_label, amount FROM doctor_fees WHERE doctor_id = $1`, [consult.doctor_id]);
    if (feeRes.rows.length && parseFloat(feeRes.rows[0].amount) > 0) {
      const f = feeRes.rows[0];
      items.push({
        description: f.fee_label || 'Consultation Fee',
        item_type:   'consultation',
        quantity:    1,
        unit_price:  parseFloat(f.amount),
        total_price: parseFloat(f.amount),
      });
    }

    // 2. Prescribed medicines (from latest prescription on this consultation)
    const rxRes = await queryTenant(tenantId, `
      SELECT COALESCE(pi.quantity_given, 1) AS qty, pi.dosage,
             COALESCE(m.name, pi.custom_medicine_name) AS name,
             m.strength,
             COALESCE(m.selling_price, 0) AS selling_price
      FROM prescriptions pr
      JOIN prescription_items pi ON pi.prescription_id = pr.id
      LEFT JOIN medicines m       ON m.id = pi.medicine_id
      WHERE pr.consultation_id = $1
    `, [consultation_id]);
    for (const row of rxRes.rows) {
      const qty        = row.qty || 1;
      const unit_price = parseFloat(row.selling_price) || 0;
      items.push({
        description: `${row.name}${row.strength ? ' ' + row.strength : ''}`,
        item_type:   'medicine',
        quantity:    qty,
        unit_price,
        total_price: qty * unit_price,
      });
    }

    // Calculate totals
    const subtotal     = items.reduce((s, i) => s + i.total_price, 0);
    const total_amount = subtotal;
    const balance_due  = total_amount;

    // Auto-generate invoice number INV-XXXXX
    const countRes = await queryTenant(tenantId, `SELECT COUNT(*) FROM invoices`);
    const seq = parseInt(countRes.rows[0].count) + 1;
    const invoice_number = `INV-${String(seq).padStart(5, '0')}`;

    // Insert invoice
    const invRes = await queryTenant(tenantId, `
      INSERT INTO invoices
        (invoice_number, consultation_id, patient_id, generated_by,
         subtotal, total_amount, balance_due, payment_status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'unpaid',$8)
      RETURNING *
    `, [invoice_number, consultation_id, consult.patient_id, req.user.id,
        subtotal, total_amount, balance_due, notes || null]);
    const invoice = invRes.rows[0];

    // Insert line items
    for (const item of items) {
      await queryTenant(tenantId, `
        INSERT INTO invoice_items (invoice_id, description, item_type, quantity, unit_price, total_price)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [invoice.id, item.description, item.item_type, item.quantity, item.unit_price, item.total_price]);
    }

    res.status(201).json({
      status: 'success',
      message: 'Invoice created',
      data: { id: invoice.id, invoice_number },
    });
  } catch (err) {
    console.error('POST /invoices', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/invoices/check/:consultationId ────────────────────────────────
// Check if a consultation already has an invoice (used by frontend before creating)
router.get('/check/:consultationId', async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId,
      `SELECT id, invoice_number FROM invoices WHERE consultation_id = $1`,
      [req.params.consultationId]);
    res.json({
      status: 'success',
      exists: result.rows.length > 0,
      data:   result.rows[0] || null,
    });
  } catch (err) {
    console.error('GET /invoices/check', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/invoices/patient/:patientId ────────────────────────────────────
router.get('/patient/:patientId', async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId, `
      SELECT i.*,
             p.first_name, p.last_name, p.patient_code,
             s.full_name AS generated_by_name
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      JOIN staff    s ON s.id = i.generated_by
      WHERE i.patient_id = $1
      ORDER BY i.created_at DESC
    `, [req.params.patientId]);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /invoices/patient/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/invoices ───────────────────────────────────────────────────────
// List invoices. Query params: date, status, patient_id, limit
router.get('/', requireRole('admin', 'receptionist', 'doctor'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { date, status, patient_id, limit = 100 } = req.query;

  const conditions = [];
  const params     = [];

  if (date) {
    params.push(date);
    conditions.push(`DATE(i.created_at) = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`i.payment_status = $${params.length}`);
  }
  if (patient_id) {
    params.push(patient_id);
    conditions.push(`i.patient_id = $${params.length}`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(parseInt(limit));

  try {
    const result = await queryTenant(tenantId, `
      SELECT i.id, i.invoice_number, i.payment_status,
             i.total_amount, i.paid_amount, i.balance_due,
             i.created_at, i.patient_id,
             p.first_name, p.last_name, p.patient_code,
             s.full_name AS doctor_name,
             c.id AS consultation_id
      FROM invoices i
      JOIN patients p      ON p.id = i.patient_id
      JOIN staff    s      ON s.id = i.generated_by
      LEFT JOIN consultations c ON c.id = i.consultation_id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${params.length}
    `, params);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /invoices', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/invoices/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const invRes = await queryTenant(tenantId, `
      SELECT i.*,
             p.first_name, p.last_name, p.patient_code, p.phone, p.date_of_birth, p.allergies,
             s.full_name AS generated_by_name,
             ds.full_name AS doctor_name,
             pr.id           AS prescription_id,
             pr.is_dispensed AS prescription_dispensed,
             pr.rx_number    AS prescription_rx_number
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      JOIN staff    s ON s.id = i.generated_by
      LEFT JOIN consultations c  ON c.id  = i.consultation_id
      LEFT JOIN staff ds         ON ds.id = c.doctor_id
      LEFT JOIN prescriptions pr ON pr.consultation_id = c.id
      WHERE i.id = $1
    `, [req.params.id]);
    if (!invRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }

    const invoice = invRes.rows[0];

    const itemsRes = await queryTenant(tenantId,
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY item_type, description`,
      [invoice.id]);

    const splitsRes = await queryTenant(tenantId, `
      SELECT ps.*, s.full_name AS recorded_by_name
      FROM payment_splits ps
      LEFT JOIN staff s ON s.id = ps.recorded_by
      WHERE ps.invoice_id = $1
      ORDER BY ps.recorded_at
    `, [invoice.id]);

    res.json({
      status: 'success',
      data: { ...invoice, items: itemsRes.rows, splits: splitsRes.rows },
    });
  } catch (err) {
    console.error('GET /invoices/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── PUT /api/v1/invoices/:id/items ─────────────────────────────────────────────
// Add a custom line item or remove an existing one
router.put('/:id/items', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { action, item_id, description, item_type = 'service', quantity = 1, unit_price } = req.body;

  try {
    const invRes = await queryTenant(tenantId,
      `SELECT * FROM invoices WHERE id = $1`, [req.params.id]);
    if (!invRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }
    if (invRes.rows[0].payment_status === 'paid') {
      return res.status(400).json({ status: 'error', message: 'Cannot modify a paid invoice' });
    }

    if (action === 'add') {
      if (!description || !unit_price) {
        return res.status(400).json({ status: 'error', message: 'description and unit_price are required' });
      }
      const total_price = parseFloat(quantity) * parseFloat(unit_price);
      await queryTenant(tenantId, `
        INSERT INTO invoice_items (invoice_id, description, item_type, quantity, unit_price, total_price)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [req.params.id, description, item_type, quantity, unit_price, total_price]);
    } else if (action === 'remove') {
      if (!item_id) return res.status(400).json({ status: 'error', message: 'item_id required for remove' });
      await queryTenant(tenantId,
        `DELETE FROM invoice_items WHERE id = $1 AND invoice_id = $2`, [item_id, req.params.id]);
    } else {
      return res.status(400).json({ status: 'error', message: 'action must be add or remove' });
    }

    // Recalculate totals
    const totRes = await queryTenant(tenantId,
      `SELECT COALESCE(SUM(total_price),0) AS subtotal FROM invoice_items WHERE invoice_id = $1`,
      [req.params.id]);
    const subtotal     = parseFloat(totRes.rows[0].subtotal);
    const inv          = invRes.rows[0];
    const total_amount = subtotal - parseFloat(inv.discount_amount || 0) + parseFloat(inv.tax_amount || 0);
    const balance_due  = Math.max(0, total_amount - parseFloat(inv.paid_amount || 0));

    await queryTenant(tenantId, `
      UPDATE invoices SET subtotal=$1, total_amount=$2, balance_due=$3, updated_at=NOW()
      WHERE id=$4
    `, [subtotal, total_amount, balance_due, req.params.id]);

    res.json({ status: 'success', message: 'Invoice updated' });
  } catch (err) {
    console.error('PUT /invoices/:id/items', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/invoices/:id/pay ──────────────────────────────────────────────
// Record a payment (single method — full or partial)
router.post('/:id/pay', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { payment_method, amount, reference } = req.body;

  if (!payment_method || !amount) {
    return res.status(400).json({ status: 'error', message: 'payment_method and amount are required' });
  }

  try {
    const invRes = await queryTenant(tenantId,
      `SELECT * FROM invoices WHERE id = $1`, [req.params.id]);
    if (!invRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }
    const inv = invRes.rows[0];
    if (inv.payment_status === 'paid') {
      return res.status(400).json({ status: 'error', message: 'Invoice is already fully paid' });
    }

    const payAmt  = parseFloat(amount);
    const newPaid = parseFloat(inv.paid_amount || 0) + payAmt;
    const balance = Math.max(0, parseFloat(inv.total_amount) - newPaid);
    const status  = balance <= 0 ? 'paid' : 'partial';

    // Insert split record
    await queryTenant(tenantId, `
      INSERT INTO payment_splits (invoice_id, payment_method, amount, reference, recorded_by)
      VALUES ($1,$2,$3,$4,$5)
    `, [req.params.id, payment_method, payAmt, reference || null, req.user.id]);

    // Update invoice
    await queryTenant(tenantId, `
      UPDATE invoices
      SET paid_amount=$1, balance_due=$2, payment_status=$3,
          payment_method=$4, paid_at=CASE WHEN $6='paid' THEN NOW() ELSE paid_at END,
          updated_at=NOW()
      WHERE id=$5
    `, [newPaid, balance, status, payment_method, req.params.id, status]);

    res.json({
      status: 'success',
      message: 'Payment recorded',
      data: { payment_status: status, balance_due: balance },
    });
  } catch (err) {
    console.error('POST /invoices/:id/pay', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/invoices/:id/pdf ───────────────────────────────────────────────
router.get('/:id/pdf', async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const invRes = await queryTenant(tenantId, `
      SELECT i.*,
             p.first_name, p.last_name, p.patient_code, p.phone, p.date_of_birth, p.allergies,
             s.full_name AS generated_by_name,
             ds.full_name AS doctor_name
      FROM invoices i
      JOIN patients p ON p.id = i.patient_id
      JOIN staff    s ON s.id = i.generated_by
      LEFT JOIN consultations c ON c.id = i.consultation_id
      LEFT JOIN staff ds        ON ds.id = c.doctor_id
      WHERE i.id = $1
    `, [req.params.id]);
    if (!invRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Invoice not found' });
    }

    const invoice = invRes.rows[0];

    const itemsRes = await queryTenant(tenantId,
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY item_type, description`,
      [invoice.id]);

    const splitsRes = await queryTenant(tenantId, `
      SELECT ps.*, s.full_name AS recorded_by_name
      FROM payment_splits ps
      LEFT JOIN staff s ON s.id = ps.recorded_by
      WHERE ps.invoice_id = $1
      ORDER BY ps.recorded_at
    `, [invoice.id]);

    const settingsRes = await queryTenant(tenantId,
      `SELECT * FROM clinic_settings LIMIT 1`, []);
    const settings = settingsRes.rows[0] || {};

    generateInvoicePDF(res, {
      invoice,
      items:        itemsRes.rows,
      splits:       splitsRes.rows,
      settings,
      tenantSchema: tenantId,
    });
  } catch (err) {
    console.error('GET /invoices/:id/pdf', err);
    if (!res.headersSent) {
      res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
    }
  }
});

module.exports = router;
