const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { queryTenant, queryPublic }    = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

router.use(tenantMiddleware, authMiddleware);

// ── Multer setup ──────────────────────────────────────────────────────────────
function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join('uploads', 'tenants', req.tenantSchema, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      // subdir '' → logo file; subdir 'signatures' → staffId.ext
      const base = subdir === 'signatures'
        ? (req.params.staffId || Date.now())
        : subdir === 'hero'
          ? `hero_${Date.now()}`
          : `logo_${Date.now()}`;
      cb(null, `${base}${ext}`);
    },
  });
}

const imageFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/jpg', 'image/png'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG and PNG files are allowed'), false);
  }
};

const uploadLogo      = multer({ storage: makeStorage(''),           fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const uploadSignature = multer({ storage: makeStorage('signatures'), fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const uploadHero      = multer({ storage: makeStorage('hero'),       fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadQr        = multer({ storage: makeStorage('qr'),         fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// ── GET /api/v1/settings ──────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId, `SELECT * FROM clinic_settings LIMIT 1`);
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Settings not found' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error('GET /settings', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── PUT /api/v1/settings ──────────────────────────────────────────────────────
router.put('/', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const {
    clinic_name, clinic_address, clinic_phone, clinic_email,
    receipt_header, receipt_footer, prescription_footer,
    currency, tax_rate, tax_label,
    appointment_slot_duration, max_patients_per_day, allow_walk_ins,
    reminder_enabled, reminder_hours_before, reminder_message,
    session_timeout_minutes, patient_portal_enabled, queue_display_enabled,
    website_enabled, website_tagline, website_about, website_hours,
    website_map_url, website_whatsapp, website_facebook, website_hero_url,
  } = req.body;

  try {
    await queryTenant(tenantId, `
      UPDATE clinic_settings SET
        clinic_name               = COALESCE($1,  clinic_name),
        clinic_address            = COALESCE($2,  clinic_address),
        clinic_phone              = COALESCE($3,  clinic_phone),
        clinic_email              = COALESCE($4,  clinic_email),
        receipt_header            = COALESCE($5,  receipt_header),
        receipt_footer            = COALESCE($6,  receipt_footer),
        prescription_footer       = COALESCE($7,  prescription_footer),
        currency                  = COALESCE($8,  currency),
        tax_rate                  = COALESCE($9,  tax_rate),
        tax_label                 = COALESCE($10, tax_label),
        appointment_slot_duration = COALESCE($11, appointment_slot_duration),
        max_patients_per_day      = COALESCE($12, max_patients_per_day),
        allow_walk_ins            = COALESCE($13, allow_walk_ins),
        reminder_enabled          = COALESCE($14, reminder_enabled),
        reminder_hours_before     = COALESCE($15, reminder_hours_before),
        reminder_message          = COALESCE($16, reminder_message),
        session_timeout_minutes   = COALESCE($17, session_timeout_minutes),
        patient_portal_enabled    = COALESCE($18, patient_portal_enabled),
        queue_display_enabled     = COALESCE($19, queue_display_enabled),
        website_enabled           = COALESCE($20, website_enabled),
        website_tagline           = COALESCE($21, website_tagline),
        website_about             = COALESCE($22, website_about),
        website_hours             = COALESCE($23, website_hours),
        website_map_url           = COALESCE($24, website_map_url),
        website_whatsapp          = COALESCE($25, website_whatsapp),
        website_facebook          = COALESCE($26, website_facebook),
        website_hero_url          = COALESCE($27, website_hero_url),
        updated_at                = NOW()
    `, [
      clinic_name    || null, clinic_address  || null, clinic_phone  || null, clinic_email  || null,
      receipt_header || null, receipt_footer  || null, prescription_footer || null,
      currency       || null, tax_rate        != null ? tax_rate  : null,
      tax_label      || null,
      appointment_slot_duration != null ? appointment_slot_duration : null,
      max_patients_per_day      != null ? max_patients_per_day      : null,
      allow_walk_ins            != null ? allow_walk_ins            : null,
      reminder_enabled          != null ? reminder_enabled          : null,
      reminder_hours_before     != null ? reminder_hours_before     : null,
      reminder_message          || null,
      session_timeout_minutes   != null ? session_timeout_minutes   : null,
      patient_portal_enabled    != null ? patient_portal_enabled    : null,
      queue_display_enabled     != null ? queue_display_enabled     : null,
      website_enabled           != null ? website_enabled           : null,
      website_tagline           || null,
      website_about             || null,
      website_hours             || null,
      website_map_url           || null,
      website_whatsapp          || null,
      website_facebook          || null,
      website_hero_url          || null,
    ]);

    // Keep public.tenants in sync when clinic_name changes
    if (clinic_name && req.tenant?.id) {
      await queryPublic(
        `UPDATE public.tenants SET clinic_name = $1, updated_at = NOW() WHERE id = $2`,
        [clinic_name, req.tenant.id]
      );
    }

    const result = await queryTenant(tenantId, `SELECT * FROM clinic_settings LIMIT 1`);
    res.json({ status: 'success', message: 'Settings saved', data: result.rows[0] });
  } catch (err) {
    console.error('PUT /settings', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/settings/logo ────────────────────────────────────────────────
router.post('/logo', requireRole('admin'), (req, res, next) => {
  uploadLogo.single('logo')(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    const tenantId = req.tenantSchema;
    const url = `/uploads/tenants/${tenantId}/${req.file.filename}`;

    try {
      // Fetch old filename so we can delete it after the update
      const old = await queryTenant(tenantId, `SELECT clinic_logo_filename FROM clinic_settings LIMIT 1`);
      const oldFilename = old.rows[0]?.clinic_logo_filename;

      await queryTenant(tenantId, `
        UPDATE clinic_settings
        SET clinic_logo_url = $1, clinic_logo_filename = $2, updated_at = NOW()
      `, [url, req.file.filename]);

      // Delete the old file so disk doesn't accumulate stale logos
      if (oldFilename && oldFilename !== req.file.filename) {
        const oldPath = path.join('uploads', 'tenants', tenantId, oldFilename);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
      }

      res.json({ status: 'success', message: 'Logo uploaded', data: { url } });
    } catch (dbErr) {
      console.error('POST /settings/logo', dbErr);
      res.status(500).json({ status: 'error', message: 'Server error', detail: dbErr.message });
    }
  });
});

// ── DELETE /api/v1/settings/logo ─────────────────────────────────────────────
router.delete('/logo', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId,
      `SELECT clinic_logo_filename FROM clinic_settings LIMIT 1`);
    const filename = result.rows[0]?.clinic_logo_filename;

    if (filename) {
      const filePath = path.join('uploads', 'tenants', tenantId, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await queryTenant(tenantId, `
      UPDATE clinic_settings SET clinic_logo_url = NULL, clinic_logo_filename = NULL, updated_at = NOW()
    `);
    res.json({ status: 'success', message: 'Logo removed' });
  } catch (err) {
    console.error('DELETE /settings/logo', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/settings/staff/:staffId/signature ───────────────────────────
router.post('/staff/:staffId/signature', requireRole('admin'), (req, res) => {
  uploadSignature.single('signature')(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    const tenantId = req.tenantSchema;
    const url = `/uploads/tenants/${tenantId}/signatures/${req.file.filename}`;

    try {
      await queryTenant(tenantId,
        `UPDATE staff SET signature_url = $1, updated_at = NOW() WHERE id = $2`,
        [url, req.params.staffId]);
      res.json({ status: 'success', message: 'Signature uploaded', data: { url } });
    } catch (dbErr) {
      console.error('POST /settings/staff/:id/signature', dbErr);
      res.status(500).json({ status: 'error', message: 'Server error', detail: dbErr.message });
    }
  });
});

// ── DELETE /api/v1/settings/staff/:staffId/signature ─────────────────────────
router.delete('/staff/:staffId/signature', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId,
      `SELECT signature_url FROM staff WHERE id = $1`, [req.params.staffId]);
    const url = result.rows[0]?.signature_url;

    if (url) {
      const filePath = path.join(url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await queryTenant(tenantId,
      `UPDATE staff SET signature_url = NULL, updated_at = NOW() WHERE id = $1`,
      [req.params.staffId]);
    res.json({ status: 'success', message: 'Signature removed' });
  } catch (err) {
    console.error('DELETE /settings/staff/:id/signature', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/settings/qr-image ───────────────────────────────────────────
router.post('/qr-image', requireRole('admin'), (req, res) => {
  uploadQr.single('qr')(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    const tenantId = req.tenantSchema;
    const url = `/uploads/tenants/${tenantId}/qr/${req.file.filename}`;

    try {
      const old = await queryTenant(tenantId, `SELECT qr_image_filename FROM clinic_settings LIMIT 1`);
      const oldFilename = old.rows[0]?.qr_image_filename;

      await queryTenant(tenantId, `
        UPDATE clinic_settings SET qr_image_url = $1, qr_image_filename = $2, updated_at = NOW()
      `, [url, req.file.filename]);

      if (oldFilename && oldFilename !== req.file.filename) {
        const oldPath = path.join('uploads', 'tenants', tenantId, 'qr', oldFilename);
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
      }

      res.json({ status: 'success', message: 'QR image uploaded', data: { url } });
    } catch (dbErr) {
      console.error('POST /settings/qr-image', dbErr);
      res.status(500).json({ status: 'error', message: 'Server error', detail: dbErr.message });
    }
  });
});

// ── DELETE /api/v1/settings/qr-image ─────────────────────────────────────────
router.delete('/qr-image', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId,
      `SELECT qr_image_filename FROM clinic_settings LIMIT 1`);
    const filename = result.rows[0]?.qr_image_filename;

    if (filename) {
      const filePath = path.join('uploads', 'tenants', tenantId, 'qr', filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await queryTenant(tenantId, `
      UPDATE clinic_settings SET qr_image_url = NULL, qr_image_filename = NULL, updated_at = NOW()
    `);
    res.json({ status: 'success', message: 'QR image removed' });
  } catch (err) {
    console.error('DELETE /settings/qr-image', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── POST /api/v1/settings/hero-image ─────────────────────────────────────────
router.post('/hero-image', requireRole('admin'), (req, res) => {
  uploadHero.single('hero')(req, res, async (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No file uploaded' });

    const tenantId = req.tenantSchema;
    const url = `/uploads/tenants/${tenantId}/hero/${req.file.filename}`;

    try {
      const old = await queryTenant(tenantId, `SELECT website_hero_url FROM clinic_settings LIMIT 1`);
      const oldUrl = old.rows[0]?.website_hero_url;
      if (oldUrl && oldUrl.startsWith('/uploads/')) {
        const oldPath = path.join(oldUrl.replace(/^\//, ''));
        try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
      }

      await queryTenant(tenantId, `
        UPDATE clinic_settings SET website_hero_url = $1, updated_at = NOW()
      `, [url]);

      res.json({ status: 'success', message: 'Hero image uploaded', data: { url } });
    } catch (dbErr) {
      console.error('POST /settings/hero-image', dbErr);
      res.status(500).json({ status: 'error', message: 'Server error', detail: dbErr.message });
    }
  });
});

// ── DELETE /api/v1/settings/hero-image ───────────────────────────────────────
router.delete('/hero-image', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId, `SELECT website_hero_url FROM clinic_settings LIMIT 1`);
    const url = result.rows[0]?.website_hero_url;

    if (url && url.startsWith('/uploads/')) {
      const filePath = path.join(url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await queryTenant(tenantId, `
      UPDATE clinic_settings SET website_hero_url = NULL, updated_at = NOW()
    `);
    res.json({ status: 'success', message: 'Hero image removed' });
  } catch (err) {
    console.error('DELETE /settings/hero-image', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/settings/subscription ────────────────────────────────────────
// Returns the current clinic's subscription data (admin only)
router.get('/subscription', requireRole('admin'), async (req, res) => {
  try {
    const result = await queryPublic(`
      SELECT
        t.status,
        t.plan_type,
        t.subscription_start,
        t.subscription_end,
        sp.id             AS plan_id,
        sp.name           AS plan_name,
        sp.description    AS plan_description,
        sp.billing_cycle  AS plan_billing_cycle,
        sp.monthly_price,
        sp.yearly_price,
        (t.subscription_end::date - CURRENT_DATE) AS days_remaining
      FROM public.tenants t
      LEFT JOIN public.subscription_plans sp ON sp.id = t.plan_id
      WHERE t.id = $1
    `, [req.tenant.id]);

    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error('GET /settings/subscription', err);
    res.status(500).json({ status: 'error', message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/settings/announcements ───────────────────────────────────────
// Returns published, non-expired announcements not yet dismissed by this clinic
router.get('/announcements', async (req, res) => {
  const schema = req.tenantSchema;
  try {
    const result = await queryPublic(`
      SELECT a.*
      FROM public.broadcast_announcements a
      WHERE a.status = 'published'
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND NOT EXISTS (
          SELECT 1 FROM public.announcement_reads r
          WHERE r.announcement_id = a.id AND r.tenant_schema = $1
        )
      ORDER BY
        CASE a.priority WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
        a.published_at DESC
    `, [schema]);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /settings/announcements', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/settings/announcements/:id/dismiss ──────────────────────────
router.post('/announcements/:id/dismiss', async (req, res) => {
  const schema = req.tenantSchema;
  try {
    await queryPublic(`
      INSERT INTO public.announcement_reads (announcement_id, tenant_schema)
      VALUES ($1, $2) ON CONFLICT DO NOTHING
    `, [req.params.id, schema]);
    res.json({ status: 'success', message: 'Dismissed' });
  } catch (err) {
    console.error('POST /settings/announcements/:id/dismiss', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
