/**
 * migrate_billing.js
 * Adds Phase 2.5 billing tables to ALL existing tenant schemas.
 * Safe to re-run — uses CREATE TABLE IF NOT EXISTS.
 */
require('dotenv').config();
const { pool } = require('../config/db');

async function run() {
  const client = await pool.connect();
  try {
    // Get all tenant schemas
    const tenants = await client.query(
      `SELECT id, subdomain FROM public.tenants ORDER BY subdomain`
    );

    if (!tenants.rows.length) {
      console.log('No tenants found.');
      return;
    }

    for (const tenant of tenants.rows) {
      const schema = `tenant_${tenant.subdomain}`;
      console.log(`\nMigrating schema: ${schema} (${tenant.subdomain})`);

      await client.query(`SET search_path TO ${schema}, public`);

      // doctor_fees
      await client.query(`
        CREATE TABLE IF NOT EXISTS doctor_fees (
          id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          doctor_id  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
          fee_label  VARCHAR(100)  DEFAULT 'Consultation Fee',
          amount     DECIMAL(10,2) DEFAULT 0.00,
          updated_at TIMESTAMP     DEFAULT NOW(),
          UNIQUE(doctor_id)
        )
      `);
      console.log('  ✓ doctor_fees');

      // custom_services
      await client.query(`
        CREATE TABLE IF NOT EXISTS custom_services (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name        VARCHAR(255)  NOT NULL,
          category    VARCHAR(100),
          description TEXT,
          price       DECIMAL(10,2) DEFAULT 0.00,
          is_active   BOOLEAN       DEFAULT TRUE,
          created_by  UUID REFERENCES staff(id),
          created_at  TIMESTAMP     DEFAULT NOW(),
          updated_at  TIMESTAMP     DEFAULT NOW()
        )
      `);
      console.log('  ✓ custom_services');

      // invoices
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number  VARCHAR(20)   NOT NULL UNIQUE,
          consultation_id UUID REFERENCES consultations(id),
          patient_id      UUID          NOT NULL REFERENCES patients(id),
          generated_by    UUID          NOT NULL REFERENCES staff(id),
          subtotal        DECIMAL(10,2) DEFAULT 0,
          discount_amount DECIMAL(10,2) DEFAULT 0,
          discount_reason TEXT,
          tax_amount      DECIMAL(10,2) DEFAULT 0,
          total_amount    DECIMAL(10,2) NOT NULL,
          paid_amount     DECIMAL(10,2) DEFAULT 0,
          balance_due     DECIMAL(10,2) DEFAULT 0,
          payment_method  VARCHAR(50),
          payment_status  VARCHAR(20)   DEFAULT 'unpaid',
          paid_at         TIMESTAMP,
          notes           TEXT,
          created_at      TIMESTAMP     DEFAULT NOW(),
          updated_at      TIMESTAMP     DEFAULT NOW()
        )
      `);
      console.log('  ✓ invoices');

      // invoice_items
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id  UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          description VARCHAR(255)  NOT NULL,
          item_type   VARCHAR(50)   NOT NULL,
          quantity    INTEGER       DEFAULT 1,
          unit_price  DECIMAL(10,2) NOT NULL,
          total_price DECIMAL(10,2) NOT NULL
        )
      `);
      console.log('  ✓ invoice_items');

      // payment_splits
      await client.query(`
        CREATE TABLE IF NOT EXISTS payment_splits (
          id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_id     UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
          payment_method VARCHAR(50)   NOT NULL,
          amount         DECIMAL(10,2) NOT NULL,
          reference      VARCHAR(255),
          recorded_by    UUID REFERENCES staff(id),
          recorded_at    TIMESTAMP     DEFAULT NOW()
        )
      `);
      console.log('  ✓ payment_splits');

      // end_of_day
      await client.query(`
        CREATE TABLE IF NOT EXISTS end_of_day (
          id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          closing_date        DATE          NOT NULL UNIQUE,
          total_billed        DECIMAL(10,2) DEFAULT 0,
          total_collected     DECIMAL(10,2) DEFAULT 0,
          cash_system         DECIMAL(10,2) DEFAULT 0,
          cash_counted        DECIMAL(10,2) DEFAULT 0,
          cash_difference     DECIMAL(10,2) DEFAULT 0,
          card_total          DECIMAL(10,2) DEFAULT 0,
          online_total        DECIMAL(10,2) DEFAULT 0,
          insurance_total     DECIMAL(10,2) DEFAULT 0,
          total_patients      INTEGER       DEFAULT 0,
          total_invoices      INTEGER       DEFAULT 0,
          outstanding_balance DECIMAL(10,2) DEFAULT 0,
          notes               TEXT,
          closed_by           UUID NOT NULL REFERENCES staff(id),
          closed_at           TIMESTAMP     DEFAULT NOW()
        )
      `);
      console.log('  ✓ end_of_day');

      console.log(`  Schema ${schema} — all billing tables ready`);
    }

    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
