/**
 * migrate_update_plans.js
 * Run once: node -r dotenv/config src/db/migrate_update_plans.js
 *
 * Updates existing subscription plans to LKR pricing,
 * removes descriptions, and deactivates Premium plan.
 */
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update Basic
    await client.query(`
      UPDATE public.subscription_plans
      SET monthly_price = 10000.00,
          yearly_price  = 50000.00,
          description   = NULL,
          updated_at    = NOW()
      WHERE name = 'Basic'
    `);
    console.log('✅ Basic plan updated');

    // Update Standard
    await client.query(`
      UPDATE public.subscription_plans
      SET monthly_price = 10000.00,
          yearly_price  = 50000.00,
          updated_at    = NOW()
      WHERE name = 'Standard'
    `);
    console.log('✅ Standard plan updated');

    // Deactivate Premium
    await client.query(`
      UPDATE public.subscription_plans
      SET is_active   = FALSE,
          updated_at  = NOW()
      WHERE name = 'Premium'
    `);
    console.log('✅ Premium plan deactivated');

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
