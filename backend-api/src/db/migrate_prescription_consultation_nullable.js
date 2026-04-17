/**
 * migrate_prescription_consultation_nullable.js
 *
 * Drops NOT NULL from prescriptions.consultation_id on all existing tenant schemas.
 * A prescription can now exist without a linked consultation (e.g. standalone Rx).
 *
 * Run once:
 *   node src/db/migrate_prescription_consultation_nullable.js
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`SELECT subdomain FROM public.tenants`);
    console.log(`Found ${rows.length} tenant(s)`);

    for (const { subdomain } of rows) {
      const schema = `tenant_${subdomain}`;
      await client.query(`
        ALTER TABLE "${schema}".prescriptions
          ALTER COLUMN consultation_id DROP NOT NULL
      `);
      console.log(`✓ ${schema} — consultation_id now nullable`);
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
