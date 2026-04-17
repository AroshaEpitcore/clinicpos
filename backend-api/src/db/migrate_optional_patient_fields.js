/**
 * migrate_optional_patient_fields.js
 *
 * Makes last_name, date_of_birth, gender optional (nullable) on the patients
 * table in every existing tenant schema.
 *
 * Run once:  node src/db/migrate_optional_patient_fields.js
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    // Get all tenant schemas
    const tenantsResult = await client.query(
      `SELECT subdomain FROM public.tenants`
    );

    if (tenantsResult.rows.length === 0) {
      console.log('No tenants found.');
      return;
    }

    for (const { subdomain } of tenantsResult.rows) {
      const schema = `tenant_${subdomain}`;
      console.log(`Migrating ${schema}...`);
      try {
        await client.query(`
          ALTER TABLE "${schema}".patients
            ALTER COLUMN last_name     DROP NOT NULL,
            ALTER COLUMN date_of_birth DROP NOT NULL,
            ALTER COLUMN gender        DROP NOT NULL
        `);
        console.log(`  ✓ ${schema}.patients — last_name, date_of_birth, gender now nullable`);
      } catch (err) {
        // Column may already be nullable — skip
        if (err.message.includes('column') && err.message.includes('does not exist')) {
          console.log(`  ⚠ ${schema}: table or column not found — skipped`);
        } else {
          console.log(`  ✓ ${schema} already nullable (${err.message})`);
        }
      }
    }

    console.log('\nDone — all schemas updated.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
