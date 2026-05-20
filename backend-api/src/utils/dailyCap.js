/**
 * Daily-cap enforcement helpers. Two caps apply to every new appointment:
 *   1. Clinic-wide cap (clinic_settings.max_patients_per_day)
 *   2. Per-doctor cap (staff.max_patients_per_day for the appointment's doctor)
 *
 * 0 means "unlimited" for either cap. Cancelled appointments are not counted.
 */

const { queryTenant } = require('../config/db');

/**
 * Returns `{ ok: true }` when the booking is allowed, or
 * `{ ok: false, scope: 'clinic'|'doctor', limit, current }` when a cap is hit.
 *
 * The cap is checked against the count of non-cancelled appointments on
 * `date` for the given clinic (and doctor, when scope='doctor').
 */
async function checkDailyCap(schema, doctorId, date) {
  // Clinic-wide cap
  const clinicCfg = await queryTenant(
    schema,
    `SELECT max_patients_per_day FROM clinic_settings LIMIT 1`
  );
  const clinicCap = Number(clinicCfg.rows[0]?.max_patients_per_day || 0);

  if (clinicCap > 0) {
    const totals = await queryTenant(
      schema,
      `SELECT COUNT(*)::int AS n FROM appointments
       WHERE appointment_date = $1 AND status != 'cancelled'`,
      [date]
    );
    const current = totals.rows[0]?.n || 0;
    if (current >= clinicCap) {
      return { ok: false, scope: 'clinic', limit: clinicCap, current };
    }
  }

  // Per-doctor cap
  const docCfg = await queryTenant(
    schema,
    `SELECT max_patients_per_day FROM staff WHERE id = $1`,
    [doctorId]
  );
  const docCap = Number(docCfg.rows[0]?.max_patients_per_day || 0);

  if (docCap > 0) {
    const docTotals = await queryTenant(
      schema,
      `SELECT COUNT(*)::int AS n FROM appointments
       WHERE doctor_id = $1 AND appointment_date = $2 AND status != 'cancelled'`,
      [doctorId, date]
    );
    const current = docTotals.rows[0]?.n || 0;
    if (current >= docCap) {
      return { ok: false, scope: 'doctor', limit: docCap, current };
    }
  }

  return { ok: true };
}

function capErrorMessage(result) {
  if (result.scope === 'clinic') {
    return `Clinic is fully booked for this day (limit ${result.limit}). Please choose another date.`;
  }
  return `This doctor is fully booked for this day (limit ${result.limit}). Please choose another doctor or date.`;
}

module.exports = { checkDailyCap, capErrorMessage };
