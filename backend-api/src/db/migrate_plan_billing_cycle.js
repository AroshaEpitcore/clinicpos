/**
 * migrate_plan_billing_cycle.js
 * Run once: node -r dotenv/config src/db/migrate_plan_billing_cycle.js
 *
 * Adds billing_cycle column to subscription_plans.
 * Updates Basic (monthly, 10000) and Standard (yearly, 50000).
 */
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE public.subscription_plans
        ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly'
    `);
    console.log('✅ billing_cycle column added');

    await client.query(`
      UPDATE public.subscription_plans
      SET billing_cycle  = 'monthly',
          monthly_price  = 10000.00,
          yearly_price   = 0,
          description    = NULL,
          updated_at     = NOW()
      WHERE name = 'Basic'
    `);
    console.log('✅ Basic → monthly, LKR 10,000.00');

    await client.query(`
      UPDATE public.subscription_plans
      SET billing_cycle  = 'yearly',
          yearly_price   = 50000.00,
          monthly_price  = 0,
          description    = NULL,
          updated_at     = NOW()
      WHERE name = 'Standard'
    `);
    console.log('✅ Standard → yearly, LKR 50,000.00');

    await client.query(`
      UPDATE public.subscription_plans
      SET is_active = FALSE, updated_at = NOW()
      WHERE name = 'Premium'
    `);
    console.log('✅ Premium deactivated');

    await client.query('COMMIT');
    console.log('✅ Migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

migrate().catch(() => process.exit(1));
