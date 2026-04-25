const { queryPublic } = require('../config/db');

const SKIP_PREFIXES = ['/health', '/uploads', '/api/v1/public', '/api/v1/portal'];
const LOGIN_PATHS   = ['/api/v1/auth/login', '/api/v1/admin/auth/login'];

module.exports = function auditLogMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
      const isError = res.statusCode >= 400;
      if (!isWrite && !isError) return;
      if (SKIP_PREFIXES.some(p => req.path.startsWith(p))) return;

      const duration  = Date.now() - start;
      const user      = req.user || null;
      const subdomain = req.headers['x-tenant-subdomain'] || null;
      const ip        = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null;

      const isLogin = LOGIN_PATHS.includes(req.path);
      const email   = user?.email || (isLogin ? (req.body?.email || null) : null);
      const role    = user?.role  || (isLogin ? 'login' : null);

      // For login events req.user is null — look up tenant_id from the subdomain header
      let tenantId = user?.tenantId || null;
      if (!tenantId && subdomain) {
        try {
          const r = await queryPublic('SELECT id FROM public.tenants WHERE subdomain = $1', [subdomain]);
          tenantId = r.rows[0]?.id || null;
        } catch (_) {}
      }

      await queryPublic(
        `INSERT INTO public.system_audit_logs
           (tenant_id, tenant_subdomain, user_id, user_email, user_role,
            method, path, status_code, duration_ms, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tenantId, subdomain, user?.id || null, email, role,
         req.method, req.path, res.statusCode, duration, ip]
      );
    } catch (_) {}
  });

  next();
};
