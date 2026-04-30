/**
 * migrate_qr_payment.js
 * Adds QR payment support:
 *   - qr_image_url, qr_image_filename columns to clinic_settings (per tenant)
 *   - qr_total column to end_of_day (per tenant)
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
        ALTER TABLE clinic_settings
          ADD COLUMN IF NOT EXISTS qr_image_url      TEXT,
          ADD COLUMN IF NOT EXISTS qr_image_filename TEXT
      `);
      console.log('  ✓ clinic_settings — qr_image_url, qr_image_filename');

      await client.query(`
        ALTER TABLE end_of_day
          ADD COLUMN IF NOT EXISTS qr_total DECIMAL(10,2) DEFAULT 0
      `);
      console.log('  ✓ end_of_day — qr_total');
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
