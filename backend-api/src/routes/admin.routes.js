const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { pool, queryPublic, queryTenant } = require('../config/db');
const { createTenantSchema }             = require('../db/createTenantSchema');
const { adminAuthMiddleware }            = require('../middleware/adminAuth');

// ── POST /api/v1/admin/auth/login ─────────────────────────────────────────────
// Super admin login — credentials stored in .env
router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Email and password required' });
  }

  const adminEmail    = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({ status: 'error', message: 'Super admin credentials not configured' });
  }

  if (email !== adminEmail) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  // Support both bcrypt hash and plain text (plain text for easy setup; use bcrypt in prod)
  let valid = false;
  if (adminPassword.startsWith('$2')) {
    valid = await bcrypt.compare(password, adminPassword);
  } else {
    valid = password === adminPassword;
  }

  if (!valid) {
    return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
  }

  const secret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  const token  = jwt.sign({ role: 'superadmin', email: adminEmail }, secret, { expiresIn: '8h' });

  res.json({
    status: 'success',
    message: 'Login successful',
    data: { token, role: 'superadmin', email: adminEmail },
  });
});

// ── All routes below require super admin JWT ──────────────────────────────────
router.use(adminAuthMiddleware);

// ── GET /api/v1/admin/dashboard ───────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [totals, byStatus, mrr] = await Promise.all([
      queryPublic(`SELECT COUNT(*) AS total FROM public.tenants`),
      queryPublic(`
        SELECT status, COUNT(*) AS count
        FROM   public.tenants
        GROUP  BY status
      `),
      queryPublic(`
        SELECT COALESCE(SUM(amount), 0) AS mrr
        FROM   public.subscriptions
        WHERE  status = 'paid'
          AND  period_start <= CURRENT_DATE
          AND  period_end   >= CURRENT_DATE
      `),
    ]);

    const statusMap = {};
    byStatus.rows.forEach(r => { statusMap[r.status] = parseInt(r.count, 10); });

    res.json({
      status: 'success',
      data: {
        total_clinics:     parseInt(totals.rows[0].total, 10),
        active_clinics:    statusMap.active    || 0,
        trial_clinics:     statusMap.trial     || 0,
        suspended_clinics: statusMap.suspended || 0,
        mrr:               parseFloat(mrr.rows[0].mrr),
      },
    });
  } catch (err) {
    console.error('GET /admin/dashboard', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/admin/tenants ─────────────────────────────────────────────────
router.get('/tenants', async (req, res) => {
  try {
    const { search, status } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (t.clinic_name ILIKE $${params.length} OR t.subdomain ILIKE $${params.length} OR t.owner_email ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      where += ` AND t.status = $${params.length}`;
    }

    const result = await queryPublic(`
      SELECT
        t.id, t.clinic_name, t.subdomain, t.owner_email, t.owner_phone,
        t.plan, t.status, t.trial_ends_at, t.created_at,
        COUNT(f.id) FILTER (WHERE f.enabled = TRUE) AS active_flags
      FROM public.tenants t
      LEFT JOIN public.feature_flags f ON f.tenant_id = t.id
      ${where}
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `, params);

    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /admin/tenants', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/admin/tenants/:id ─────────────────────────────────────────────
router.get('/tenants/:id', async (req, res) => {
  try {
    const tenant = await queryPublic(
      `SELECT * FROM public.tenants WHERE id = $1`, [req.params.id]
    );
    if (!tenant.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }

    const flags = await queryPublic(
      `SELECT module, enabled FROM public.feature_flags WHERE tenant_id = $1`,
      [req.params.id]
    );

    // Get basic usage stats from tenant schema
    const schemaName = `tenant_${tenant.rows[0].subdomain}`;
    let stats = { staff_count: 0, patient_count: 0 };
    try {
      const [staffRes, patientRes] = await Promise.all([
        queryTenant(schemaName, `SELECT COUNT(*) AS c FROM staff WHERE is_active = TRUE`),
        queryTenant(schemaName, `SELECT COUNT(*) AS c FROM patients WHERE is_active = TRUE`),
      ]);
      stats.staff_count   = parseInt(staffRes.rows[0].c, 10);
      stats.patient_count = parseInt(patientRes.rows[0].c, 10);
    } catch { /* schema may not be set up yet */ }

    res.json({
      status: 'success',
      data: {
        ...tenant.rows[0],
        feature_flags: flags.rows,
        stats,
      },
    });
  } catch (err) {
    console.error('GET /admin/tenants/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/admin/tenants ────────────────────────────────────────────────
router.post('/tenants', async (req, res) => {
  const { clinic_name, subdomain, owner_email, owner_phone, plan = 'basic', trial_days = 30 } = req.body;

  if (!clinic_name || !subdomain || !owner_email) {
    return res.status(400).json({ status: 'error', message: 'clinic_name, subdomain, and owner_email are required' });
  }

  // Validate subdomain format
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return res.status(400).json({ status: 'error', message: 'Subdomain can only contain lowercase letters, numbers, and hyphens' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check uniqueness
    const existing = await client.query(
      `SELECT id FROM public.tenants WHERE subdomain = $1 OR owner_email = $2`,
      [subdomain, owner_email]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ status: 'error', message: 'Subdomain or email already in use' });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + parseInt(trial_days, 10));

    const tenantRes = await client.query(
      `INSERT INTO public.tenants (clinic_name, subdomain, owner_email, owner_phone, plan, status, trial_ends_at)
       VALUES ($1,$2,$3,$4,$5,'trial',$6) RETURNING *`,
      [clinic_name, subdomain, owner_email, owner_phone || null, plan, trialEnd]
    );
    const tenant = tenantRes.rows[0];

    // Default feature flags (all OFF)
    const defaultModules = ['pharmacy', 'lab', 'insurance', 'online_booking', 'multi_branch', 'custom_domain'];
    for (const module of defaultModules) {
      await client.query(
        `INSERT INTO public.feature_flags (tenant_id, module, enabled) VALUES ($1,$2,FALSE)`,
        [tenant.id, module]
      );
    }

    // Create tenant schema + tables
    const schemaName = `tenant_${subdomain}`;
    await createTenantSchema(client, schemaName);

    // Insert default clinic_settings
    await client.query(`SET search_path TO "${schemaName}"`);
    await client.query(
      `INSERT INTO clinic_settings (clinic_name, currency, tax_rate, allow_walk_ins)
       VALUES ($1, 'LKR', 0, TRUE)`,
      [clinic_name]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: `Clinic "${clinic_name}" created`,
      data: tenant,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /admin/tenants', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  } finally {
    client.release();
  }
});

// ── PUT /api/v1/admin/tenants/:id ─────────────────────────────────────────────
router.put('/tenants/:id', async (req, res) => {
  const { clinic_name, owner_email, owner_phone, plan } = req.body;
  try {
    const result = await queryPublic(
      `UPDATE public.tenants
       SET clinic_name  = COALESCE($1, clinic_name),
           owner_email  = COALESCE($2, owner_email),
           owner_phone  = COALESCE($3, owner_phone),
           plan         = COALESCE($4, plan),
           updated_at   = NOW()
       WHERE id = $5
       RETURNING *`,
      [clinic_name || null, owner_email || null, owner_phone || null, plan || null, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }
    res.json({ status: 'success', message: 'Clinic updated', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /admin/tenants/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/admin/tenants/:id/suspend ────────────────────────────────────
router.put('/tenants/:id/suspend', async (req, res) => {
  try {
    const result = await queryPublic(
      `UPDATE public.tenants SET status = 'suspended', updated_at = NOW()
       WHERE id = $1 AND status != 'suspended'
       RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found or already suspended' });
    }
    res.json({ status: 'success', message: 'Clinic suspended', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /admin/tenants/:id/suspend', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/admin/tenants/:id/activate ───────────────────────────────────
router.put('/tenants/:id/activate', async (req, res) => {
  try {
    const result = await queryPublic(
      `UPDATE public.tenants SET status = 'active', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }
    res.json({ status: 'success', message: 'Clinic activated', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /admin/tenants/:id/activate', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/admin/tenants/:id/impersonate ───────────────────────────────
// Issues a short-lived JWT scoped to the clinic's first admin staff account.
router.post('/tenants/:id/impersonate', async (req, res) => {
  try {
    const tenant = await queryPublic(
      `SELECT * FROM public.tenants WHERE id = $1`, [req.params.id]
    );
    if (!tenant.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }
    if (tenant.rows[0].status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'Clinic is suspended' });
    }

    const schemaName = `tenant_${tenant.rows[0].subdomain}`;
    const staff = await queryTenant(
      schemaName,
      `SELECT id, full_name, email, role FROM staff WHERE role = 'admin' AND is_active = TRUE LIMIT 1`
    );
    if (!staff.rows.length) {
      return res.status(404).json({ status: 'error', message: 'No admin staff found for this clinic' });
    }

    const s = staff.rows[0];
    const flags = await queryPublic(
      `SELECT module, enabled FROM public.feature_flags WHERE tenant_id = $1`,
      [req.params.id]
    );
    const featureFlags = {};
    flags.rows.forEach(f => { featureFlags[f.module] = f.enabled; });

    const secret = process.env.JWT_SECRET;
    const token  = jwt.sign(
      {
        id:           s.id,
        role:         s.role,
        tenantId:     req.params.id,
        tenantSchema: schemaName,
        impersonated: true,
        impersonatedBy: 'superadmin',
      },
      secret,
      { expiresIn: '2h' }
    );

    res.json({
      status: 'success',
      message: `Impersonation token for ${tenant.rows[0].clinic_name}`,
      data: {
        token,
        subdomain: tenant.rows[0].subdomain,
        clinic_name: tenant.rows[0].clinic_name,
        staff: s,
        feature_flags: featureFlags,
        impersonated: true,
      },
    });
  } catch (err) {
    console.error('POST /admin/tenants/:id/impersonate', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/admin/feature-flags/:tenantId ────────────────────────────────
router.get('/feature-flags/:tenantId', async (req, res) => {
  try {
    const result = await queryPublic(
      `SELECT module, enabled, updated_at FROM public.feature_flags WHERE tenant_id = $1 ORDER BY module`,
      [req.params.tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /admin/feature-flags', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/admin/feature-flags/:tenantId ────────────────────────────────
// Body: { flags: { pharmacy: true, lab: false, ... } }
router.put('/feature-flags/:tenantId', async (req, res) => {
  const { flags } = req.body;
  if (!flags || typeof flags !== 'object') {
    return res.status(400).json({ status: 'error', message: 'flags object required' });
  }

  try {
    const entries = Object.entries(flags);
    for (const [module, enabled] of entries) {
      await queryPublic(
        `INSERT INTO public.feature_flags (tenant_id, module, enabled, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (tenant_id, module) DO UPDATE SET enabled = $3, updated_at = NOW()`,
        [req.params.tenantId, module, Boolean(enabled)]
      );
    }

    const result = await queryPublic(
      `SELECT module, enabled FROM public.feature_flags WHERE tenant_id = $1 ORDER BY module`,
      [req.params.tenantId]
    );
    res.json({ status: 'success', message: 'Feature flags updated', data: result.rows });
  } catch (err) {
    console.error('PUT /admin/feature-flags', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

module.exports = router;
