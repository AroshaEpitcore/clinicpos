require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, queryPublic } = require('../config/db');
const { createTenantSchema } = require('./createTenantSchema');

const SUBDOMAIN   = 'demo';
const SCHEMA_NAME = `tenant_${SUBDOMAIN}`;

const CLINIC = {
  clinic_name:  'Demo Clinic',
  subdomain:    SUBDOMAIN,
  owner_email:  'owner@democlinic.com',
  owner_phone:  '+94771234567',
  plan:         'premium',
  status:       'active',
};

// Test staff — one per role
const STAFF = [
  { full_name: 'Dr. James Silva',  email: 'doctor@demo.com',       password: 'password123', role: 'doctor',       specialization: 'General Medicine' },
  { full_name: 'Sarah Perera',     email: 'receptionist@demo.com', password: 'password123', role: 'receptionist', specialization: null },
  { full_name: 'Nurse Nimali',     email: 'nurse@demo.com',        password: 'password123', role: 'nurse',        specialization: null },
  { full_name: 'Admin User',       email: 'admin@demo.com',        password: 'password123', role: 'admin',        specialization: null },
];

const DEFAULT_FLAGS = ['pharmacy', 'lab', 'insurance', 'online_booking', 'multi_branch'];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...\n');

    // ── 1. Create tenant ─────────────────────────────────────────────────────
    const existing = await client.query(
      `SELECT id FROM public.tenants WHERE subdomain = $1`, [SUBDOMAIN]
    );

    let tenantId;
    if (existing.rows.length > 0) {
      tenantId = existing.rows[0].id;
      console.log(`✓ Tenant "${SUBDOMAIN}" already exists — skipping creation`);
    } else {
      const res = await client.query(
        `INSERT INTO public.tenants (clinic_name, subdomain, owner_email, owner_phone, plan, status)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [CLINIC.clinic_name, CLINIC.subdomain, CLINIC.owner_email, CLINIC.owner_phone, CLINIC.plan, CLINIC.status]
      );
      tenantId = res.rows[0].id;
      console.log(`✓ Tenant created — id: ${tenantId}`);
    }

    // ── 2. Feature flags ─────────────────────────────────────────────────────
    for (const module of DEFAULT_FLAGS) {
      await client.query(
        `INSERT INTO public.feature_flags (tenant_id, module, enabled)
         VALUES ($1,$2,$3)
         ON CONFLICT (tenant_id, module) DO NOTHING`,
        [tenantId, module, true]   // all ON for the demo clinic
      );
    }
    console.log('✓ Feature flags inserted (all ON for demo)');

    // ── 3. Create tenant schema + all tables ─────────────────────────────────
    await createTenantSchema(client, SCHEMA_NAME);
    console.log(`✓ Schema "${SCHEMA_NAME}" and all tables created`);

    // ── 4. Insert clinic_settings ─────────────────────────────────────────────
    await client.query(`SET search_path TO "${SCHEMA_NAME}"`);
    const settingsExists = await client.query(`SELECT id FROM clinic_settings LIMIT 1`);
    if (settingsExists.rows.length === 0) {
      await client.query(
        `INSERT INTO clinic_settings (clinic_name, currency, tax_rate, allow_walk_ins)
         VALUES ($1, $2, $3, $4)`,
        [CLINIC.clinic_name, 'LKR', 0, true]
      );
      console.log('✓ clinic_settings row inserted');
    }

    // ── 5. Create staff accounts ──────────────────────────────────────────────
    for (const s of STAFF) {
      const exists = await client.query(
        `SELECT id FROM staff WHERE email = $1`, [s.email]
      );
      if (exists.rows.length > 0) {
        console.log(`  ↳ Staff "${s.email}" already exists — skipping`);
        continue;
      }
      const hash = await bcrypt.hash(s.password, 10);
      const staffRes = await client.query(
        `INSERT INTO staff (full_name, email, password_hash, role, specialization)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [s.full_name, s.email, hash, s.role, s.specialization]
      );

      // Insert doctor fee for doctor role
      if (s.role === 'doctor') {
        await client.query(
          `INSERT INTO doctor_fees (doctor_id, fee_label, amount)
           VALUES ($1,$2,$3)`,
          [staffRes.rows[0].id, 'Consultation Fee', 1500.00]
        );
      }
      console.log(`✓ Staff created — ${s.role}: ${s.email}`);
    }

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log('\n─────────────────────────────────────────');
    console.log('Seed complete. Test login credentials:\n');
    for (const s of STAFF) {
      console.log(`  ${s.role.padEnd(14)} ${s.email}  /  password123`);
    }
    console.log('\nTenant subdomain : demo');
    console.log('In .env set      : VITE_TENANT_SUBDOMAIN=demo');
    console.log('─────────────────────────────────────────\n');

  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
