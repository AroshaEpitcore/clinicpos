/**
 * migrate_caps_and_portal_hours.js
 *
 * 1. Adds `staff.max_patients_per_day` (per-doctor daily cap, 0 = unlimited).
 * 2. Creates `portal_hours` (7 rows per tenant, one per day-of-week 0..6 where
 *    0 = Sunday). Defines when the public booking portal is open.
 *
 * Run once:
 *   node src/db/migrate_caps_and_portal_hours.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const tenants = await client.query(
      `SELECT subdomain FROM public.tenants WHERE status != 'cancelled'`
    );
    console.log(`Found ${tenants.rows.length} tenant(s)`);

    for (const { subdomain } of tenants.rows) {
      const schema = `tenant_${subdomain}`;

      // Per-doctor daily cap on staff (0 = unlimited)
      await client.query(`
        ALTER TABLE "${schema}".staff
          ADD COLUMN IF NOT EXISTS max_patients_per_day INTEGER NOT NULL DEFAULT 0
      `);

      // Portal-hours table — 7 rows, one per day of week
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${schema}".portal_hours (
          day_of_week  INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
          is_open      BOOLEAN NOT NULL DEFAULT TRUE,
          open_time    TIME    NOT NULL DEFAULT '08:00',
          close_time   TIME    NOT NULL DEFAULT '17:00',
          updated_at   TIMESTAMP DEFAULT NOW()
        )
      `);

      // Seed defaults: Mon-Fri 8-17 open, Sat 9-13 open, Sun closed
      const defaults = [
        [0, false, '09:00', '13:00'],  // Sun
        [1, true,  '08:00', '17:00'],  // Mon
        [2, true,  '08:00', '17:00'],  // Tue
        [3, true,  '08:00', '17:00'],  // Wed
        [4, true,  '08:00', '17:00'],  // Thu
        [5, true,  '08:00', '17:00'],  // Fri
        [6, true,  '09:00', '13:00'],  // Sat
      ];
      for (const [day, isOpen, openT, closeT] of defaults) {
        await client.query(
          `INSERT INTO "${schema}".portal_hours (day_of_week, is_open, open_time, close_time)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (day_of_week) DO NOTHING`,
          [day, isOpen, openT, closeT]
        );
      }

      console.log(`  ✓ ${schema} — staff cap + portal_hours seeded`);
    }
    console.log('Done.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
