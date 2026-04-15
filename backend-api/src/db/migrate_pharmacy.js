require('dotenv').config();
const { pool } = require('../config/db');

// Change this to your actual demo tenant subdomain
const DEMO_SUBDOMAIN = process.env.DEMO_SUBDOMAIN || 'demo';
const SCHEMA = `tenant_${DEMO_SUBDOMAIN}`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${SCHEMA}, public`);
    console.log(`Running pharmacy migration on schema: ${SCHEMA}`);

    // ── suppliers ──────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(255) NOT NULL,
        contact     VARCHAR(255),
        phone       VARCHAR(50),
        email       VARCHAR(255),
        address     TEXT,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMP DEFAULT NOW(),
        updated_at  TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ suppliers');

    // ── purchase_orders ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_number      VARCHAR(20) NOT NULL UNIQUE,
        supplier_id    UUID REFERENCES suppliers(id),
        status         VARCHAR(20) DEFAULT 'draft',
        order_date     DATE DEFAULT CURRENT_DATE,
        received_date  DATE,
        notes          TEXT,
        total_cost     DECIMAL(10,2) DEFAULT 0,
        created_by     UUID NOT NULL REFERENCES staff(id),
        created_at     TIMESTAMP DEFAULT NOW(),
        updated_at     TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ purchase_orders');

    // ── purchase_order_items ───────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id             UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        medicine_id       UUID NOT NULL REFERENCES medicines(id),
        quantity_ordered  INTEGER NOT NULL,
        quantity_received INTEGER DEFAULT 0,
        cost_price        DECIMAL(10,2),
        created_at        TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ purchase_order_items');

    // ── stock_adjustments ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        medicine_id  UUID NOT NULL REFERENCES medicines(id),
        type         VARCHAR(20) NOT NULL,
        quantity     INTEGER NOT NULL,
        reason       TEXT,
        adjusted_by  UUID NOT NULL REFERENCES staff(id),
        created_at   TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ stock_adjustments');

    // ── Add dispensing columns to prescriptions ────────────────────────────────
    await client.query(`
      ALTER TABLE prescriptions
        ADD COLUMN IF NOT EXISTS is_dispensed  BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS dispensed_at  TIMESTAMP,
        ADD COLUMN IF NOT EXISTS dispensed_by  UUID REFERENCES staff(id);
    `);
    console.log('✓ prescriptions — dispensing columns added');

    console.log('\n✅ Pharmacy migration complete.');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
