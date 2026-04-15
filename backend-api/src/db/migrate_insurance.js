require('dotenv').config();
const { pool } = require('../config/db');

const DEMO_SUBDOMAIN = process.env.DEMO_SUBDOMAIN || 'demo';
const SCHEMA = `tenant_${DEMO_SUBDOMAIN}`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}, public`);
    console.log(`Running insurance migration on schema: ${SCHEMA}`);

    // ── insurance_providers ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS insurance_providers (
        id              SERIAL PRIMARY KEY,
        name            VARCHAR(200) NOT NULL,
        contact_person  VARCHAR(100),
        phone           VARCHAR(20),
        email           VARCHAR(100),
        notes           TEXT,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ insurance_providers');

    // ── corporate_accounts ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS corporate_accounts (
        id              SERIAL PRIMARY KEY,
        company_name    VARCHAR(200) NOT NULL,
        contact_person  VARCHAR(100),
        phone           VARCHAR(20),
        email           VARCHAR(100),
        address         TEXT,
        billing_cycle   VARCHAR(20) DEFAULT 'monthly'
                          CHECK (billing_cycle IN ('monthly', 'quarterly')),
        credit_limit    DECIMAL(10,2),
        notes           TEXT,
        is_active       BOOLEAN DEFAULT TRUE,
        created_at      TIMESTAMP DEFAULT NOW(),
        updated_at      TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ corporate_accounts');

    // ── patients — add corporate_account_id column ────────────────────────────
    await client.query(`
      ALTER TABLE patients
        ADD COLUMN IF NOT EXISTS corporate_account_id INTEGER REFERENCES corporate_accounts(id);
    `);
    console.log('✓ patients.corporate_account_id added');

    // ── insurance_claims ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS insurance_claims (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id       UUID NOT NULL REFERENCES invoices(id),
        patient_id       UUID NOT NULL REFERENCES patients(id),
        provider_id      INTEGER REFERENCES insurance_providers(id),
        claim_number     VARCHAR(50),
        claim_date       DATE NOT NULL DEFAULT CURRENT_DATE,
        amount_claimed   DECIMAL(10,2) NOT NULL,
        amount_approved  DECIMAL(10,2),
        status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','submitted','approved','partial','rejected')),
        notes            TEXT,
        submitted_at     TIMESTAMP,
        resolved_at      TIMESTAMP,
        created_by       UUID REFERENCES staff(id),
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ insurance_claims');

    // ── Seed common insurance providers ───────────────────────────────────────
    await client.query(`
      INSERT INTO insurance_providers (name, phone, notes) VALUES
        ('Ceylinco Life Insurance',  '+94 11 2 999 999', 'Pre-authorization required for procedures over LKR 10,000'),
        ('AIA Insurance',            '+94 11 2 308 308', 'Email claims to: claims@aia.lk'),
        ('Union Assurance',          '+94 11 5 364 364', 'Claim form required within 30 days of treatment'),
        ('Softlogic Life Insurance', '+94 11 7 255 255', NULL)
      ON CONFLICT DO NOTHING;
    `);
    console.log('✓ insurance_providers seeded (4 common providers)');

    console.log('\n✅ Insurance migration complete.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
