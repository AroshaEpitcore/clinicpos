require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.contact_enquiries (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) NOT NULL,
        phone       VARCHAR(30),
        clinic_name VARCHAR(255),
        message     TEXT NOT NULL,
        is_read     BOOLEAN DEFAULT FALSE,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS contact_enquiries_created_idx
      ON public.contact_enquiries(created_at DESC)
    `);
    console.log('✅ public.contact_enquiries created (or already exists)');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
