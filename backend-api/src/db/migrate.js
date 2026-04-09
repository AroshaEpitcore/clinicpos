require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    // ─── PUBLIC SCHEMA ───────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.tenants (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clinic_name   VARCHAR(255) NOT NULL,
        subdomain     VARCHAR(100) NOT NULL UNIQUE,
        owner_email   VARCHAR(255) NOT NULL UNIQUE,
        owner_phone   VARCHAR(20),
        plan          VARCHAR(50)  DEFAULT 'basic',
        status        VARCHAR(20)  DEFAULT 'trial',
        trial_ends_at TIMESTAMP,
        created_at    TIMESTAMP    DEFAULT NOW(),
        updated_at    TIMESTAMP    DEFAULT NOW()
      );
    `);
    console.log('✓ public.tenants');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.feature_flags (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id  UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        module     VARCHAR(100) NOT NULL,
        enabled    BOOLEAN      DEFAULT FALSE,
        updated_at TIMESTAMP    DEFAULT NOW(),
        UNIQUE(tenant_id, module)
      );
    `);
    console.log('✓ public.feature_flags');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.subscriptions (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id    UUID NOT NULL REFERENCES public.tenants(id),
        plan         VARCHAR(50)    NOT NULL,
        amount       DECIMAL(10,2)  NOT NULL,
        currency     VARCHAR(10)    DEFAULT 'LKR',
        status       VARCHAR(20)    DEFAULT 'pending',
        period_start DATE           NOT NULL,
        period_end   DATE           NOT NULL,
        paid_at      TIMESTAMP,
        created_at   TIMESTAMP      DEFAULT NOW()
      );
    `);
    console.log('✓ public.subscriptions');

    console.log('\nAll migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
