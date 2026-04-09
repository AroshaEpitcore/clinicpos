const express = require('express');
const { queryTenant }                 = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware);

// ── GET /api/v1/medicines/low-stock ───────────────────────────────────────────
// Must be declared before /:id
router.get('/low-stock', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, name, generic_name, brand, strength, unit, category,
              stock_quantity, reorder_level, selling_price, expiry_date
       FROM medicines
       WHERE is_active = TRUE AND stock_quantity <= reorder_level
       ORDER BY stock_quantity ASC`,
      []
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/medicines/near-expiry ─────────────────────────────────────────
// Medicines expiring within 60 days
router.get('/near-expiry', async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, name, generic_name, brand, strength, unit, category,
              stock_quantity, expiry_date,
              (expiry_date - CURRENT_DATE) AS days_until_expiry
       FROM medicines
       WHERE is_active = TRUE
         AND expiry_date IS NOT NULL
         AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
       ORDER BY expiry_date ASC`,
      []
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── GET /api/v1/medicines ─────────────────────────────────────────────────────
// List with optional search, category, include_inactive
router.get('/', async (req, res) => {
  const { search, category, include_inactive } = req.query;
  try {
    const conditions = [];
    const params = [];

    if (!include_inactive) {
      conditions.push('is_active = TRUE');
    }
    if (search && search.trim().length >= 1) {
      params.push(`%${search.trim().toLowerCase()}%`);
      conditions.push(
        `(LOWER(name) LIKE $${params.length} OR LOWER(generic_name) LIKE $${params.length} OR LOWER(brand) LIKE $${params.length})`
      );
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, name, generic_name, brand, strength, unit, category,
              stock_quantity, reorder_level, selling_price, expiry_date, is_active,
              created_at, updated_at
       FROM medicines
       ${where}
       ORDER BY name ASC`,
      params
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── POST /api/v1/medicines ────────────────────────────────────────────────────
// Admin only
router.post('/', requireRole('admin'), async (req, res) => {
  const {
    name, generic_name, brand, category, unit, strength,
    stock_quantity, reorder_level, selling_price, expiry_date,
  } = req.body;

  if (!name?.trim() || !unit?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Name and unit are required' });
  }

  try {
    const result = await queryTenant(
      req.tenantSchema,
      `INSERT INTO medicines
         (name, generic_name, brand, category, unit, strength,
          stock_quantity, reorder_level, selling_price, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        name.trim(),
        generic_name?.trim() || null,
        brand?.trim()        || null,
        category             || null,
        unit.trim(),
        strength?.trim()     || null,
        stock_quantity  ?? 0,
        reorder_level   ?? 10,
        selling_price   || null,
        expiry_date     || null,
      ]
    );
    res.status(201).json({ status: 'success', message: 'Medicine added', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── PUT /api/v1/medicines/:id ─────────────────────────────────────────────────
// Admin only
router.put('/:id', requireRole('admin'), async (req, res) => {
  const {
    name, generic_name, brand, category, unit, strength,
    stock_quantity, reorder_level, selling_price, expiry_date, is_active,
  } = req.body;

  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE medicines SET
         name           = COALESCE($1,  name),
         generic_name   = $2,
         brand          = $3,
         category       = $4,
         unit           = COALESCE($5,  unit),
         strength       = $6,
         stock_quantity = COALESCE($7,  stock_quantity),
         reorder_level  = COALESCE($8,  reorder_level),
         selling_price  = $9,
         expiry_date    = $10,
         is_active      = COALESCE($11, is_active),
         updated_at     = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        name?.trim()         || null,
        generic_name?.trim() ?? null,
        brand?.trim()        ?? null,
        category             ?? null,
        unit?.trim()         || null,
        strength?.trim()     ?? null,
        stock_quantity       ?? null,
        reorder_level        ?? null,
        selling_price        ?? null,
        expiry_date          || null,
        is_active            ?? null,
        req.params.id,
      ]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Medicine not found' });
    }
    res.json({ status: 'success', message: 'Medicine updated', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ── DELETE /api/v1/medicines/:id ──────────────────────────────────────────────
// Soft delete — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await queryTenant(
      req.tenantSchema,
      `UPDATE medicines SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ status: 'success', message: 'Medicine removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
