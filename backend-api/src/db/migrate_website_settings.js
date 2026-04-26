require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // Fetch all tenant schemas
    const tenants = await client.query(`SELECT subdomain FROM public.tenants WHERE status != 'deleted'`);

    for (const { subdomain } of tenants.rows) {
      const schema = `tenant_${subdomain}`;
      console.log(`  Migrating ${schema}…`);

      await client.query(`
        ALTER TABLE ${schema}.clinic_settings
          ADD COLUMN IF NOT EXISTS website_enabled   BOOLEAN      DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS website_tagline   VARCHAR(255),
          ADD COLUMN IF NOT EXISTS website_about     TEXT,
          ADD COLUMN IF NOT EXISTS website_hours     TEXT,
          ADD COLUMN IF NOT EXISTS website_map_url   VARCHAR(500),
          ADD COLUMN IF NOT EXISTS website_whatsapp  VARCHAR(30),
          ADD COLUMN IF NOT EXISTS website_facebook  VARCHAR(255);
      `);
      console.log(`  ✅ ${schema} done`);
    }
    console.log('\n✅ Website settings migration complete');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
