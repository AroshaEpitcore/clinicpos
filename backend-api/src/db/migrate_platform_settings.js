/**
 * migrate_platform_settings.js
 * Creates public.platform_settings table for global platform config.
 * Run once: node -r dotenv/config src/db/migrate_platform_settings.js
 */
require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.platform_settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      TEXT        NOT NULL,
        updated_at TIMESTAMP   DEFAULT NOW()
      );
    `);
    console.log('✓ platform_settings table created');

    await client.query(`
      INSERT INTO public.platform_settings (key, value) VALUES
        ('landing_page_enabled', 'true')
      ON CONFLICT (key) DO NOTHING;
    `);
    console.log('✓ default settings seeded');

    console.log('\n✅ Platform settings migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
