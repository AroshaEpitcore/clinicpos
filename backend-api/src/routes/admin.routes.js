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
    const [totals, byStatus] = await Promise.all([
      queryPublic(`SELECT COUNT(*) AS total FROM public.tenants`),
      queryPublic(`
        SELECT status, COUNT(*) AS count
        FROM   public.tenants
        GROUP  BY status
      `),
    ]);

    const statusMap = {};
    byStatus.rows.forEach(r => { statusMap[r.status] = parseInt(r.count, 10); });

    res.json({
      status: 'success',
      data: {
        total_clinics:     parseInt(totals.rows[0].total, 10),
        active_clinics:    statusMap.active    || 0,
        suspended_clinics: statusMap.suspended || 0,
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
        t.status, t.created_at,
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
      `SELECT t.*,
              sp.name        AS plan_name,
              sp.monthly_price,
              sp.yearly_price
       FROM public.tenants t
       LEFT JOIN public.subscription_plans sp ON sp.id = t.plan_id
       WHERE t.id = $1`,
      [req.params.id]
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
  const { clinic_name, subdomain, owner_email, owner_phone, initial_password } = req.body;

  if (!clinic_name || !subdomain || !owner_email || !initial_password) {
    return res.status(400).json({ status: 'error', message: 'clinic_name, subdomain, owner_email, and initial_password are required' });
  }
  if (initial_password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Password must be at least 6 characters' });
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

    const tenantRes = await client.query(
      `INSERT INTO public.tenants (clinic_name, subdomain, owner_email, owner_phone, status)
       VALUES ($1,$2,$3,$4,'active') RETURNING *`,
      [clinic_name, subdomain, owner_email, owner_phone || null]
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

    // Create the first admin staff account for this clinic
    const passwordHash = await bcrypt.hash(initial_password, 10);
    await client.query(
      `INSERT INTO staff (full_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, 'admin', TRUE)`,
      ['Admin', owner_email, passwordHash]
    );

    await client.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: `Clinic "${clinic_name}" created`,
      data: {
        tenant,
        login: {
          url: `https://${subdomain}.healthcenter.lk`,
          email: owner_email,
          password: initial_password,
        },
      },
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
  const { clinic_name, owner_email, owner_phone } = req.body;
  try {
    const result = await queryPublic(
      `UPDATE public.tenants
       SET clinic_name  = COALESCE($1, clinic_name),
           owner_email  = COALESCE($2, owner_email),
           owner_phone  = COALESCE($3, owner_phone),
           updated_at   = NOW()
       WHERE id = $4
       RETURNING *`,
      [clinic_name || null, owner_email || null, owner_phone || null, req.params.id]
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

    const settingsRes = await queryTenant(schemaName, `SELECT clinic_logo_url, currency FROM clinic_settings LIMIT 1`);
    const clinicSettings = settingsRes.rows[0] || {};

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
        subdomain:   tenant.rows[0].subdomain,
        clinic_name: tenant.rows[0].clinic_name,
        logo_url:    clinicSettings.clinic_logo_url || null,
        currency:    clinicSettings.currency        || 'LKR',
        staff:         s,
        feature_flags: featureFlags,
        impersonated:  true,
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

// ── GET /api/v1/admin/plans ───────────────────────────────────────────────────
router.get('/plans', async (req, res) => {
  try {
    const result = await queryPublic(
      `SELECT * FROM public.subscription_plans ORDER BY monthly_price ASC`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /admin/plans', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/admin/plans ──────────────────────────────────────────────────
router.post('/plans', async (req, res) => {
  const { name, description, monthly_price, yearly_price } = req.body;
  if (!name || monthly_price == null || yearly_price == null) {
    return res.status(400).json({ status: 'error', message: 'name, monthly_price, and yearly_price are required' });
  }
  try {
    const result = await queryPublic(
      `INSERT INTO public.subscription_plans (name, description, monthly_price, yearly_price)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description || null, monthly_price, yearly_price]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'A plan with that name already exists' });
    }
    console.error('POST /admin/plans', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/admin/plans/:id ───────────────────────────────────────────────
router.put('/plans/:id', async (req, res) => {
  const { name, description, monthly_price, yearly_price, is_active } = req.body;
  try {
    const result = await queryPublic(
      `UPDATE public.subscription_plans
       SET name          = COALESCE($1, name),
           description   = COALESCE($2, description),
           monthly_price = COALESCE($3, monthly_price),
           yearly_price  = COALESCE($4, yearly_price),
           is_active     = COALESCE($5, is_active),
           updated_at    = NOW()
       WHERE id = $6
       RETURNING *`,
      [name || null, description ?? null, monthly_price ?? null, yearly_price ?? null, is_active ?? null, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Plan not found' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /admin/plans/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── DELETE /api/v1/admin/plans/:id (soft-delete) ──────────────────────────────
router.delete('/plans/:id', async (req, res) => {
  try {
    const result = await queryPublic(
      `UPDATE public.subscription_plans SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Plan not found' });
    }
    res.json({ status: 'success', message: 'Plan deactivated' });
  } catch (err) {
    console.error('DELETE /admin/plans/:id', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/admin/tenants/:id/subscription ────────────────────────────────
// Body: { plan_id, start_date (YYYY-MM-DD) }
// plan_type is auto-derived from the plan's billing_cycle
router.put('/tenants/:id/subscription', async (req, res) => {
  const { plan_id, start_date } = req.body;
  if (!plan_id || !start_date) {
    return res.status(400).json({ status: 'error', message: 'plan_id and start_date are required' });
  }

  try {
    // Verify plan exists and get billing_cycle
    const planRes = await queryPublic(
      `SELECT * FROM public.subscription_plans WHERE id = $1 AND is_active = TRUE`, [plan_id]
    );
    if (!planRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Plan not found or inactive' });
    }

    const plan_type = planRes.rows[0].billing_cycle || 'monthly';

    // Calculate end date based on the plan's own billing_cycle
    const start = new Date(start_date);
    const end   = new Date(start);
    if (plan_type === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    const end_date = end.toISOString().split('T')[0];

    const result = await queryPublic(
      `UPDATE public.tenants
       SET plan_id            = $1,
           plan_type          = $2,
           subscription_start = $3,
           subscription_end   = $4,
           status             = 'active',
           updated_at         = NOW()
       WHERE id = $5
       RETURNING *`,
      [plan_id, plan_type, start_date, end_date, req.params.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }
    res.json({
      status: 'success',
      message: 'Subscription assigned',
      data: { ...result.rows[0], plan: planRes.rows[0] },
    });
  } catch (err) {
    console.error('PUT /admin/tenants/:id/subscription', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/admin/tenants/:id/renew ─────────────────────────────────────
// Extends the subscription from the current end date (or today if expired)
router.post('/tenants/:id/renew', async (req, res) => {
  try {
    const tenantRes = await queryPublic(
      `SELECT t.*, sp.name AS plan_name, sp.billing_cycle AS plan_billing_cycle, sp.monthly_price, sp.yearly_price
       FROM public.tenants t
       LEFT JOIN public.subscription_plans sp ON sp.id = t.plan_id
       WHERE t.id = $1`,
      [req.params.id]
    );
    if (!tenantRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }

    const tenant = tenantRes.rows[0];
    if (!tenant.plan_id || !tenant.plan_type) {
      return res.status(400).json({ status: 'error', message: 'Clinic has no active plan. Assign a plan first.' });
    }

    const today   = new Date().toISOString().split('T')[0];
    const current = tenant.subscription_end ? new Date(tenant.subscription_end).toISOString().split('T')[0] : null;

    // New start = the day after current end, or today if expired/no end
    let newStart;
    if (current && current >= today) {
      const d = new Date(current);
      d.setDate(d.getDate() + 1);
      newStart = d.toISOString().split('T')[0];
    } else {
      newStart = today;
    }

    const newEnd = new Date(newStart);
    if (tenant.plan_type === 'monthly') {
      newEnd.setMonth(newEnd.getMonth() + 1);
    } else {
      newEnd.setFullYear(newEnd.getFullYear() + 1);
    }
    const newEndStr = newEnd.toISOString().split('T')[0];

    const result = await queryPublic(
      `UPDATE public.tenants
       SET subscription_start = $1,
           subscription_end   = $2,
           status             = 'active',
           updated_at         = NOW()
       WHERE id = $3
       RETURNING *`,
      [newStart, newEndStr, req.params.id]
    );
    res.json({
      status: 'success',
      message: 'Subscription renewed',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('POST /admin/tenants/:id/renew', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/admin/subscriptions ──────────────────────────────────────────
// All clinics with subscription info — for the subscriptions overview page
router.get('/subscriptions', async (req, res) => {
  try {
    const result = await queryPublic(`
      SELECT
        t.id, t.clinic_name, t.subdomain, t.owner_email, t.status,
        t.plan_type, t.subscription_start, t.subscription_end,
        sp.id            AS plan_id,
        sp.name          AS plan_name,
        sp.billing_cycle AS plan_billing_cycle,
        sp.monthly_price,
        sp.yearly_price,
        (t.subscription_end::date - CURRENT_DATE) AS days_remaining
      FROM public.tenants t
      LEFT JOIN public.subscription_plans sp ON sp.id = t.plan_id
      ORDER BY t.subscription_end ASC NULLS LAST, t.clinic_name ASC
    `);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /admin/subscriptions', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/admin/platform ────────────────────────────────────────────────
router.get('/platform', async (req, res) => {
  try {
    const result = await queryPublic(`SELECT key, value FROM public.platform_settings`);
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json({ status: 'success', data: settings });
  } catch (err) {
    console.error('GET /admin/platform', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── PUT /api/v1/admin/platform ────────────────────────────────────────────────
// Body: { key: 'landing_page_enabled', value: 'true' | 'false' }
router.put('/platform', async (req, res) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    return res.status(400).json({ status: 'error', message: 'key and value required' });
  }
  try {
    await queryPublic(
      `INSERT INTO public.platform_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, String(value)]
    );
    res.json({ status: 'success', message: 'Setting updated' });
  } catch (err) {
    console.error('PUT /admin/platform', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
