const { queryPublic } = require('../config/db');

/**
 * Read the subdomain from the request Host header and load the matching tenant.
 * Attaches tenant info and feature flags to req.tenant and req.tenantFlags.
 *
 * Subdomains: drsilva.clinicpos.com → subdomain = "drsilva"
 * Local dev:  pass X-Tenant-Subdomain header instead.
 */
async function tenantMiddleware(req, res, next) {
  try {
    const host = req.headers['x-tenant-subdomain'] || req.hostname;
    const subdomain = host.split('.')[0];

    if (!subdomain || subdomain === 'localhost') {
      return res.status(400).json({ status: 'error', message: 'Tenant subdomain not found in request' });
    }

    // Load tenant from public schema
    const tenantResult = await queryPublic(
      `SELECT * FROM public.tenants WHERE subdomain = $1 AND status != 'cancelled'`,
      [subdomain]
    );

    if (tenantResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Clinic not found' });
    }

    const tenant = tenantResult.rows[0];

    if (tenant.status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'This clinic account is suspended' });
    }

    // Auto-suspend if subscription has expired
    if (tenant.status === 'active' && tenant.subscription_end) {
      const today = new Date().toISOString().split('T')[0];
      if (String(tenant.subscription_end).split('T')[0] < today) {
        await queryPublic(
          `UPDATE public.tenants SET status = 'suspended', updated_at = NOW() WHERE id = $1`,
          [tenant.id]
        );
        return res.status(403).json({
          status: 'error',
          message: 'Your subscription has expired. Please contact your administrator to renew.'
        });
      }
    }

    // Load feature flags
    const flagsResult = await queryPublic(
      `SELECT module, enabled FROM public.feature_flags WHERE tenant_id = $1`,
      [tenant.id]
    );

    const flags = {};
    flagsResult.rows.forEach(row => {
      flags[row.module] = row.enabled;
    });

    req.tenant = tenant;
    req.tenantSchema = `tenant_${subdomain}`;
    req.tenantFlags = flags;

    next();
  } catch (err) {
    console.error('Tenant middleware error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to load clinic data' });
  }
}

/**
 * Check that a specific feature flag is ON for this tenant.
 * Usage: router.use(tenantMiddleware, requireFeature('pharmacy'), handler)
 */
function requireFeature(module) {
  return (req, res, next) => {
    if (!req.tenantFlags?.[module]) {
      return res.status(403).json({
        status: 'error',
        message: `Module '${module}' is not enabled for your plan`
      });
    }
    next();
  };
}

module.exports = { tenantMiddleware, requireFeature };
