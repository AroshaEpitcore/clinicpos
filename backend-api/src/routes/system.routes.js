const router = require('express').Router();
const { queryPublic }                  = require('../config/db');
const { authMiddleware, requireRole }  = require('../middleware/auth');

// ── GET /api/v1/system/logs — clinic admin only ────────────────────────────────
router.get('/logs', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, parseInt(req.query.limit) || 50);
    const offset   = (page - 1) * limit;

    const { method, status_class, search, date_from, date_to } = req.query;

    const conditions = ['tenant_id = $1'];
    const params     = [tenantId];
    let   pi         = 2;

    if (method)  { conditions.push(`method = $${pi++}`);   params.push(method.toUpperCase()); }
    if (status_class === '2xx') conditions.push(`status_code BETWEEN 200 AND 299`);
    else if (status_class === '4xx') conditions.push(`status_code BETWEEN 400 AND 499`);
    else if (status_class === '5xx') conditions.push(`status_code >= 500`);
    if (search)    { conditions.push(`(path ILIKE $${pi} OR user_email ILIKE $${pi})`); params.push(`%${search}%`); pi++; }
    if (date_from) { conditions.push(`created_at >= $${pi++}`); params.push(date_from); }
    if (date_to)   { conditions.push(`created_at < $${pi++}`);  params.push(date_to); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const [logsRes, countRes] = await Promise.all([
      queryPublic(
        `SELECT * FROM public.system_audit_logs ${where} ORDER BY created_at DESC LIMIT $${pi} OFFSET $${pi + 1}`,
        [...params, limit, offset]
      ),
      queryPublic(`SELECT COUNT(*) FROM public.system_audit_logs ${where}`, params),
    ]);

    res.json({
      status: 'success',
      data: {
        logs:  logsRes.rows,
        total: parseInt(countRes.rows[0].count),
        page,
        limit,
      },
    });
  } catch (err) {
    console.error('GET /system/logs', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
