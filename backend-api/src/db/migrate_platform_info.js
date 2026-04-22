/**
 * migrate_platform_info.js
 * Seeds all platform_settings keys used by the Platform Settings page.
 * Safe to re-run — uses ON CONFLICT DO NOTHING.
 * Run: node -r dotenv/config src/db/migrate_platform_info.js
 */
require('dotenv').config();
const { pool } = require('../config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    // Ensure table exists (in case this runs before migrate_platform_settings)
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.platform_settings (
        key        VARCHAR(100) PRIMARY KEY,
        value      TEXT        NOT NULL,
        updated_at TIMESTAMP   DEFAULT NOW()
      );
    `);

    const defaults = [
      ['landing_page_enabled',   'true'],
      ['company_name',           'HealthCenter.lk'],
      ['company_tagline',        'Modern Clinic Management Software'],
      ['company_reg_no',         ''],
      ['support_email',          'support@healthcenter.lk'],
      ['sales_email',            'sales@healthcenter.lk'],
      ['phone_primary',          ''],
      ['phone_whatsapp',         ''],
      ['address_line1',          ''],
      ['address_line2',          ''],
      ['city',                   'Colombo'],
      ['country',                'Sri Lanka'],
      ['bank_name',              ''],
      ['bank_account_name',      ''],
      ['bank_account_number',    ''],
      ['bank_branch',            ''],
      ['bank_swift_code',        ''],
      ['payment_instructions',   'Please transfer the subscription fee to the bank account above and send the receipt to our support email.'],
    ];

    for (const [key, value] of defaults) {
      await client.query(
        `INSERT INTO public.platform_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [key, value]
      );
    }
    console.log(`✓ Seeded ${defaults.length} platform setting keys`);
    console.log('\n✅ Platform info migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
