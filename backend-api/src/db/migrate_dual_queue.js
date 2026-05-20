/**
 * migrate_dual_queue.js
 *
 * Adds `patient_visit_type` to appointments in every tenant schema, plus an
 * index that backs the per-(doctor, date, type) token-series lookup.
 *
 * Run once:
 *   node src/db/migrate_dual_queue.js
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
        ALTER TABLE "${schema}".appointments
          ADD COLUMN IF NOT EXISTS patient_visit_type VARCHAR(10) NOT NULL DEFAULT 'returning'
      `);
      // Constraint is added separately and idempotently
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE c.conname = 'appointments_patient_visit_type_check'
              AND n.nspname = '${schema}'
          ) THEN
            ALTER TABLE "${schema}".appointments
              ADD CONSTRAINT appointments_patient_visit_type_check
              CHECK (patient_visit_type IN ('new','returning'));
          END IF;
        END $$;
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_appointments_doc_date_type
          ON "${schema}".appointments (doctor_id, appointment_date, patient_visit_type)
      `);
      console.log(`  ✓ ${schema} — patient_visit_type + index added`);
    }

    // Register the dual_queue feature-flag module for every tenant (default OFF)
    const tenantIds = await client.query(`SELECT id FROM public.tenants WHERE status != 'cancelled'`);
    for (const { id } of tenantIds.rows) {
      await client.query(
        `INSERT INTO public.feature_flags (tenant_id, module, enabled)
         VALUES ($1, 'dual_queue', FALSE)
         ON CONFLICT (tenant_id, module) DO NOTHING`,
        [id]
      );
    }
    console.log(`  ✓ public.feature_flags — dual_queue registered for all tenants (default OFF)`);

    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
