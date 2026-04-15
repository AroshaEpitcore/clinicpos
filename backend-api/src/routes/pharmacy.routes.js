const express = require('express');
const { queryTenant }                          = require('../config/db');
const { authMiddleware, requireRole }          = require('../middleware/auth');
const { tenantMiddleware, requireFeature }     = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware, requireFeature('pharmacy'));

// ─── helpers ─────────────────────────────────────────────────────────────────

async function nextPoNumber(schema) {
  const r = await queryTenant(schema, `SELECT COUNT(*) FROM purchase_orders`, []);
  const n = parseInt(r.rows[0].count, 10) + 1;
  return `PO-${String(n).padStart(5, '0')}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// SUPPLIERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/pharmacy/suppliers
router.get('/suppliers', async (req, res) => {
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT id, name, contact, phone, email, address, is_active, created_at
       FROM suppliers
       ORDER BY name ASC`,
      []
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/v1/pharmacy/suppliers   (admin)
router.post('/suppliers', requireRole('admin'), async (req, res) => {
  const { name, contact, phone, email, address } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Supplier name is required' });
  }
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `INSERT INTO suppliers (name, contact, phone, email, address)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), contact?.trim() || null, phone?.trim() || null, email?.trim() || null, address?.trim() || null]
    );
    res.status(201).json({ status: 'success', message: `'${name}' created successfully`, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/v1/pharmacy/suppliers/:id   (admin)
router.put('/suppliers/:id', requireRole('admin'), async (req, res) => {
  const { name, contact, phone, email, address, is_active } = req.body;
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `UPDATE suppliers SET
         name       = COALESCE($1, name),
         contact    = $2,
         phone      = $3,
         email      = $4,
         address    = $5,
         is_active  = COALESCE($6, is_active),
         updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name?.trim() || null, contact?.trim() ?? null, phone?.trim() ?? null,
       email?.trim() ?? null, address?.trim() ?? null, is_active ?? null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Supplier not found' });
    res.json({ status: 'success', message: 'Changes saved successfully', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/v1/pharmacy/suppliers/:id   (admin — soft delete)
router.delete('/suppliers/:id', requireRole('admin'), async (req, res) => {
  try {
    await queryTenant(
      req.tenantSchema,
      `UPDATE suppliers SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/pharmacy/purchase-orders
router.get('/purchase-orders', async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let where = '';
    if (status) {
      params.push(status);
      where = `WHERE po.status = $1`;
    }
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT po.id, po.po_number, po.status, po.order_date, po.received_date,
              po.total_cost, po.notes, po.created_at,
              s.name AS supplier_name,
              st.full_name AS created_by_name,
              (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) AS item_count
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN staff st ON po.created_by = st.id
       ${where}
       ORDER BY po.created_at DESC`,
      params
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/v1/pharmacy/purchase-orders/:id
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const poRes = await queryTenant(
      req.tenantSchema,
      `SELECT po.*, s.name AS supplier_name,
              st.full_name AS created_by_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN staff st ON po.created_by = st.id
       WHERE po.id = $1`,
      [req.params.id]
    );
    if (!poRes.rows.length) return res.status(404).json({ status: 'error', message: 'Purchase order not found' });

    const itemsRes = await queryTenant(
      req.tenantSchema,
      `SELECT poi.*, m.name AS medicine_name, m.unit, m.strength, m.generic_name
       FROM purchase_order_items poi
       JOIN medicines m ON poi.medicine_id = m.id
       WHERE poi.po_id = $1
       ORDER BY m.name ASC`,
      [req.params.id]
    );

    res.json({ status: 'success', data: { ...poRes.rows[0], items: itemsRes.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/v1/pharmacy/purchase-orders   (admin/receptionist)
router.post('/purchase-orders', requireRole('admin', 'receptionist'), async (req, res) => {
  const { supplier_id, order_date, notes, items } = req.body;

  if (!items?.length) {
    return res.status(400).json({ status: 'error', message: 'At least one item is required' });
  }

  const client = await require('../config/db').pool.connect();
  try {
    await client.query(`SET search_path TO ${req.tenantSchema}, public`);
    await client.query('BEGIN');

    const po_number = await nextPoNumber(req.tenantSchema);
    const totalCost = items.reduce((sum, it) => sum + ((it.cost_price || 0) * (it.quantity_ordered || 0)), 0);

    const poRes = await client.query(
      `INSERT INTO purchase_orders (po_number, supplier_id, order_date, notes, total_cost, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [po_number, supplier_id || null, order_date || new Date().toISOString().split('T')[0],
       notes?.trim() || null, totalCost, req.user.id]
    );
    const po = poRes.rows[0];

    for (const it of items) {
      await client.query(
        `INSERT INTO purchase_order_items (po_id, medicine_id, quantity_ordered, cost_price)
         VALUES ($1, $2, $3, $4)`,
        [po.id, it.medicine_id, it.quantity_ordered, it.cost_price || null]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ status: 'success', message: `'${po_number}' created successfully`, data: po });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  } finally {
    client.release();
  }
});

// PUT /api/v1/pharmacy/purchase-orders/:id/receive
// Marks PO as received, adds stock to each medicine
router.put('/purchase-orders/:id/receive', requireRole('admin', 'receptionist'), async (req, res) => {
  const { items } = req.body; // [{ id: poi_id, quantity_received }]

  const client = await require('../config/db').pool.connect();
  try {
    await client.query(`SET search_path TO ${req.tenantSchema}, public`);
    await client.query('BEGIN');

    // Verify PO exists and is not already received
    const poRes = await client.query(`SELECT * FROM purchase_orders WHERE id = $1`, [req.params.id]);
    if (!poRes.rows.length) throw new Error('PO_NOT_FOUND');
    if (poRes.rows[0].status === 'received') throw new Error('ALREADY_RECEIVED');

    // Update each item and add to medicine stock
    for (const it of items) {
      const qty = parseInt(it.quantity_received, 10) || 0;
      if (qty < 0) continue;

      // Get medicine_id for this item
      const itemRes = await client.query(
        `UPDATE purchase_order_items
         SET quantity_received = $1
         WHERE id = $2
         RETURNING medicine_id`,
        [qty, it.id]
      );
      if (!itemRes.rows.length) continue;

      // Add to medicine stock
      if (qty > 0) {
        await client.query(
          `UPDATE medicines SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE id = $2`,
          [qty, itemRes.rows[0].medicine_id]
        );
      }
    }

    // Mark PO as received
    await client.query(
      `UPDATE purchase_orders SET status = 'received', received_date = CURRENT_DATE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Stock updated — purchase order received' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message === 'PO_NOT_FOUND') return res.status(404).json({ status: 'error', message: 'Purchase order not found' });
    if (err.message === 'ALREADY_RECEIVED') return res.status(409).json({ status: 'error', message: 'This order has already been received' });
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// DISPENSE QUEUE
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/pharmacy/dispense?date=YYYY-MM-DD
// Returns prescriptions for the date that are not yet dispensed
router.get('/dispense', async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT rx.id, rx.rx_number, rx.is_dispensed, rx.dispensed_at,
              rx.created_at,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_code,
              p.allergies,
              d.full_name AS doctor_name,
              dp.full_name AS dispensed_by_name,
              (
                SELECT json_agg(json_build_object(
                  'id',           pi.id,
                  'medicine_id',  pi.medicine_id,
                  'medicine_name',m.name,
                  'strength',     m.strength,
                  'unit',         m.unit,
                  'stock',        m.stock_quantity,
                  'dosage',       pi.dosage,
                  'frequency',    pi.frequency,
                  'duration',     pi.duration,
                  'quantity_given', pi.quantity_given
                ))
                FROM prescription_items pi
                JOIN medicines m ON pi.medicine_id = m.id
                WHERE pi.prescription_id = rx.id
              ) AS items
       FROM prescriptions rx
       JOIN patients p ON rx.patient_id = p.id
       JOIN staff d ON rx.doctor_id = d.id
       LEFT JOIN staff dp ON rx.dispensed_by = dp.id
       WHERE DATE(rx.created_at) = $1
       ORDER BY rx.is_dispensed ASC, rx.created_at ASC`,
      [date]
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/v1/pharmacy/dispense/:prescriptionId
// Marks prescription as dispensed and deducts stock
router.post('/dispense/:prescriptionId', async (req, res) => {
  const client = await require('../config/db').pool.connect();
  try {
    await client.query(`SET search_path TO ${req.tenantSchema}, public`);
    await client.query('BEGIN');

    // Verify prescription exists and not already dispensed
    const rxRes = await client.query(
      `SELECT id, is_dispensed FROM prescriptions WHERE id = $1`,
      [req.params.prescriptionId]
    );
    if (!rxRes.rows.length) throw new Error('RX_NOT_FOUND');
    if (rxRes.rows[0].is_dispensed) throw new Error('ALREADY_DISPENSED');

    // Get all prescription items with medicine stock
    const itemsRes = await client.query(
      `SELECT pi.medicine_id, pi.quantity_given, m.name, m.stock_quantity
       FROM prescription_items pi
       JOIN medicines m ON pi.medicine_id = m.id
       WHERE pi.prescription_id = $1`,
      [req.params.prescriptionId]
    );

    // Check for insufficient stock
    const lowStock = itemsRes.rows.filter(it => (it.quantity_given || 1) > it.stock_quantity);
    if (lowStock.length > 0) {
      throw new Error(`INSUFFICIENT_STOCK:${lowStock.map(s => s.name).join(', ')}`);
    }

    // Deduct stock for each item
    for (const it of itemsRes.rows) {
      const qty = it.quantity_given || 1;
      await client.query(
        `UPDATE medicines SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2`,
        [qty, it.medicine_id]
      );
    }

    // Mark prescription as dispensed
    await client.query(
      `UPDATE prescriptions SET is_dispensed = TRUE, dispensed_at = NOW(), dispensed_by = $1 WHERE id = $2`,
      [req.user.id, req.params.prescriptionId]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', message: 'Prescription dispensed — stock updated' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message === 'RX_NOT_FOUND') return res.status(404).json({ status: 'error', message: 'Prescription not found' });
    if (err.message === 'ALREADY_DISPENSED') return res.status(409).json({ status: 'error', message: 'This prescription has already been dispensed' });
    if (err.message?.startsWith('INSUFFICIENT_STOCK:')) {
      const names = err.message.replace('INSUFFICIENT_STOCK:', '');
      return res.status(409).json({ status: 'error', message: `Insufficient stock for: ${names}` });
    }
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  } finally {
    client.release();
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// STOCK ADJUSTMENTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/pharmacy/stock-adjustments?medicine_id=&limit=50
router.get('/stock-adjustments', async (req, res) => {
  const { medicine_id, limit = 50 } = req.query;
  try {
    const params = [parseInt(limit, 10)];
    let where = '';
    if (medicine_id) {
      params.push(medicine_id);
      where = `AND sa.medicine_id = $${params.length}`;
    }
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT sa.id, sa.type, sa.quantity, sa.reason, sa.created_at,
              m.name AS medicine_name, m.unit,
              s.full_name AS adjusted_by_name
       FROM stock_adjustments sa
       JOIN medicines m ON sa.medicine_id = m.id
       JOIN staff s ON sa.adjusted_by = s.id
       WHERE 1=1 ${where}
       ORDER BY sa.created_at DESC
       LIMIT $1`,
      params
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/v1/pharmacy/stock-adjustments
router.post('/stock-adjustments', requireRole('admin', 'receptionist'), async (req, res) => {
  const { medicine_id, type, quantity, reason } = req.body;

  if (!medicine_id || !type || !quantity) {
    return res.status(400).json({ status: 'error', message: 'Medicine, type, and quantity are required' });
  }

  const VALID_TYPES = ['add', 'remove', 'damaged', 'expired'];
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ status: 'error', message: 'Invalid adjustment type' });
  }

  const qty = parseInt(quantity, 10);
  if (qty <= 0) {
    return res.status(400).json({ status: 'error', message: 'Quantity must be a positive number' });
  }

  const client = await require('../config/db').pool.connect();
  try {
    await client.query(`SET search_path TO ${req.tenantSchema}, public`);
    await client.query('BEGIN');

    // Update medicine stock (add increases, all others decrease)
    const delta = type === 'add' ? qty : -qty;
    const medRes = await client.query(
      `UPDATE medicines
       SET stock_quantity = GREATEST(0, stock_quantity + $1), updated_at = NOW()
       WHERE id = $2
       RETURNING name, stock_quantity`,
      [delta, medicine_id]
    );
    if (!medRes.rows.length) throw new Error('MED_NOT_FOUND');

    // Record the adjustment
    await client.query(
      `INSERT INTO stock_adjustments (medicine_id, type, quantity, reason, adjusted_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [medicine_id, type, qty, reason?.trim() || null, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({
      status: 'success',
      message: 'Changes saved successfully',
      data: { medicine_name: medRes.rows[0].name, new_stock: medRes.rows[0].stock_quantity }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message === 'MED_NOT_FOUND') return res.status(404).json({ status: 'error', message: 'Medicine not found' });
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  } finally {
    client.release();
  }
});

module.exports = router;
