require('dotenv').config();
const { pool } = require('../config/db');

const DEMO_SUBDOMAIN = process.env.DEMO_SUBDOMAIN || 'demo';
const SCHEMA = `tenant_${DEMO_SUBDOMAIN}`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}, public`);
    console.log(`Running portal migration on schema: ${SCHEMA}`);

    // Add booking_reference and booking_source columns to appointments
    await client.query(`
      ALTER TABLE appointments
        ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20),
        ADD COLUMN IF NOT EXISTS booking_source    VARCHAR(20) DEFAULT 'admin';
    `);
    console.log('✓ appointments — booking_reference, booking_source columns added');

    // Index for fast reference lookup
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_booking_reference
        ON appointments(booking_reference)
        WHERE booking_reference IS NOT NULL;
    `);
    console.log('✓ index idx_appointments_booking_reference');

    console.log('✅ Portal migration complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
