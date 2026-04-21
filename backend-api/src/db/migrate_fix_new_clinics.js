/**
 * migrate_fix_new_clinics.js
 *
 * Brings ALL tenant schemas up to date with the current createTenantSchema.js.
 * Safe to re-run on any schema — uses IF NOT EXISTS and ON CONFLICT DO NOTHING.
 *
 * Run once on the server:
 *   node -r dotenv/config src/db/migrate_fix_new_clinics.js
 */

require('dotenv').config();
const { pool } = require('../config/db');

async function fixSchema(client, schema) {
  console.log(`\n── ${schema} ──`);

  // 1. clinic_settings — add queue_display_enabled
  await client.query(`
    ALTER TABLE "${schema}".clinic_settings
      ADD COLUMN IF NOT EXISTS queue_display_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  `);
  console.log('  ✓ clinic_settings.queue_display_enabled');

  // 2. prescriptions — add dispensing columns
  await client.query(`
    ALTER TABLE "${schema}".prescriptions
      ADD COLUMN IF NOT EXISTS is_dispensed BOOLEAN   DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS dispensed_by UUID      REFERENCES "${schema}".staff(id);
  `);
  console.log('  ✓ prescriptions dispensing columns');

  // 3. Pharmacy tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".suppliers (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name       VARCHAR(255) NOT NULL,
      contact    VARCHAR(255),
      phone      VARCHAR(50),
      email      VARCHAR(255),
      address    TEXT,
      is_active  BOOLEAN   DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".purchase_orders (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number     VARCHAR(20)   NOT NULL UNIQUE,
      supplier_id   UUID REFERENCES "${schema}".suppliers(id),
      status        VARCHAR(20)   DEFAULT 'draft',
      order_date    DATE          DEFAULT CURRENT_DATE,
      received_date DATE,
      notes         TEXT,
      total_cost    DECIMAL(10,2) DEFAULT 0,
      created_by    UUID NOT NULL REFERENCES "${schema}".staff(id),
      created_at    TIMESTAMP     DEFAULT NOW(),
      updated_at    TIMESTAMP     DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".purchase_order_items (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_id             UUID    NOT NULL REFERENCES "${schema}".purchase_orders(id) ON DELETE CASCADE,
      medicine_id       UUID    NOT NULL REFERENCES "${schema}".medicines(id),
      quantity_ordered  INTEGER NOT NULL,
      quantity_received INTEGER DEFAULT 0,
      cost_price        DECIMAL(10,2),
      created_at        TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".stock_adjustments (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      medicine_id UUID    NOT NULL REFERENCES "${schema}".medicines(id),
      type        VARCHAR(20) NOT NULL,
      quantity    INTEGER     NOT NULL,
      reason      TEXT,
      adjusted_by UUID NOT NULL REFERENCES "${schema}".staff(id),
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('  ✓ pharmacy tables');

  // 4. Lab tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".lab_tests (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name         VARCHAR(255) NOT NULL,
      code         VARCHAR(50),
      category     VARCHAR(100),
      description  TEXT,
      normal_range VARCHAR(255),
      unit         VARCHAR(50),
      price        DECIMAL(10,2) DEFAULT 0,
      is_active    BOOLEAN   DEFAULT TRUE,
      created_at   TIMESTAMP DEFAULT NOW(),
      updated_at   TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    INSERT INTO "${schema}".lab_tests (name, code, category, normal_range, unit, price) VALUES
      ('Full Blood Count',         'FBC',    'Haematology',  'See report',        '',       500),
      ('Blood Glucose (Fasting)',   'FBS',    'Biochemistry', '70–100 mg/dL',      'mg/dL',  300),
      ('Blood Glucose (Random)',    'RBS',    'Biochemistry', '<140 mg/dL',        'mg/dL',  300),
      ('HbA1c',                    'HBA1C',  'Biochemistry', '<5.7%',             '%',      800),
      ('Lipid Profile',            'LIPID',  'Biochemistry', 'See report',        '',       900),
      ('Serum Creatinine',         'CREAT',  'Biochemistry', '0.6–1.2 mg/dL',    'mg/dL',  400),
      ('Liver Function Test',      'LFT',    'Biochemistry', 'See report',        '',      1000),
      ('Thyroid Function Test',    'TFT',    'Endocrinology','See report',        '',      1200),
      ('Urine Full Report',        'UFR',    'Urology',      'See report',        '',       350),
      ('Widal Test',               'WIDAL',  'Microbiology', 'Negative',          '',       500),
      ('ESR',                      'ESR',    'Haematology',  'M: 0–15 / F: 0–20', 'mm/hr', 250),
      ('CRP',                      'CRP',    'Immunology',   '<10 mg/L',          'mg/L',   600)
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".lab_requests (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id      UUID NOT NULL REFERENCES "${schema}".patients(id),
      consultation_id UUID REFERENCES "${schema}".consultations(id),
      test_id         UUID NOT NULL REFERENCES "${schema}".lab_tests(id),
      requested_by    UUID NOT NULL REFERENCES "${schema}".staff(id),
      status          VARCHAR(20) DEFAULT 'pending',
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".lab_results (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      request_id      UUID NOT NULL REFERENCES "${schema}".lab_requests(id) ON DELETE CASCADE,
      result_value    TEXT,
      result_file_url TEXT,
      notes           TEXT,
      resulted_by     UUID NOT NULL REFERENCES "${schema}".staff(id),
      resulted_at     TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('  ✓ lab tables');

  // 5. Insurance tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".insurance_providers (
      id             SERIAL PRIMARY KEY,
      name           VARCHAR(200) NOT NULL,
      contact_person VARCHAR(100),
      phone          VARCHAR(20),
      email          VARCHAR(100),
      notes          TEXT,
      is_active      BOOLEAN   DEFAULT TRUE,
      created_at     TIMESTAMP DEFAULT NOW(),
      updated_at     TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    INSERT INTO "${schema}".insurance_providers (name, phone, notes) VALUES
      ('Ceylinco Life Insurance',  '+94 11 2 999 999', 'Pre-authorization required for procedures over LKR 10,000'),
      ('AIA Insurance',            '+94 11 2 308 308', 'Email claims to: claims@aia.lk'),
      ('Union Assurance',          '+94 11 5 364 364', 'Claim form required within 30 days of treatment'),
      ('Softlogic Life Insurance', '+94 11 7 255 255', NULL)
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".corporate_accounts (
      id             SERIAL PRIMARY KEY,
      company_name   VARCHAR(200) NOT NULL,
      contact_person VARCHAR(100),
      phone          VARCHAR(20),
      email          VARCHAR(100),
      address        TEXT,
      billing_cycle  VARCHAR(20) DEFAULT 'monthly'
                       CHECK (billing_cycle IN ('monthly', 'quarterly')),
      credit_limit   DECIMAL(10,2),
      notes          TEXT,
      is_active      BOOLEAN   DEFAULT TRUE,
      created_at     TIMESTAMP DEFAULT NOW(),
      updated_at     TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    ALTER TABLE "${schema}".patients
      ADD COLUMN IF NOT EXISTS corporate_account_id INTEGER
        REFERENCES "${schema}".corporate_accounts(id);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "${schema}".insurance_claims (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id      UUID    NOT NULL REFERENCES "${schema}".invoices(id),
      patient_id      UUID    NOT NULL REFERENCES "${schema}".patients(id),
      provider_id     INTEGER REFERENCES "${schema}".insurance_providers(id),
      claim_number    VARCHAR(50),
      claim_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
      amount_claimed  DECIMAL(10,2) NOT NULL,
      amount_approved DECIMAL(10,2),
      status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','submitted','approved','partial','rejected')),
      notes           TEXT,
      submitted_at    TIMESTAMP,
      resolved_at     TIMESTAMP,
      created_by      UUID REFERENCES "${schema}".staff(id),
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('  ✓ insurance tables');
}

async function run() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT schema_name FROM information_schema.schemata
       WHERE schema_name LIKE 'tenant_%'
       ORDER BY schema_name`
    );
    const schemas = result.rows.map(r => r.schema_name);

    if (!schemas.length) {
      console.log('No tenant schemas found.');
      return;
    }

    console.log(`Found ${schemas.length} tenant schema(s): ${schemas.join(', ')}`);

    for (const schema of schemas) {
      await fixSchema(client, schema);
    }

    console.log('\n✅ All tenant schemas are up to date.');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
