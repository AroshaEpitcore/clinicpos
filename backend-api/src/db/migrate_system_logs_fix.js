require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // tenant_id was INTEGER but tenant IDs are UUIDs — change to VARCHAR(50)
    await client.query(`
      ALTER TABLE public.system_audit_logs
        ALTER COLUMN tenant_id TYPE VARCHAR(50) USING tenant_id::text;
    `);
    console.log('✅ tenant_id column changed from INTEGER to VARCHAR(50)');

    // Also widen user_id to VARCHAR since staff IDs may be integers or UUIDs
    await client.query(`
      ALTER TABLE public.system_audit_logs
        ALTER COLUMN user_id TYPE VARCHAR(50) USING user_id::text;
    `);
    console.log('✅ user_id column changed to VARCHAR(50)');
  } catch (e) {
    if (e.message.includes('cannot be cast')) {
      console.log('ℹ  Column may already be VARCHAR — skipping:', e.message);
    } else {
      throw e;
    }
  } finally {
    client.release();
    await pool.end();
  }
}
run().catch(err => { console.error('Migration failed:', err.message); process.exit(1); });
