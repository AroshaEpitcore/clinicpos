/**
 * bookingReference.js — Shared booking reference generator
 *
 * Single source of truth for BK-XXXXXX generation.
 * Used by appointment.routes.js (staff bookings) AND portal.routes.js (online bookings).
 * Format: BK-000001, BK-000002, ... BK-999999
 */

const { queryTenant } = require('../config/db');

async function nextBookingReference(schema) {
  const r = await queryTenant(
    schema,
    `SELECT booking_reference FROM appointments
     WHERE booking_reference IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`
  );
  let next = 1;
  if (r.rows.length) {
    const num = parseInt(r.rows[0].booking_reference.replace('BK-', ''), 10);
    if (!isNaN(num)) next = num + 1;
  }
  return `BK-${String(next).padStart(6, '0')}`;
}

module.exports = { nextBookingReference };
