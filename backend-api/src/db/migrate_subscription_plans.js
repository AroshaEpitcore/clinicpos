/**
 * migrate_subscription_plans.js
 * Run once: node src/db/migrate_subscription_plans.js
 *
 * Creates public.subscription_plans table and adds subscription
 * columns to public.tenants. Seeds 3 default plans.
 */
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Create subscription_plans table ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.subscription_plans (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL UNIQUE,
        description   TEXT,
        monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
        yearly_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ subscription_plans table ready');

    // ── Seed default plans ────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO public.subscription_plans (name, description, monthly_price, yearly_price)
      VALUES
        ('Basic',    NULL,                                                          10000.00, 50000.00),
        ('Standard', 'Full system including pharmacy, lab, and insurance modules',  10000.00, 50000.00)
      ON CONFLICT (name) DO NOTHING
    `);
    console.log('✅ Default plans seeded');

    // ── Add subscription columns to tenants ──────────────────────────────────
    await client.query(`
      ALTER TABLE public.tenants
        ADD COLUMN IF NOT EXISTS plan_id            UUID REFERENCES public.subscription_plans(id),
        ADD COLUMN IF NOT EXISTS plan_type          VARCHAR(20)  DEFAULT 'monthly',
        ADD COLUMN IF NOT EXISTS subscription_start DATE,
        ADD COLUMN IF NOT EXISTS subscription_end   DATE
    `);
    console.log('✅ Subscription columns added to tenants');

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
