require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.broadcast_announcements (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title        VARCHAR(255) NOT NULL,
        message      TEXT NOT NULL,
        priority     VARCHAR(20) DEFAULT 'normal',
        status       VARCHAR(20) DEFAULT 'draft',
        published_at TIMESTAMP,
        expires_at   TIMESTAMP,
        created_at   TIMESTAMP DEFAULT NOW(),
        updated_at   TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.announcement_reads (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        announcement_id UUID NOT NULL REFERENCES public.broadcast_announcements(id) ON DELETE CASCADE,
        tenant_schema   VARCHAR(100) NOT NULL,
        dismissed_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE(announcement_id, tenant_schema)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS broadcast_announcements_status_idx
      ON public.broadcast_announcements(status, published_at DESC)
    `);
    console.log('✅ broadcast_announcements + announcement_reads created (or already exist)');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
