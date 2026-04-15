/**
 * patientCode.js — Shared patient code generator
 *
 * Single source of truth for PT-XXXXX code generation.
 * Used by patient.routes.js (staff registration) AND portal.routes.js (online booking).
 * Format: PT-00001, PT-00002, ... PT-99999
 */

const { queryTenant } = require('../config/db');

async function nextPatientCode(schema) {
  const result = await queryTenant(
    schema,
    `SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 4) AS INTEGER)), 0) + 1 AS next
     FROM patients
     WHERE patient_code ~ '^PT-[0-9]+$'`,
    []
  );
  const num = result.rows[0].next;
  return `PT-${String(num).padStart(5, '0')}`;
}

module.exports = { nextPatientCode };
