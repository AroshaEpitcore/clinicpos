const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { queryPublic, queryTenant } = require('../config/db');
const { tenantMiddleware } = require('../middleware/tenant');
const { authMiddleware }   = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/v1/auth/login ──────────────────────────────────────────────────
// Body: { email, password }
// Returns: { token, user, flags, clinic }
router.post('/login', tenantMiddleware, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password are required' });
  }

  try {
    const schema = req.tenantSchema;

    // Find staff by email in this tenant's schema
    const staffResult = await queryTenant(
      schema,
      `SELECT id, full_name, email, password_hash, role, is_active FROM staff WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (staffResult.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Incorrect email or password.' });
    }

    const staff = staffResult.rows[0];

    if (!staff.is_active) {
      return res.status(403).json({ status: 'error', message: 'Your account has been deactivated. Contact your clinic admin.' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) {
      return res.status(401).json({ status: 'error', message: 'Incorrect email or password.' });
    }

    // Load clinic settings
    const settingsResult = await queryTenant(
      schema,
      `SELECT clinic_name, clinic_logo_url, currency FROM clinic_settings LIMIT 1`,
      []
    );
    const clinic = settingsResult.rows[0] || { clinic_name: req.tenant.clinic_name };

    // Sign JWT
    const token = jwt.sign(
      {
        id:           staff.id,
        role:         staff.role,
        tenantId:     req.tenant.id,
        tenantSchema: schema,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id:   staff.id,
          name: staff.full_name,
          email: staff.email,
          role: staff.role,
        },
        flags: req.tenantFlags,
        clinic: {
          name:     clinic.clinic_name,
          logo_url: clinic.clinic_logo_url || null,
          currency: clinic.currency || 'LKR',
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ─── POST /api/v1/auth/logout ─────────────────────────────────────────────────
// Client just deletes the token — no server-side blacklist yet
router.post('/logout', authMiddleware, (req, res) => {
  res.json({ status: 'success', message: 'Logged out successfully' });
});

// ─── GET /api/v1/auth/me ──────────────────────────────────────────────────────
// Returns current user info from the token
router.get('/me', tenantMiddleware, authMiddleware, async (req, res) => {
  try {
    const staffResult = await queryTenant(
      req.tenantSchema,
      `SELECT id, full_name, email, role FROM staff WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );
    if (staffResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    const staff = staffResult.rows[0];
    return res.json({
      status: 'success',
      data: {
        user: { id: staff.id, name: staff.full_name, email: staff.email, role: staff.role },
        flags: req.tenantFlags,
      },
    });
  } catch (err) {
    console.error('Auth/me error:', err);
    return res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
