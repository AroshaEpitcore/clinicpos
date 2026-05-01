const jwt = require('jsonwebtoken');

/**
 * Verify a patient portal JWT.
 * Attaches decoded patient info to req.patient.
 * Must be used AFTER tenantMiddleware so req.tenantSchema is available for cross-check.
 */
function patientAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.PATIENT_JWT_SECRET || process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret);
    // decoded: { patientId, tenantSchema, role: 'patient' }

    if (decoded.role !== 'patient') {
      return res.status(403).json({ status: 'error', message: 'Invalid token type' });
    }

    // Ensure the token was issued for this clinic
    if (decoded.tenantSchema !== req.tenantSchema) {
      return res.status(403).json({ status: 'error', message: 'Token does not belong to this clinic' });
    }

    req.patient = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
  }
}

module.exports = { patientAuthMiddleware };
