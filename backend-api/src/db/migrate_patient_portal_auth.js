/**
 * migrate_patient_portal_auth.js
 * Adds patient login portal support:
 *   - portal_password_hash, portal_registered_at, portal_last_login_at to patients (per tenant)
 *   - patient_login_enabled BOOLEAN to clinic_settings (per tenant)
 * Safe to re-run — uses ADD COLUMN IF NOT EXISTS.
 */
require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    const tenants = await client.query(
      `SELECT id, subdomain FROM public.tenants ORDER BY subdomain`
    );

    if (!tenants.rows.length) {
      console.log('No tenants found.');
      return;
    }

    for (const tenant of tenants.rows) {
      const schema = `tenant_${tenant.subdomain}`;
      console.log(`\nMigrating schema: ${schema}`);

      await client.query(`SET search_path TO "${schema}", public`);

      await client.query(`
        ALTER TABLE patients
          ADD COLUMN IF NOT EXISTS portal_password_hash  TEXT,
          ADD COLUMN IF NOT EXISTS portal_registered_at  TIMESTAMPTZ,
          ADD COLUMN IF NOT EXISTS portal_last_login_at  TIMESTAMPTZ
      `);
      console.log('  ✓ patients — portal_password_hash, portal_registered_at, portal_last_login_at');

      await client.query(`
        ALTER TABLE clinic_settings
          ADD COLUMN IF NOT EXISTS patient_login_enabled BOOLEAN DEFAULT FALSE
      `);
      console.log('  ✓ clinic_settings — patient_login_enabled');
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
