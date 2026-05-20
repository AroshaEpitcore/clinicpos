/**
 * Creates all tables inside a tenant schema.
 * Called when a new clinic is registered (from seed or admin panel).
 *
 * @param {import('pg').PoolClient} client
 * @param {string} schemaName  e.g. "tenant_drsilva"
 */
async function createTenantSchema(client, schemaName) {
  await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await client.query(`SET search_path TO "${schemaName}"`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS staff (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name        VARCHAR(255) NOT NULL,
      email            VARCHAR(255) NOT NULL UNIQUE,
      phone            VARCHAR(20),
      password_hash    VARCHAR(255) NOT NULL,
      role             VARCHAR(50)  NOT NULL,
      specialization   VARCHAR(100),
      signature_url    VARCHAR(500),
      avatar_url       VARCHAR(500),
      registration_no  VARCHAR(100),
      is_active        BOOLEAN      DEFAULT TRUE,
      created_at       TIMESTAMP    DEFAULT NOW(),
      updated_at       TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS clinic_settings (
      id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinic_name              VARCHAR(255) NOT NULL,
      clinic_logo_url          VARCHAR(500),
      clinic_logo_filename     VARCHAR(255),
      clinic_address           TEXT,
      clinic_phone             VARCHAR(20),
      clinic_email             VARCHAR(255),
      receipt_header           TEXT,
      receipt_footer           TEXT,
      prescription_footer      TEXT,
      currency                 VARCHAR(10)   DEFAULT 'LKR',
      tax_rate                 DECIMAL(5,2)  DEFAULT 0.00,
      tax_label                VARCHAR(50)   DEFAULT 'Tax',
      appointment_slot_duration INTEGER      DEFAULT 15,
      max_patients_per_day     INTEGER       DEFAULT 0,
      patient_portal_enabled   BOOLEAN       DEFAULT FALSE,
      reminder_enabled         BOOLEAN       DEFAULT FALSE,
      reminder_hours_before    INTEGER       DEFAULT 24,
      reminder_message         TEXT,
      session_timeout_minutes  INTEGER       DEFAULT 30,
      allow_walk_ins           BOOLEAN       DEFAULT TRUE,
      duplicate_check_enabled  BOOLEAN       DEFAULT TRUE,
      queue_display_enabled    BOOLEAN       DEFAULT FALSE,
      patient_login_enabled    BOOLEAN       DEFAULT FALSE,
      website_enabled          BOOLEAN       DEFAULT TRUE,
      website_tagline          VARCHAR(255),
      website_about            TEXT,
      website_hours            TEXT,
      website_map_url          VARCHAR(500),
      website_whatsapp         VARCHAR(30),
      website_facebook         VARCHAR(255),
      website_hero_url         VARCHAR(500),
      updated_at               TIMESTAMP     DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS doctor_fees (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id  UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      fee_label  VARCHAR(100)  DEFAULT 'Consultation Fee',
      amount     DECIMAL(10,2) DEFAULT 0.00,
      updated_at TIMESTAMP     DEFAULT NOW(),
      UNIQUE(doctor_id)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_code       VARCHAR(20)  NOT NULL UNIQUE,
      first_name         VARCHAR(100) NOT NULL,
      last_name          VARCHAR(100),
      date_of_birth      DATE,
      gender             VARCHAR(10),
      phone              VARCHAR(20)  NOT NULL,
      email              VARCHAR(255),
      address            TEXT,
      blood_group        VARCHAR(5),
      allergies          TEXT,
      emergency_name     VARCHAR(255),
      emergency_phone    VARCHAR(20),
      national_id        VARCHAR(50),
      insurance_provider VARCHAR(100),
      insurance_number   VARCHAR(100),
      is_active              BOOLEAN      DEFAULT TRUE,
      registered_by          UUID REFERENCES staff(id),
      portal_password_hash   TEXT,
      portal_registered_at   TIMESTAMPTZ,
      portal_last_login_at   TIMESTAMPTZ,
      created_at             TIMESTAMP    DEFAULT NOW(),
      updated_at             TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_patients_phone      ON patients(phone);
    CREATE INDEX IF NOT EXISTS idx_patients_name       ON patients(first_name, last_name);
    CREATE INDEX IF NOT EXISTS idx_patients_code       ON patients(patient_code);
    CREATE INDEX IF NOT EXISTS idx_patients_national   ON patients(national_id);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS clinic_holidays (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      holiday_date DATE         NOT NULL UNIQUE,
      label        VARCHAR(255) NOT NULL,
      created_by   UUID REFERENCES staff(id),
      created_at   TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doctor_id              UUID    NOT NULL REFERENCES staff(id),
      day_of_week            INTEGER NOT NULL,
      start_time             TIME    NOT NULL,
      end_time               TIME    NOT NULL,
      slot_duration_minutes  INTEGER DEFAULT 15,
      is_active              BOOLEAN DEFAULT TRUE,
      UNIQUE(doctor_id, day_of_week)
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id          UUID        NOT NULL REFERENCES patients(id),
      doctor_id           UUID        NOT NULL REFERENCES staff(id),
      appointment_date    DATE        NOT NULL,
      appointment_time    TIME,
      token_number        INTEGER,
      type                VARCHAR(20) DEFAULT 'booked',
      status              VARCHAR(20) DEFAULT 'pending',
      reason              TEXT,
      booked_online       BOOLEAN     DEFAULT FALSE,
      booked_by           UUID REFERENCES staff(id),
      notes               TEXT,
      booking_reference   VARCHAR(20),
      booking_source      VARCHAR(20) DEFAULT 'admin',
      patient_visit_type  VARCHAR(10) NOT NULL DEFAULT 'returning'
                            CHECK (patient_visit_type IN ('new','returning')),
      created_at          TIMESTAMP   DEFAULT NOW(),
      updated_at          TIMESTAMP   DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_appointments_doc_date_type
      ON appointments (doctor_id, appointment_date, patient_visit_type);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS consultations (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      appointment_id UUID REFERENCES appointments(id),
      patient_id     UUID         NOT NULL REFERENCES patients(id),
      doctor_id      UUID         NOT NULL REFERENCES staff(id),
      visit_date     TIMESTAMP    DEFAULT NOW(),
      chief_complaint TEXT,
      symptoms       TEXT,
      diagnosis      TEXT,
      icd_code       VARCHAR(20),
      notes          TEXT,
      bp_systolic    INTEGER,
      bp_diastolic   INTEGER,
      temperature    DECIMAL(4,1),
      weight         DECIMAL(5,1),
      pulse          INTEGER,
      follow_up_date DATE,
      created_at     TIMESTAMP    DEFAULT NOW(),
      updated_at     TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS medicines (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           VARCHAR(255) NOT NULL,
      generic_name   VARCHAR(255),
      brand          VARCHAR(255),
      category       VARCHAR(100),
      unit           VARCHAR(50)  NOT NULL,
      strength       VARCHAR(50),
      stock_quantity INTEGER      DEFAULT 0,
      reorder_level  INTEGER      DEFAULT 10,
      selling_price  DECIMAL(10,2),
      expiry_date    DATE,
      is_active      BOOLEAN      DEFAULT TRUE,
      created_at     TIMESTAMP    DEFAULT NOW(),
      updated_at     TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rx_number       VARCHAR(20)  NOT NULL UNIQUE,
      consultation_id UUID                  REFERENCES consultations(id),
      patient_id      UUID         NOT NULL REFERENCES patients(id),
      doctor_id       UUID         NOT NULL REFERENCES staff(id),
      notes           TEXT,
      is_dispensed    BOOLEAN      DEFAULT FALSE,
      dispensed_at    TIMESTAMP,
      dispensed_by    UUID         REFERENCES staff(id),
      created_at      TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS prescription_items (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prescription_id      UUID         NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
      medicine_id          UUID         REFERENCES medicines(id),          -- nullable for custom medicines
      custom_medicine_name VARCHAR(255),                                   -- used when medicine not in store
      dosage               VARCHAR(100) NOT NULL,
      frequency            VARCHAR(100) NOT NULL,
      duration             VARCHAR(100) NOT NULL,
      instructions         TEXT,
      quantity_given       INTEGER
    );
  `);

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
    );
  `);

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
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id  UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description VARCHAR(255)  NOT NULL,
      item_type   VARCHAR(50)   NOT NULL,
      quantity    INTEGER       DEFAULT 1,
      unit_price  DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS payment_splits (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id     UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      payment_method VARCHAR(50)   NOT NULL,
      amount         DECIMAL(10,2) NOT NULL,
      reference      VARCHAR(255),
      recorded_by    UUID REFERENCES staff(id),
      recorded_at    TIMESTAMP     DEFAULT NOW()
    );
  `);

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
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type         VARCHAR(100) NOT NULL,
      title        VARCHAR(255) NOT NULL,
      message      TEXT         NOT NULL,
      target_role  VARCHAR(50),
      reference_id UUID,
      is_read      BOOLEAN      DEFAULT FALSE,
      created_at   TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS patient_portal_users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id    UUID         NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      email         VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_verified   BOOLEAN      DEFAULT FALSE,
      verify_token  VARCHAR(255),
      reset_token   VARCHAR(255),
      last_login    TIMESTAMP,
      is_active     BOOLEAN      DEFAULT TRUE,
      created_at    TIMESTAMP    DEFAULT NOW(),
      updated_at    TIMESTAMP    DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      staff_id   UUID REFERENCES staff(id),
      action     VARCHAR(100) NOT NULL,
      table_name VARCHAR(100),
      record_id  UUID,
      old_value  JSONB,
      new_value  JSONB,
      ip_address VARCHAR(45),
      created_at TIMESTAMP    DEFAULT NOW()
    );
  `);

  // ── Pharmacy module ────────────────────────────────────────────────────────

  await client.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
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
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_number     VARCHAR(20)   NOT NULL UNIQUE,
      supplier_id   UUID REFERENCES suppliers(id),
      status        VARCHAR(20)   DEFAULT 'draft',
      order_date    DATE          DEFAULT CURRENT_DATE,
      received_date DATE,
      notes         TEXT,
      total_cost    DECIMAL(10,2) DEFAULT 0,
      created_by    UUID NOT NULL REFERENCES staff(id),
      created_at    TIMESTAMP     DEFAULT NOW(),
      updated_at    TIMESTAMP     DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS purchase_order_items (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      po_id             UUID    NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
      medicine_id       UUID    NOT NULL REFERENCES medicines(id),
      quantity_ordered  INTEGER NOT NULL,
      quantity_received INTEGER DEFAULT 0,
      cost_price        DECIMAL(10,2),
      created_at        TIMESTAMP DEFAULT NOW()
    );
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      medicine_id UUID    NOT NULL REFERENCES medicines(id),
      type        VARCHAR(20) NOT NULL,
      quantity    INTEGER     NOT NULL,
      reason      TEXT,
      adjusted_by UUID NOT NULL REFERENCES staff(id),
      created_at  TIMESTAMP DEFAULT NOW()
    );
  `);

  // ── Lab module ─────────────────────────────────────────────────────────────

  await client.query(`
    CREATE TABLE IF NOT EXISTS lab_tests (
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

  await client.query(`
    CREATE TABLE IF NOT EXISTS lab_requests (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id      UUID NOT NULL REFERENCES patients(id),
      consultation_id UUID REFERENCES consultations(id),
      test_id         UUID NOT NULL REFERENCES lab_tests(id),
      requested_by    UUID NOT NULL REFERENCES staff(id),
      status          VARCHAR(20) DEFAULT 'pending',
      notes           TEXT,
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
  `);

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

  // ── Insurance module ───────────────────────────────────────────────────────

  await client.query(`
    CREATE TABLE IF NOT EXISTS insurance_providers (
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
    INSERT INTO insurance_providers (name, phone, notes) VALUES
      ('Ceylinco Life Insurance',  '+94 11 2 999 999', 'Pre-authorization required for procedures over LKR 10,000'),
      ('AIA Insurance',            '+94 11 2 308 308', 'Email claims to: claims@aia.lk'),
      ('Union Assurance',          '+94 11 5 364 364', 'Claim form required within 30 days of treatment'),
      ('Softlogic Life Insurance', '+94 11 7 255 255', NULL)
    ON CONFLICT DO NOTHING;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS corporate_accounts (
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
    ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS corporate_account_id INTEGER REFERENCES corporate_accounts(id);
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS insurance_claims (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id      UUID    NOT NULL REFERENCES invoices(id),
      patient_id      UUID    NOT NULL REFERENCES patients(id),
      provider_id     INTEGER REFERENCES insurance_providers(id),
      claim_number    VARCHAR(50),
      claim_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
      amount_claimed  DECIMAL(10,2) NOT NULL,
      amount_approved DECIMAL(10,2),
      status          VARCHAR(20)   NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','submitted','approved','partial','rejected')),
      notes           TEXT,
      submitted_at    TIMESTAMP,
      resolved_at     TIMESTAMP,
      created_by      UUID REFERENCES staff(id),
      created_at      TIMESTAMP DEFAULT NOW(),
      updated_at      TIMESTAMP DEFAULT NOW()
    );
  `);
}

module.exports = { createTenantSchema };
