require('dotenv').config();
const { pool } = require('../config/db');

const DEMO_SUBDOMAIN = process.env.DEMO_SUBDOMAIN || 'demo';
const SCHEMA = `tenant_${DEMO_SUBDOMAIN}`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}, public`);
    console.log(`Running lab migration on schema: ${SCHEMA}`);

    // ── lab_tests ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_tests (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(255) NOT NULL,
        code          VARCHAR(50),
        category      VARCHAR(100),
        description   TEXT,
        normal_range  VARCHAR(255),
        unit          VARCHAR(50),
        price         DECIMAL(10,2) DEFAULT 0,
        is_active     BOOLEAN DEFAULT TRUE,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ lab_tests');

    // ── lab_requests ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_requests (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id       UUID NOT NULL REFERENCES patients(id),
        consultation_id  UUID REFERENCES consultations(id),
        test_id          UUID NOT NULL REFERENCES lab_tests(id),
        requested_by     UUID NOT NULL REFERENCES staff(id),
        status           VARCHAR(20) DEFAULT 'pending',
        notes            TEXT,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ lab_requests');

    // ── lab_results ───────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lab_results (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id      UUID NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
        result_value    TEXT,
        result_file_url TEXT,
        notes           TEXT,
        resulted_by     UUID NOT NULL REFERENCES staff(id),
        resulted_at     TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ lab_results');

    // ── Seed a few common lab tests ───────────────────────────────────────────
    await client.query(`
      INSERT INTO lab_tests (name, code, category, normal_range, unit, price) VALUES
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
    console.log('✓ lab_tests seeded (12 common tests)');

    console.log('\n✅ Lab migration complete.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
