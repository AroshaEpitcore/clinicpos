const router = require('express').Router();
const { queryPublic } = require('../config/db');

// Keys returned publicly (no sensitive data)
const PUBLIC_KEYS = [
  'landing_page_enabled',
  'company_name', 'company_tagline',
  'support_email', 'sales_email',
  'phone_primary', 'phone_whatsapp',
  'address_line1', 'address_line2', 'city', 'country',
];

// ── GET /api/v1/public/landing ────────────────────────────────────────────────
router.get('/landing', async (req, res) => {
  try {
    const [settingsRes, plansRes] = await Promise.all([
      queryPublic(`SELECT key, value FROM public.platform_settings WHERE key = ANY($1)`, [PUBLIC_KEYS]),
      queryPublic(
        `SELECT id, name, description, billing_cycle, monthly_price, yearly_price
         FROM public.subscription_plans
         WHERE is_active = TRUE
         ORDER BY monthly_price ASC, yearly_price ASC`
      ),
    ]);

    const settings = {};
    settingsRes.rows.forEach(r => { settings[r.key] = r.value; });

    const enabled = settings.landing_page_enabled !== 'false';

    res.json({
      status: 'success',
      data: {
        enabled,
        plans:   enabled ? plansRes.rows : [],
        contact: {
          company_name:    settings.company_name    || 'HealthCenter.lk',
          company_tagline: settings.company_tagline || '',
          support_email:   settings.support_email   || '',
          sales_email:     settings.sales_email     || '',
          phone_primary:   settings.phone_primary   || '',
          phone_whatsapp:  settings.phone_whatsapp  || '',
          address_line1:   settings.address_line1   || '',
          address_line2:   settings.address_line2   || '',
          city:            settings.city            || '',
          country:         settings.country         || 'Sri Lanka',
        },
      },
    });
  } catch (err) {
    console.error('GET /public/landing', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/public/platform-info ─────────────────────────────────────────
// Returns non-sensitive platform info for display in clinic apps.
router.get('/platform-info', async (req, res) => {
  try {
    const result = await queryPublic(
      `SELECT key, value FROM public.platform_settings WHERE key = ANY($1)`,
      [[
        'company_name', 'company_tagline',
        'support_email', 'sales_email',
        'phone_primary', 'phone_whatsapp',
        'address_line1', 'address_line2', 'city', 'country',
        'bank_name', 'bank_account_name', 'bank_account_number',
        'bank_branch', 'bank_swift_code', 'payment_instructions',
      ]]
    );
    const info = {};
    result.rows.forEach(r => { info[r.key] = r.value; });
    res.json({ status: 'success', data: info });
  } catch (err) {
    console.error('GET /public/platform-info', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/public/contact ───────────────────────────────────────────────
// Public contact enquiry form — no auth, no tenant required
router.post('/contact', async (req, res) => {
  const { name, email, phone, clinic_name, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Name, email, and message are required' });
  }

  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRx.test(email.trim())) {
    return res.status(400).json({ status: 'error', message: 'Invalid email address' });
  }

  try {
    await queryPublic(
      `INSERT INTO public.contact_enquiries (name, email, phone, clinic_name, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [name.trim(), email.trim().toLowerCase(), phone?.trim() || null, clinic_name?.trim() || null, message.trim()]
    );
    res.status(201).json({ status: 'success', message: 'Enquiry received. We will get back to you within 24 hours.' });
  } catch (err) {
    console.error('POST /public/contact', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
