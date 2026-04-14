const jwt = require('jsonwebtoken');

/**
 * Middleware for super admin routes.
 * Verifies the request carries a valid super admin JWT (role: 'superadmin').
 */
function adminAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const secret  = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'superadmin') {
      return res.status(403).json({ status: 'error', message: 'Super admin access required' });
    }
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

module.exports = { adminAuthMiddleware };
