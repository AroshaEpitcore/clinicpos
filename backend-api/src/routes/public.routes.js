const router = require('express').Router();
const { queryPublic } = require('../config/db');

// ── GET /api/v1/public/landing ────────────────────────────────────────────────
// Returns platform settings + active plans for the landing page.
// No authentication required.
router.get('/landing', async (req, res) => {
  try {
    const settingRes = await queryPublic(
      `SELECT value FROM public.platform_settings WHERE key = 'landing_page_enabled'`
    );
    const enabled = settingRes.rows.length === 0 || settingRes.rows[0].value === 'true';

    if (!enabled) {
      return res.json({ status: 'success', data: { enabled: false, plans: [] } });
    }

    const plansRes = await queryPublic(
      `SELECT id, name, description, billing_cycle, monthly_price, yearly_price
       FROM public.subscription_plans
       WHERE is_active = TRUE
       ORDER BY monthly_price ASC, yearly_price ASC`
    );

    res.json({
      status: 'success',
      data: { enabled: true, plans: plansRes.rows },
    });
  } catch (err) {
    console.error('GET /public/landing', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
