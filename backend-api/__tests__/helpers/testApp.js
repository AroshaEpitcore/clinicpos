/**
 * Test-app factory. Mounts a single route file with stubbed tenant + auth
 * middleware so individual routers can be exercised without a live DB or JWT.
 *
 * Usage:
 *   const { app, q } = makeTestApp({
 *     routes: '../../src/routes/appointment.routes',
 *     mountPath: '/api/v1/appointments',
 *     user: { id: 'staff-1', role: 'receptionist' },
 *     tenantFlags: { dual_queue: true },
 *   });
 *
 * The `q` helper exposes the mocked `queryTenant` / `queryPublic` so tests
 * can `q.queryTenant.mockResolvedValueOnce({ rows: [...] })`.
 */

const express = require('express');

function makeTestApp({ routes, mountPath, user = null, tenantFlags = {}, tenantSchema = 'tenant_test' }) {
  // Mocks must be installed before requiring the route module
  const queryTenant = jest.fn();
  const queryPublic = jest.fn();

  jest.doMock('../../src/config/db', () => ({
    queryTenant,
    queryPublic,
    pool: { connect: jest.fn() },
  }));

  // Stub tenant middleware — populates flags + schema directly
  jest.doMock('../../src/middleware/tenant', () => ({
    tenantMiddleware: (req, _res, next) => {
      req.tenant = { id: 'tenant-1', subdomain: 'test' };
      req.tenantSchema = tenantSchema;
      req.tenantFlags = tenantFlags;
      next();
    },
    requireFeature: () => (req, _res, next) => next(),
  }));

  // Stub auth middleware — sets req.user from the test config
  jest.doMock('../../src/middleware/auth', () => ({
    authMiddleware: (req, _res, next) => {
      if (!user) return _res.status(401).json({ status: 'error', message: 'No user' });
      req.user = user;
      next();
    },
    requireRole: (...roles) => (req, res, next) => {
      if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ status: 'error', message: 'Access denied for your role' });
      }
      next();
    },
  }));

  // bookingReference + patientCode generators stubbed to deterministic values
  jest.doMock('../../src/utils/bookingReference', () => ({
    nextBookingReference: jest.fn().mockResolvedValue('BK-TEST01'),
  }));
  jest.doMock('../../src/utils/patientCode', () => ({
    nextPatientCode: jest.fn().mockResolvedValue('P-TEST01'),
  }));

  // Important: require after mocks are in place
  // eslint-disable-next-line global-require
  const router = require(routes);

  const app = express();
  app.use(express.json());
  app.use(mountPath, router);

  return { app, q: { queryTenant, queryPublic } };
}

module.exports = { makeTestApp };
