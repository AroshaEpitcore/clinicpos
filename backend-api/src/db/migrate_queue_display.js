/**
 * migrate_queue_display.js
 * Adds queue_display_enabled column to clinic_settings in all tenant schemas.
 * Run once: node src/db/migrate_queue_display.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const tenants = await client.query(
      `SELECT subdomain FROM public.tenants WHERE status = 'active'`
    );
    console.log(`Found ${tenants.rows.length} active tenant(s)`);

    for (const { subdomain } of tenants.rows) {
      const schema = `tenant_${subdomain}`;
      await client.query(`
        ALTER TABLE "${schema}".clinic_settings
        ADD COLUMN IF NOT EXISTS queue_display_enabled BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log(`  ✓ ${schema} — queue_display_enabled added`);
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
