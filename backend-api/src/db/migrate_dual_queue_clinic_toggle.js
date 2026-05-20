/**
 * migrate_dual_queue_clinic_toggle.js
 *
 * Adds `clinic_settings.dual_queue_enabled` to every tenant. This is the
 * second-level gate that lets the clinic admin turn dual-queue on or off
 * day-to-day (super-admin's feature flag remains the capability gate).
 *
 * Run once:
 *   node src/db/migrate_dual_queue_clinic_toggle.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const tenants = await client.query(
      `SELECT subdomain FROM public.tenants WHERE status != 'cancelled'`
    );
    console.log(`Found ${tenants.rows.length} tenant(s)`);

    for (const { subdomain } of tenants.rows) {
      const schema = `tenant_${subdomain}`;
      await client.query(`
        ALTER TABLE "${schema}".clinic_settings
          ADD COLUMN IF NOT EXISTS dual_queue_enabled BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log(`  ✓ ${schema} — clinic_settings.dual_queue_enabled added`);
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
