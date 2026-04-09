const jwt = require('jsonwebtoken');

/**
 * Verify JWT token on every protected route.
 * Attaches decoded user to req.user.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, tenantId, tenantSchema }
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

/**
 * Restrict access to specific roles.
 * Usage: router.get('/admin-only', authMiddleware, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ status: 'error', message: 'Access denied for your role' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
