require('dotenv').config();
const { pool } = require('../config/db');

// Run this once to add missing constraints and indexes
async function migrate() {
  const client = await pool.connect();
  try {
    // Unique constraint on doctor_schedules (doctor + day)
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'doctor_schedules_doctor_id_day_of_week_key'
        ) THEN
          ALTER TABLE tenant_demo.doctor_schedules
          ADD CONSTRAINT doctor_schedules_doctor_id_day_of_week_key
          UNIQUE (doctor_id, day_of_week);
        END IF;
      END $$;
    `);
    console.log('✓ doctor_schedules unique constraint');

    // Allow NULL appointment_time (walk-ins and emergency have no time slot)
    await client.query(`
      ALTER TABLE tenant_demo.appointments
      ALTER COLUMN appointment_time DROP NOT NULL;
    `);
    console.log('✓ appointment_time now nullable');

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
