const router = require('express').Router();
const { queryTenant } = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(authMiddleware);

// ── GET /api/v1/custom-services ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  const tenantId = req.tenant.id;
  const { include_inactive } = req.query;
  try {
    const result = await queryTenant(tenantId, `
      SELECT * FROM custom_services
      WHERE ($1::boolean OR is_active = TRUE)
      ORDER BY category, name
    `, [include_inactive === 'true']);
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /custom-services', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── POST /api/v1/custom-services ─────────────────────────────────────────────
router.post('/', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenant.id;
  const { name, category, description, price } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    const result = await queryTenant(tenantId, `
      INSERT INTO custom_services (name, category, description, price, created_by)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [name, category || null, description || null, price || 0, req.user.id]);
    res.status(201).json({ message: 'Service created', data: result.rows[0] });
  } catch (err) {
    console.error('POST /custom-services', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /api/v1/custom-services/:id ──────────────────────────────────────────
router.put('/:id', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenant.id;
  const { name, category, description, price, is_active } = req.body;
  try {
    await queryTenant(tenantId, `
      UPDATE custom_services SET
        name        = COALESCE($1, name),
        category    = COALESCE($2, category),
        description = COALESCE($3, description),
        price       = COALESCE($4, price),
        is_active   = COALESCE($5, is_active),
        updated_at  = NOW()
      WHERE id = $6
    `, [name || null, category || null, description || null,
        price != null ? price : null, is_active != null ? is_active : null,
        req.params.id]);
    res.json({ message: 'Service updated' });
  } catch (err) {
    console.error('PUT /custom-services/:id', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── DELETE /api/v1/custom-services/:id ───────────────────────────────────────
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenant.id;
  try {
    await queryTenant(tenantId,
      `UPDATE custom_services SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]);
    res.json({ message: 'Service removed' });
  } catch (err) {
    console.error('DELETE /custom-services/:id', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
