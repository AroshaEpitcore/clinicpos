const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { queryTenant } = require('../config/db');
const { tenantMiddleware } = require('../middleware/tenant');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.use(tenantMiddleware);
router.use(authMiddleware);

// ── GET /api/v1/staff ─────────────────────────────────────────────────────────
// Admin only — list all staff for this clinic
router.get('/', requireRole('admin'), async (req, res) => {
  try {
    const result = await queryTenant(
      req.tenantSchema,
      `SELECT id, full_name, email, phone, role, specialization, registration_no, max_patients_per_day, is_active, created_at
       FROM staff
       ORDER BY role, full_name`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /staff', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/staff ────────────────────────────────────────────────────────
// Admin only — create a new staff member
router.post('/', requireRole('admin'), async (req, res) => {
  const { full_name, email, password, role, phone, specialization, registration_no } = req.body;

  const VALID_ROLES = ['doctor', 'nurse', 'receptionist', 'admin'];
  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ status: 'error', message: 'full_name, email, password, and role are required' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ status: 'error', message: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
  }

  try {
    // Check for duplicate email within this clinic
    const existing = await queryTenant(
      req.tenantSchema,
      `SELECT id FROM staff WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    if (existing.rows.length) {
      return res.status(409).json({ status: 'error', message: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await queryTenant(
      req.tenantSchema,
      `INSERT INTO staff (full_name, email, phone, password_hash, role, specialization, registration_no, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING id, full_name, email, phone, role, specialization, registration_no, is_active, created_at`,
      [
        full_name.trim(),
        email.toLowerCase().trim(),
        phone || null,
        password_hash,
        role,
        specialization || null,
        registration_no || null,
      ]
    );

    res.status(201).json({ status: 'success', message: 'Staff member created', data: result.rows[0] });
  } catch (err) {
    console.error('POST /staff', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/staff/:id ─────────────────────────────────────────────────────
// Admin only — update staff details (not password)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { full_name, email, phone, role, specialization, registration_no, max_patients_per_day, is_active } = req.body;

  const VALID_ROLES = ['doctor', 'nurse', 'receptionist', 'admin'];
  if (role && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ status: 'error', message: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }
  if (max_patients_per_day != null && (Number(max_patients_per_day) < 0 || !Number.isInteger(Number(max_patients_per_day)))) {
    return res.status(400).json({ status: 'error', message: 'max_patients_per_day must be a non-negative integer (0 = unlimited)' });
  }

  try {
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE staff
       SET full_name             = COALESCE($1, full_name),
           email                 = COALESCE($2, email),
           phone                 = COALESCE($3, phone),
           role                  = COALESCE($4, role),
           specialization        = COALESCE($5, specialization),
           registration_no       = COALESCE($6, registration_no),
           max_patients_per_day  = COALESCE($7, max_patients_per_day),
           is_active             = COALESCE($8, is_active),
           updated_at            = NOW()
       WHERE id = $9
       RETURNING id, full_name, email, phone, role, specialization, registration_no, max_patients_per_day, is_active, created_at`,
      [
        full_name  || null,
        email      ? email.toLowerCase().trim() : null,
        phone      !== undefined ? phone  : null,
        role       || null,
        specialization  !== undefined ? specialization  : null,
        registration_no !== undefined ? registration_no : null,
        max_patients_per_day != null ? Number(max_patients_per_day) : null,
        is_active  !== undefined ? is_active : null,
        req.params.id,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    res.json({ status: 'success', message: 'Staff updated', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /staff/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/staff/:id/reset-password ─────────────────────────────────────
// Admin only — reset another staff member's password
router.put('/:id/reset-password', requireRole('admin'), async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'new_password must be at least 6 characters' });
  }

  try {
    const hash   = await bcrypt.hash(new_password, 10);
    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE staff SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [hash, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    res.json({ status: 'success', message: 'Password reset successfully' });
  } catch (err) {
    console.error('PUT /staff/:id/reset-password', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── DELETE /api/v1/staff/:id ──────────────────────────────────────────────────
// Admin only — soft-delete (deactivate) a staff member
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    // Prevent admin from deactivating themselves
    if (req.params.id === req.user.id) {
      return res.status(400).json({ status: 'error', message: 'You cannot deactivate your own account' });
    }

    const result = await queryTenant(
      req.tenantSchema,
      `UPDATE staff SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id, full_name`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Staff member not found' });
    }
    res.json({ status: 'success', message: `${result.rows[0].full_name} has been deactivated` });
  } catch (err) {
    console.error('DELETE /staff/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

module.exports = router;
