const { queryPublic } = require('../config/db');

const SKIP_PREFIXES = ['/health', '/uploads', '/api/v1/public', '/api/v1/portal'];
const LOGIN_PATHS   = ['/api/v1/auth/login', '/api/v1/admin/auth/login'];

module.exports = function auditLogMiddleware(req, res, next) {
  const start = Date.now();

  // Capture originalUrl now — req.path gets mutated to router-relative by Express sub-routers
  const originalUrl = req.originalUrl || req.path;

  res.on('finish', () => {
    try {
      const isWrite = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
      const isError = res.statusCode >= 400;
      if (!isWrite && !isError) return;
      if (SKIP_PREFIXES.some(p => originalUrl.startsWith(p))) return;

      const duration  = Date.now() - start;
      const user      = req.user || null;
      const ip        = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null;

      const isLogin = LOGIN_PATHS.includes(originalUrl.split('?')[0]);
      const email   = user?.email || (isLogin ? (req.body?.email || null) : null);
      const role    = user?.role  || (isLogin ? 'login' : null);

      // tenant_id is a UUID in this system — stored as VARCHAR
      // req.user.tenantId  — set by authMiddleware on authenticated requests
      // req.tenant.id      — set by tenantMiddleware (login route, portal, etc.)
      const tenantId  = user?.tenantId || req.tenant?.id || null;
      const subdomain = req.tenant?.subdomain || req.headers['x-tenant-subdomain'] || null;

      queryPublic(
        `INSERT INTO public.system_audit_logs
           (tenant_id, tenant_subdomain, user_id, user_email, user_role,
            method, path, status_code, duration_ms, ip_address)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tenantId, subdomain, user?.id || null, email, role,
         req.method, originalUrl, res.statusCode, duration, ip]
      ).catch(() => {});
    } catch (_) {}
  });

  next();
};
