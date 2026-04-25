require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.system_audit_logs (
        id                BIGSERIAL    PRIMARY KEY,
        created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        tenant_id         INTEGER,
        tenant_subdomain  VARCHAR(100),
        user_id           INTEGER,
        user_email        VARCHAR(255),
        user_role         VARCHAR(50),
        method            VARCHAR(10)  NOT NULL,
        path              VARCHAR(500) NOT NULL,
        status_code       INTEGER      NOT NULL,
        duration_ms       INTEGER,
        ip_address        VARCHAR(50),
        error_detail      TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_sal_created_at  ON public.system_audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sal_tenant_id   ON public.system_audit_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_sal_status_code ON public.system_audit_logs(status_code);
    `);
    console.log('✅ system_audit_logs table created (or already exists)');
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
