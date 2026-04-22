/**
 * migrate_vitals.js
 *
 * Adds patient_vitals table to ALL tenant schemas.
 * Safe to re-run — uses IF NOT EXISTS.
 *
 * Run on server:
 *   cd /var/www/clinicpos/backend-api
 *   node -r dotenv/config src/db/migrate_vitals.js
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function migrate(client, schema) {
  console.log(`\n── ${schema} ──`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".patient_vitals (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      appointment_id UUID REFERENCES "${schema}".appointments(id),
      patient_id     UUID NOT NULL REFERENCES "${schema}".patients(id),
      recorded_by    UUID NOT NULL REFERENCES "${schema}".staff(id),
      bp_systolic    INTEGER,
      bp_diastolic   INTEGER,
      temperature    DECIMAL(4,1),
      weight         DECIMAL(5,2),
      height         DECIMAL(5,2),
      spo2           INTEGER,
      pulse          INTEGER,
      notes          TEXT,
      recorded_at    TIMESTAMP DEFAULT NOW(),
      created_at     TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('  ✓ patient_vitals');
}

async function run() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name LIKE 'tenant_%'
       ORDER BY schema_name`
    );
    const schemas = result.rows.map(r => r.schema_name);

    if (!schemas.length) {
      console.log('No tenant schemas found.');
      return;
    }

    console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}`);

    for (const schema of schemas) {
      await migrate(client, schema);
    }

    console.log('\n✅ Vitals migration complete.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
