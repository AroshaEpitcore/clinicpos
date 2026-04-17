/**
 * migrate_custom_medicine.js
 *
 * Makes prescription_items.medicine_id nullable (allows manual/custom medicine names).
 * Adds prescription_items.custom_medicine_name column.
 *
 * Run once:  node src/db/migrate_custom_medicine.js
 * Safe to re-run — uses IF NOT EXISTS / IF EXISTS guards.
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    // Get all tenant schemas
    const schemasRes = await client.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'tenant_%'`
    );
    const schemas = schemasRes.rows.map(r => r.schema_name);
    console.log(`Found ${schemas.length} tenant schemas: ${schemas.join(', ')}`);

    for (const schema of schemas) {
      console.log(`\nMigrating schema: ${schema}`);
      await client.query(`SET search_path TO "${schema}", public`);

      // 1. Drop NOT NULL from medicine_id
      await client.query(`
        ALTER TABLE prescription_items
          ALTER COLUMN medicine_id DROP NOT NULL;
      `);
      console.log(`  ✓ medicine_id — NOT NULL dropped (nullable now)`);

      // 2. Add custom_medicine_name column
      await client.query(`
        ALTER TABLE prescription_items
          ADD COLUMN IF NOT EXISTS custom_medicine_name VARCHAR(255);
      `);
      console.log(`  ✓ custom_medicine_name column added`);
    }

    console.log('\n✅ Custom medicine migration complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
