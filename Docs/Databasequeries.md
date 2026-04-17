# databasequeries.md — Database Reference

> **Rule:** Every table creation, alteration, and key query must be recorded here.  
> Update this file BEFORE running any query. Verify and note the result AFTER.  
> Never change the database without updating this file first.

---

## Database Overview

```
Database name : clinicpos_db
Engine        : PostgreSQL
Query layer   : Raw SQL via pg pool — queryTenant(schema, sql, params) helper (no ORM)
Multi-tenant  : Schema-per-tenant (each clinic = isolated schema)
```

### Schema structure

```
clinicpos_db
├── public schema              — shared system tables (tenants, plans, flags)
└── tenant_{clinic_id} schema  — one per clinic (patients, records, billing...)
```

---

## Public Schema — Shared Tables

These tables are in the `public` schema. They are shared across all clinics.  
Only the backend and super admin can access these.

---

### Table: `tenants`

Stores every clinic registered in the system.

```sql
CREATE TABLE public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name   VARCHAR(255) NOT NULL,
  subdomain     VARCHAR(100) NOT NULL UNIQUE,   -- e.g. drsilva
  owner_email   VARCHAR(255) NOT NULL UNIQUE,
  owner_phone   VARCHAR(20),
  status        VARCHAR(20) DEFAULT 'active',  -- active | suspended | cancelled
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Note: plan and trial_ends_at columns were removed (2026-04-15).
-- No subscription tiers. Super admin manages access manually via feature flags and activate/suspend.
```

**Connects to:** `feature_flags`, `subscriptions`

**Clinic creation flow (all in one transaction — `POST /api/v1/admin/tenants`):**
```
1. INSERT public.tenants
2. INSERT public.feature_flags (all OFF)
3. createTenantSchema() — creates all tenant tables
4. INSERT clinic_settings (defaults)
5. INSERT staff (first admin account — owner_email + bcrypt(initial_password))
```
The first admin staff account is created automatically. Without it the clinic cannot log in.

---

### Table: `feature_flags`

Controls which modules are enabled per clinic.

```sql
CREATE TABLE public.feature_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module      VARCHAR(100) NOT NULL,   -- pharmacy | lab | insurance | online_booking
  enabled     BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, module)
);
```

**Connects to:** `tenants`

**Default rows inserted when a clinic is created:**
```sql
INSERT INTO public.feature_flags (tenant_id, module, enabled) VALUES
  ($1, 'pharmacy',       FALSE),
  ($1, 'lab',            FALSE),
  ($1, 'insurance',      FALSE),
  ($1, 'online_booking', FALSE),
  ($1, 'multi_branch',   FALSE);
```

---

### Table: `subscriptions`

Tracks payment and billing history per clinic.

```sql
CREATE TABLE public.subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
  plan          VARCHAR(50) NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  currency      VARCHAR(10) DEFAULT 'LKR',
  status        VARCHAR(20) DEFAULT 'pending',  -- pending | paid | overdue | cancelled
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  paid_at       TIMESTAMP,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `tenants`

---

## Tenant Schema — Per-Clinic Tables

All tables below are created inside `tenant_{clinic_id}` schema.  
Every query to these tables MUST include the correct schema prefix.

> Example: `SELECT * FROM tenant_drsilva.patients WHERE id = $1`

---

### Table: `staff`

All staff accounts for this clinic — doctors, nurses, receptionists, admins.

```sql
CREATE TABLE staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL,       -- doctor | nurse | receptionist | admin
  specialization VARCHAR(100),             -- for doctors only
  signature_url VARCHAR(500),              -- doctor's digital signature image for prescriptions
  avatar_url    VARCHAR(500),              -- profile photo
  registration_no VARCHAR(100),            -- medical registration number (doctors only)
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `appointments`, `consultations`, `invoices`, `audit_logs`

**Staff management queries (via `/api/v1/staff` — admin only):**
```sql
-- List all staff
SELECT id, full_name, email, phone, role, specialization, registration_no, is_active, created_at
FROM staff ORDER BY role, full_name;

-- Create staff (bcrypt hash password before insert)
INSERT INTO staff (full_name, email, phone, password_hash, role, specialization, registration_no, is_active)
VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING id, full_name, email, phone, role, is_active;

-- Deactivate staff (soft delete — never hard delete)
UPDATE staff SET is_active = FALSE, updated_at = NOW() WHERE id = $1;

-- Reset password
UPDATE staff SET password_hash = $1, updated_at = NOW() WHERE id = $2;
```

**Fix for clinics created before staff creation code existed (run once):**
```sql
-- Enable pgcrypto first (run once per database)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert admin staff for an existing empty clinic
SET search_path TO "tenant_yoursubdomain";
INSERT INTO staff (full_name, email, password_hash, role, is_active)
VALUES ('Admin', 'owner@email.com', crypt('yourpassword', gen_salt('bf')), 'admin', TRUE);
```

---

### Table: `patients`

Master patient registry. Created once, linked to everything.

```sql
CREATE TABLE patients (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code     VARCHAR(20) NOT NULL UNIQUE,  -- auto-generated e.g. PT-00234
  first_name       VARCHAR(100) NOT NULL,
  last_name        VARCHAR(100),                  -- optional (dropped NOT NULL 2026-04-16)
  date_of_birth    DATE,                          -- optional (dropped NOT NULL 2026-04-16)
  gender           VARCHAR(10),                   -- male | female | other — optional (dropped NOT NULL 2026-04-16)
  phone            VARCHAR(20) NOT NULL,
  email            VARCHAR(255),
  address          TEXT,
  blood_group      VARCHAR(5),                    -- A+ | B- | O+ etc.
  allergies        TEXT,
  emergency_name   VARCHAR(255),
  emergency_phone  VARCHAR(20),
  national_id      VARCHAR(50),
  insurance_provider VARCHAR(100),
  insurance_number   VARCHAR(100),
  is_active        BOOLEAN DEFAULT TRUE,
  registered_by    UUID REFERENCES staff(id),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `appointments`, `consultations`, `prescriptions`, `invoices`, `medical_records`

**Auto-generate patient code:**
```sql
-- Shared utility: utils/patientCode.js — nextPatientCode(schema)
-- Uses MAX on numeric suffix to handle gaps (deleted records don't reset the counter)
SELECT COALESCE(MAX(CAST(SUBSTRING(patient_code FROM 4) AS INTEGER)), 0) + 1 AS next
FROM patients
WHERE patient_code ~ '^PT-[0-9]+$';
-- Result formatted as: 'PT-' + zero-pad to 5 digits  (e.g. PT-00006)
```

---

### Table: `appointments`

All appointment bookings — both walk-in and pre-booked.

```sql
CREATE TABLE appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  doctor_id       UUID NOT NULL REFERENCES staff(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME,                          -- nullable: walk-ins may not have a time slot
  token_number    INTEGER,                        -- auto-assigned for walkin + emergency; null for booked
  type            VARCHAR(20) DEFAULT 'booked',   -- booked | walkin | emergency
  status          VARCHAR(20) DEFAULT 'pending',  -- pending | confirmed | arrived | completed | cancelled
  reason          TEXT,
  booked_online       BOOLEAN DEFAULT FALSE,
  booking_reference   VARCHAR(20),               -- BK-000001 — set for booked appointments (staff or online)
  booking_source      VARCHAR(20) DEFAULT 'admin', -- 'admin' (walk-in/emergency) | 'staff' (booked by staff) | 'online' (portal)
  booked_by           UUID REFERENCES staff(id), -- null if booked by patient online
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- Phase 5.4 migration (safe to run on existing DB — for clinics created before Phase 5.4):
-- ALTER TABLE appointments
--   ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20),
--   ADD COLUMN IF NOT EXISTS booking_source VARCHAR(20) DEFAULT 'admin';

-- Note (2026-04-15): createTenantSchema.js was updated to include these columns.
-- All NEW clinics created from the admin panel will have them automatically.
-- Only OLD clinics (created before this date) need the ALTER TABLE migration above.
```

**Connects to:** `patients`, `staff`, `consultations`

**Get today's appointments for a doctor:**
```sql
SELECT
  a.id,
  a.token_number,
  a.appointment_time,
  a.status,
  a.type,
  p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
  p.phone
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE a.doctor_id = $1
  AND a.appointment_date = CURRENT_DATE
ORDER BY a.appointment_time ASC;
```

**Check if a time slot is available:**
```sql
SELECT COUNT(*) FROM appointments
WHERE doctor_id = $1
  AND appointment_date = $2
  AND appointment_time = $3
  AND status NOT IN ('cancelled');
```

---

### Table: `doctor_schedules`

Defines each doctor's working days and available time slots.

```sql
CREATE TABLE doctor_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES staff(id),
  day_of_week INTEGER NOT NULL,        -- 0=Sunday, 1=Monday ... 6=Saturday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 15,
  is_active   BOOLEAN DEFAULT TRUE
);
```

**Connects to:** `staff`, `appointments`

**Get available slots for a doctor on a date:**
```sql
SELECT
  gs.slot_time,
  CASE WHEN a.id IS NULL THEN true ELSE false END AS is_available
FROM generate_series(
  ds.start_time::TIMESTAMP,
  ds.end_time::TIMESTAMP - (ds.slot_duration_minutes || ' minutes')::INTERVAL,
  (ds.slot_duration_minutes || ' minutes')::INTERVAL
) AS gs(slot_time)
LEFT JOIN appointments a
  ON a.doctor_id = $1
  AND a.appointment_date = $2
  AND a.appointment_time = gs.slot_time::TIME
  AND a.status NOT IN ('cancelled')
JOIN doctor_schedules ds ON ds.doctor_id = $1
  AND ds.day_of_week = EXTRACT(DOW FROM $2::DATE)
  AND ds.is_active = TRUE;
```

---

### Table: `consultations`

One record per clinic visit. Created by the doctor during the appointment.

```sql
CREATE TABLE consultations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES appointments(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  doctor_id       UUID NOT NULL REFERENCES staff(id),
  visit_date      TIMESTAMP DEFAULT NOW(),
  chief_complaint TEXT,
  symptoms        TEXT,
  diagnosis       TEXT,
  icd_code        VARCHAR(20),           -- ICD-10 diagnosis code
  notes           TEXT,
  bp_systolic     INTEGER,               -- blood pressure
  bp_diastolic    INTEGER,
  temperature     DECIMAL(4,1),          -- in Celsius
  weight          DECIMAL(5,1),          -- in kg
  pulse           INTEGER,               -- beats per minute
  follow_up_date  DATE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `appointments`, `patients`, `staff`, `prescriptions`, `invoices`

**Get full visit history for a patient:**
```sql
SELECT
  c.visit_date,
  c.chief_complaint,
  c.diagnosis,
  c.notes,
  s.full_name AS doctor_name
FROM consultations c
JOIN staff s ON s.id = c.doctor_id
WHERE c.patient_id = $1
ORDER BY c.visit_date DESC;
```

---

### Table: `medicines`

The clinic medicine store / inventory database.

```sql
CREATE TABLE medicines (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  generic_name    VARCHAR(255),
  brand           VARCHAR(255),
  category        VARCHAR(100),           -- antibiotic | painkiller | vitamin etc.
  unit            VARCHAR(50) NOT NULL,   -- tablet | capsule | syrup | injection
  strength        VARCHAR(50),            -- e.g. 500mg | 10ml
  stock_quantity  INTEGER DEFAULT 0,
  reorder_level   INTEGER DEFAULT 10,     -- alert when stock drops below this
  selling_price   DECIMAL(10,2),
  expiry_date     DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `prescription_items`, `invoice_items`

**Get low stock medicines:**
```sql
SELECT name, generic_name, unit, stock_quantity, reorder_level
FROM medicines
WHERE stock_quantity <= reorder_level
  AND is_active = TRUE
ORDER BY stock_quantity ASC;
```

---

### Table: `prescriptions`

One prescription per consultation. Links to prescription items.

```sql
CREATE TABLE prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rx_number       VARCHAR(20) NOT NULL UNIQUE,  -- auto-generated e.g. RX-00891
  consultation_id UUID REFERENCES consultations(id),  -- nullable: Rx can exist without a linked consultation
  patient_id      UUID NOT NULL REFERENCES patients(id),
  doctor_id       UUID NOT NULL REFERENCES staff(id),
  notes           TEXT,                          -- general prescription notes
  created_at      TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `consultations`, `patients`, `staff`, `prescription_items`  
**Note:** `consultation_id` was originally NOT NULL — changed to nullable via `migrate_prescription_consultation_nullable.js` (2026-04-16) to allow standalone prescriptions.

---

### Table: `prescription_items`

Individual medicines in a prescription.

```sql
CREATE TABLE prescription_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id  UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id      UUID NOT NULL REFERENCES medicines(id),
  dosage           VARCHAR(100) NOT NULL,    -- e.g. 1 tablet
  frequency        VARCHAR(100) NOT NULL,    -- e.g. 3 times a day
  duration         VARCHAR(100) NOT NULL,    -- e.g. 5 days
  instructions     TEXT,                     -- e.g. take after food
  quantity_given   INTEGER                   -- dispensed from pharmacy
);
```

**Connects to:** `prescriptions`, `medicines`

**Get full prescription with medicine details:**
```sql
SELECT
  p.rx_number,
  p.created_at,
  s.full_name AS doctor_name,
  m.name AS medicine_name,
  m.strength,
  m.unit,
  pi.dosage,
  pi.frequency,
  pi.duration,
  pi.instructions
FROM prescriptions p
JOIN staff s ON s.id = p.doctor_id
JOIN prescription_items pi ON pi.prescription_id = p.id
JOIN medicines m ON m.id = pi.medicine_id
WHERE p.patient_id = $1
ORDER BY p.created_at DESC;
```

---

### Table: `invoices`

One invoice per visit. Generated by receptionist after consultation.

```sql
CREATE TABLE invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number  VARCHAR(20) NOT NULL UNIQUE,  -- e.g. INV-00456
  consultation_id UUID REFERENCES consultations(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  generated_by    UUID NOT NULL REFERENCES staff(id),  -- receptionist
  subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_reason TEXT,
  tax_amount      DECIMAL(10,2) DEFAULT 0,
  total_amount    DECIMAL(10,2) NOT NULL,
  paid_amount     DECIMAL(10,2) DEFAULT 0,
  balance_due     DECIMAL(10,2) DEFAULT 0,
  payment_method  VARCHAR(50),    -- cash | card | online | insurance
  payment_status  VARCHAR(20) DEFAULT 'unpaid',  -- unpaid | partial | paid
  paid_at         TIMESTAMP,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `consultations`, `patients`, `staff`, `invoice_items`

**Get all unpaid invoices:**
```sql
SELECT
  i.invoice_number,
  i.created_at,
  i.total_amount,
  i.paid_amount,
  i.balance_due,
  p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
  p.phone
FROM invoices i
JOIN patients p ON p.id = i.patient_id
WHERE i.payment_status IN ('unpaid', 'partial')
ORDER BY i.created_at ASC;
```

---

### Table: `invoice_items`

Line items inside an invoice (consultation fee, medicines, procedures).

```sql
CREATE TABLE invoice_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description   VARCHAR(255) NOT NULL,   -- e.g. Consultation Fee, Paracetamol 500mg
  item_type     VARCHAR(50) NOT NULL,    -- consultation | medicine | procedure | lab
  quantity      INTEGER DEFAULT 1,
  unit_price    DECIMAL(10,2) NOT NULL,
  total_price   DECIMAL(10,2) NOT NULL
);
```

**Connects to:** `invoices`

---

### Table: `clinic_settings`

Stores each clinic's own customizable configuration. Lives inside the tenant schema.  
Every clinic has exactly one row here. Changing this only affects that clinic — never others.

```sql
CREATE TABLE clinic_settings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name               VARCHAR(255) NOT NULL,
  clinic_logo_url           VARCHAR(500),              -- uploaded logo file path. NOTE: portal.routes.js selects this as `clinic_logo_url AS logo_url`
  clinic_logo_filename      VARCHAR(255),              -- original filename for reference
  clinic_address            TEXT,
  clinic_phone              VARCHAR(20),
  clinic_email              VARCHAR(255),
  receipt_header            TEXT,                      -- printed at top of every invoice/receipt
  receipt_footer            TEXT,                      -- printed at bottom (e.g. "Thank you for visiting")
  prescription_footer       TEXT,                      -- footer on prescription prints
  currency                  VARCHAR(10) DEFAULT 'LKR',
  tax_rate                  DECIMAL(5,2) DEFAULT 0.00, -- percentage e.g. 8.00 for 8%
  tax_label                 VARCHAR(50) DEFAULT 'Tax',
  appointment_slot_duration INTEGER DEFAULT 15,         -- minutes per slot
  max_patients_per_day      INTEGER DEFAULT 0,          -- 0 = unlimited
  patient_portal_enabled    BOOLEAN DEFAULT FALSE,      -- online booking on/off
  reminder_enabled          BOOLEAN DEFAULT FALSE,      -- SMS/WhatsApp reminders on/off
  reminder_hours_before     INTEGER DEFAULT 24,         -- how many hours before to send reminder
  reminder_message          TEXT,                      -- custom reminder message template
  session_timeout_minutes   INTEGER DEFAULT 30,         -- auto logout timer
  allow_walk_ins            BOOLEAN DEFAULT TRUE,       -- walk-in queue on/off
  duplicate_check_enabled   BOOLEAN DEFAULT TRUE,       -- warn if similar patient exists on registration
  updated_at                TIMESTAMP DEFAULT NOW()
);
```

**Who uses it:** Clinic admin edits this. Backend reads it for every invoice and receipt generated.  
**Connects to:** Nothing — standalone settings row per tenant.

**Get clinic settings:**
```sql
SELECT * FROM clinic_settings LIMIT 1;
```

**Update receipt header:**
```sql
UPDATE clinic_settings
SET receipt_header = $1, updated_at = NOW();
```

---

### Table: `doctor_fees`

Each doctor in the clinic can have their own consultation fee.  
Clinic admin sets this. It auto-fills when a consultation invoice is created.

```sql
CREATE TABLE doctor_fees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  fee_label     VARCHAR(100) DEFAULT 'Consultation Fee',
  amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(doctor_id)
);
```

**Connects to:** `staff`, `invoice_items` (auto-pulled when generating an invoice)

---

### Table: `custom_services`

Clinic-defined service items (procedures, tests, treatments) with prices.  
Admin adds these once. Receptionist picks from this list when building an invoice.

```sql
CREATE TABLE custom_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(100),              -- procedure | lab | treatment | other
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES staff(id),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `invoice_items` (picked when adding a line item to an invoice)

---

### Table: `payment_splits`

Handles cases where a patient pays using more than one payment method.  
e.g. half cash, half insurance. One invoice can have multiple payment split rows.

```sql
CREATE TABLE payment_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_method  VARCHAR(50) NOT NULL,   -- cash | card | online | insurance | corporate
  amount          DECIMAL(10,2) NOT NULL,
  reference       VARCHAR(255),           -- card ref, insurance claim no, etc.
  recorded_by     UUID REFERENCES staff(id),
  recorded_at     TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `invoices`, `staff`

**Get all payment splits for an invoice:**
```sql
SELECT
  ps.payment_method,
  ps.amount,
  ps.reference,
  ps.recorded_at,
  s.full_name AS recorded_by
FROM payment_splits ps
LEFT JOIN staff s ON s.id = ps.recorded_by
WHERE ps.invoice_id = $1
ORDER BY ps.recorded_at ASC;
```

---

### Table: `end_of_day`

Daily closing record. Receptionist or admin closes the day, records cash counted vs system total.

```sql
CREATE TABLE end_of_day (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date        DATE NOT NULL UNIQUE,
  total_billed        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_collected     DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_system         DECIMAL(10,2) DEFAULT 0,   -- what system shows as cash collected
  cash_counted        DECIMAL(10,2) DEFAULT 0,   -- what staff physically counted
  cash_difference     DECIMAL(10,2) DEFAULT 0,   -- cash_counted - cash_system
  card_total          DECIMAL(10,2) DEFAULT 0,
  online_total        DECIMAL(10,2) DEFAULT 0,
  insurance_total     DECIMAL(10,2) DEFAULT 0,
  total_patients      INTEGER DEFAULT 0,
  total_invoices      INTEGER DEFAULT 0,
  outstanding_balance DECIMAL(10,2) DEFAULT 0,
  notes               TEXT,
  closed_by           UUID NOT NULL REFERENCES staff(id),
  closed_at           TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `staff`

**Generate end of day summary:**
```sql
SELECT
  COUNT(DISTINCT a.patient_id)        AS total_patients,
  COUNT(DISTINCT i.id)                AS total_invoices,
  COALESCE(SUM(i.total_amount), 0)    AS total_billed,
  COALESCE(SUM(i.paid_amount), 0)     AS total_collected,
  COALESCE(SUM(i.balance_due), 0)     AS outstanding_balance,
  COALESCE(SUM(CASE WHEN i.payment_method = 'cash'      THEN i.paid_amount ELSE 0 END), 0) AS cash_total,
  COALESCE(SUM(CASE WHEN i.payment_method = 'card'      THEN i.paid_amount ELSE 0 END), 0) AS card_total,
  COALESCE(SUM(CASE WHEN i.payment_method = 'online'    THEN i.paid_amount ELSE 0 END), 0) AS online_total,
  COALESCE(SUM(CASE WHEN i.payment_method = 'insurance' THEN i.paid_amount ELSE 0 END), 0) AS insurance_total
FROM invoices i
LEFT JOIN appointments a ON a.id = i.consultation_id
WHERE DATE(i.created_at) = $1;
```

---

### Table: `clinic_holidays`

Defines clinic-off days and public holidays per clinic.  
Appointment booking is blocked on these dates automatically.

```sql
CREATE TABLE clinic_holidays (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  label       VARCHAR(255) NOT NULL,   -- e.g. "Christmas Day", "Staff Training"
  created_by  UUID REFERENCES staff(id),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `appointments` (checked before allowing booking on a date)

---

### Table: `notifications`

System-generated alerts shown to relevant staff on login or in a notification panel.  
Used for low stock alerts, near-expiry medicines, pending invoices, appointment reminders.

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(100) NOT NULL,       -- LOW_STOCK | EXPIRY_ALERT | PAYMENT_PENDING | APPOINTMENT_REMINDER
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  target_role VARCHAR(50),                 -- which role sees this — admin | receptionist | doctor | all
  reference_id UUID,                       -- linked record (medicine_id, invoice_id etc.)
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `medicines` (stock/expiry), `invoices` (pending), `appointments` (reminders)

**Get unread notifications for a role:**
```sql
SELECT * FROM notifications
WHERE (target_role = $1 OR target_role = 'all')
  AND is_read = FALSE
ORDER BY created_at DESC;
```

---

### Table: `patient_portal_users`

Patient accounts for the online booking portal.  
Separate from staff accounts. Patients log in here to book appointments and view their records.

```sql
CREATE TABLE patient_portal_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  is_verified     BOOLEAN DEFAULT FALSE,
  verify_token    VARCHAR(255),
  reset_token     VARCHAR(255),
  last_login      TIMESTAMP,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `patients`

---

### Table: `audit_logs`

Records every important action made by any staff member.

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID REFERENCES staff(id),
  action      VARCHAR(100) NOT NULL,     -- PATIENT_CREATED | INVOICE_PAID | LOGIN etc.
  table_name  VARCHAR(100),
  record_id   UUID,
  old_value   JSONB,
  new_value   JSONB,
  ip_address  VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);
```

**Connects to:** `staff` — logs all tables

---

---

## Phase 5.1 — Pharmacy Tables

### Table: `suppliers`

Pharmacy suppliers / vendors. Referenced by purchase orders.

```sql
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
```

**Migration:** `backend-api/src/db/migrate_pharmacy.js`

---

### Table: `purchase_orders`

Records of medicine stock ordered from suppliers.

```sql
CREATE TABLE IF NOT EXISTS purchase_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number      VARCHAR(20) NOT NULL UNIQUE,   -- auto-generated e.g. PO-00001
  supplier_id    UUID REFERENCES suppliers(id),
  status         VARCHAR(20) DEFAULT 'draft',   -- draft | ordered | received | cancelled
  order_date     DATE DEFAULT CURRENT_DATE,
  received_date  DATE,
  notes          TEXT,
  total_cost     DECIMAL(10,2) DEFAULT 0,
  created_by     UUID NOT NULL REFERENCES staff(id),
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);
```

---

### Table: `purchase_order_items`

Individual medicines in a purchase order.

```sql
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id             UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  medicine_id       UUID NOT NULL REFERENCES medicines(id),
  quantity_ordered  INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  cost_price        DECIMAL(10,2),
  created_at        TIMESTAMP DEFAULT NOW()
);
```

**On receive:** `stock_quantity` in `medicines` is incremented by `quantity_received`.

---

### Table: `stock_adjustments`

Manual stock corrections — damaged, expired, found, removed.

```sql
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id  UUID NOT NULL REFERENCES medicines(id),
  type         VARCHAR(20) NOT NULL,   -- add | remove | damaged | expired
  quantity     INTEGER NOT NULL,
  reason       TEXT,
  adjusted_by  UUID NOT NULL REFERENCES staff(id),
  created_at   TIMESTAMP DEFAULT NOW()
);
```

**On save:** `stock_quantity` in `medicines` is incremented (add) or decremented (remove/damaged/expired). Uses `GREATEST(0, stock_quantity + delta)` to prevent negative stock.

---

### Prescriptions — dispensing columns (added in Phase 5.1)

```sql
ALTER TABLE prescriptions
  ADD COLUMN IF NOT EXISTS is_dispensed  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS dispensed_at  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS dispensed_by  UUID REFERENCES staff(id);
```

**On dispense:** Stock deducted for each prescription item, `is_dispensed = TRUE`, `dispensed_at = NOW()`.

---

## Phase 5.2 — Lab Tables

### Table: `lab_tests`

Master catalog of available laboratory tests. Admin/receptionist manages this.

```sql
CREATE TABLE IF NOT EXISTS lab_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  code          VARCHAR(50),              -- short code e.g. FBC, HBA1C
  category      VARCHAR(100),             -- Haematology | Biochemistry | etc.
  description   TEXT,
  normal_range  VARCHAR(255),             -- e.g. 70–100 mg/dL
  unit          VARCHAR(50),              -- e.g. mg/dL, %
  price         DECIMAL(10,2) DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

**Seeded with 12 common tests:** FBC, FBS, RBS, HbA1c, Lipid Profile, Creatinine, LFT, TFT, UFR, Widal, ESR, CRP.

**Migration:** `backend-api/src/db/migrate_lab.js`

---

### Table: `lab_requests`

A doctor/receptionist/admin requests one or more tests for a patient.

```sql
CREATE TABLE IF NOT EXISTS lab_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  consultation_id  UUID REFERENCES consultations(id),
  test_id          UUID NOT NULL REFERENCES lab_tests(id),
  requested_by     UUID NOT NULL REFERENCES staff(id),
  status           VARCHAR(20) DEFAULT 'pending',   -- pending | completed
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```

**Note:** One row per test. If a doctor requests 3 tests at once, 3 rows are inserted.

---

### Table: `lab_results`

Result for a single lab request — value and/or uploaded file.

```sql
CREATE TABLE IF NOT EXISTS lab_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES lab_requests(id) ON DELETE CASCADE,
  result_value    TEXT,                    -- typed result e.g. "5.4"
  result_file_url TEXT,                    -- relative path to uploaded PDF/image
  notes           TEXT,
  resulted_by     UUID NOT NULL REFERENCES staff(id),
  resulted_at     TIMESTAMP DEFAULT NOW()
);
```

**On result entry:** `lab_requests.status` → `completed`. Old result deleted and replaced (upsert via DELETE + INSERT). File stored at `/uploads/tenants/{schema}/lab/result_{timestamp}.ext`.

---

## Table Relationship Map

```
tenants (public)
  └── feature_flags         — which modules each clinic can access (YOU control)
  └── subscriptions         — payment history per clinic

clinic_settings             — per-clinic customization (clinic admin controls)
  └── (standalone — one row per tenant)

doctor_fees                 — per-doctor consultation fee (clinic admin controls)
  └── staff (doctor)

custom_services             — clinic-defined procedures and services with prices
  └── invoice_items (picked when building invoice)

clinic_holidays             — blocked dates for appointment booking
  └── (checked against appointments)

notifications               — system alerts (low stock, expiry, pending bills)
  └── medicines | invoices | appointments

staff
  ├── appointments (as doctor)
  ├── appointments (as booked_by)
  ├── consultations (as doctor)
  ├── prescriptions (as doctor)
  ├── invoices (as generated_by)
  ├── payment_splits (as recorded_by)
  ├── end_of_day (as closed_by)
  └── audit_logs

patients
  ├── appointments
  ├── consultations
  ├── prescriptions
  ├── invoices
  ├── patient_portal_users (1-to-1)
  └── medical_records (via consultations)

patient_portal_users        — patient online login accounts
  └── patients (1-to-1)

appointments
  └── consultations (1-to-1)

consultations
  ├── prescriptions (1-to-1)
  └── invoices (1-to-1)

prescriptions
  └── prescription_items (1-to-many)

prescription_items
  └── medicines

invoices
  ├── invoice_items (1-to-many)
  └── payment_splits (1-to-many)   — for split payment methods

payment_splits
  └── invoices

end_of_day
  └── staff (who closed)

medicines
  ├── prescription_items
  ├── purchase_order_items  — stock added when PO received
  └── stock_adjustments     — manual corrections

suppliers
  └── purchase_orders

purchase_orders
  └── purchase_order_items (1-to-many)

stock_adjustments
  └── medicines (updates stock_quantity)

lab_tests
  └── lab_requests (1-to-many)

lab_requests
  ├── patients
  ├── consultations (optional link)
  ├── staff (requested_by)
  └── lab_results (1-to-1)

lab_results
  ├── lab_requests (1-to-1)
  └── staff (resulted_by)

insurance_providers
  └── insurance_claims (1-to-many, optional)

corporate_accounts
  └── patients (1-to-many via corporate_account_id)

insurance_claims
  ├── invoices
  ├── patients
  ├── insurance_providers (optional)
  └── staff (created_by)
```

---

---

## Phase 5.3 — Insurance Tables

### Table: `insurance_providers`

Insurance companies that a clinic works with. Linked to claims.

```sql
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
```

**Seeded providers:** Ceylinco Life Insurance, AIA Insurance, Union Assurance, Softlogic Life Insurance

---

### Table: `corporate_accounts`

Companies with monthly/quarterly bulk billing agreements. Employees are linked via `patients.corporate_account_id`.

```sql
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
```

**patients table ALTER:** `corporate_account_id INTEGER REFERENCES corporate_accounts(id)` added via `migrate_insurance.js`.

---

### Table: `insurance_claims`

One claim per invoice. Status lifecycle: `pending → submitted → approved / partial / rejected`.

```sql
CREATE TABLE IF NOT EXISTS insurance_claims (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id),
  patient_id       UUID NOT NULL REFERENCES patients(id),
  provider_id      INTEGER REFERENCES insurance_providers(id),
  claim_number     VARCHAR(50),            -- auto-generated: CLM-00001
  claim_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_claimed   DECIMAL(10,2) NOT NULL,
  amount_approved  DECIMAL(10,2),          -- filled when status = approved/partial
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','submitted','approved','partial','rejected')),
  notes            TEXT,
  submitted_at     TIMESTAMP,             -- set when status = submitted
  resolved_at      TIMESTAMP,             -- set when status = approved/partial/rejected
  created_by       UUID REFERENCES staff(id),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);
```

**Claim number format:** `CLM-00001` — auto-incremented from last claim in schema.

---

## Common Queries Reference

### Get full patient profile in one query
```sql
SELECT
  p.*,
  COUNT(DISTINCT a.id) AS total_visits,
  COUNT(DISTINCT i.id) AS total_invoices,
  SUM(i.total_amount)  AS total_billed
FROM patients p
LEFT JOIN appointments a  ON a.patient_id = p.id AND a.status = 'completed'
LEFT JOIN invoices i      ON i.patient_id = p.id
WHERE p.id = $1
GROUP BY p.id;
```

### Today's revenue summary
```sql
SELECT
  COUNT(i.id)           AS total_invoices,
  SUM(i.total_amount)   AS total_billed,
  SUM(i.paid_amount)    AS total_collected,
  SUM(i.balance_due)    AS total_outstanding
FROM invoices i
WHERE DATE(i.created_at) = CURRENT_DATE;
```

### Monthly income by doctor
```sql
SELECT
  s.full_name AS doctor,
  COUNT(c.id) AS consultations,
  SUM(i.total_amount) AS revenue
FROM consultations c
JOIN staff s ON s.id = c.doctor_id
JOIN invoices i ON i.consultation_id = c.id
WHERE DATE_TRUNC('month', c.visit_date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY s.id, s.full_name
ORDER BY revenue DESC;
```

### Patient medicine history
```sql
SELECT
  m.name,
  m.strength,
  pi.dosage,
  pi.frequency,
  pi.duration,
  p.created_at AS prescribed_on,
  s.full_name  AS prescribed_by
FROM prescription_items pi
JOIN prescriptions p  ON p.id  = pi.prescription_id
JOIN medicines m      ON m.id  = pi.medicine_id
JOIN staff s          ON s.id  = p.doctor_id
WHERE p.patient_id = $1
ORDER BY p.created_at DESC;
```

### Role-based dashboard — doctor view (today's queue)
```sql
SELECT
  a.token_number,
  a.appointment_time,
  a.status,
  a.type,
  p.first_name || COALESCE(' ' || p.last_name, '') AS patient_name,
  p.phone,
  p.allergies,
  (SELECT chief_complaint FROM consultations
   WHERE patient_id = p.id ORDER BY visit_date DESC LIMIT 1) AS last_complaint
FROM appointments a
JOIN patients p ON p.id = a.patient_id
WHERE a.doctor_id = $1
  AND a.appointment_date = CURRENT_DATE
  AND a.status NOT IN ('cancelled')
ORDER BY a.token_number ASC;
```

### Role-based dashboard — receptionist view (today's summary)
```sql
SELECT
  COUNT(DISTINCT a.id)                                              AS total_appointments,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END)   AS completed,
  COUNT(DISTINCT CASE WHEN a.status = 'arrived'   THEN a.id END)   AS waiting,
  COUNT(DISTINCT CASE WHEN a.status = 'cancelled' THEN a.id END)   AS cancelled,
  COALESCE(SUM(i.paid_amount), 0)                                   AS collected_today,
  COALESCE(SUM(i.balance_due), 0)                                   AS pending_today
FROM appointments a
LEFT JOIN invoices i ON DATE(i.created_at) = CURRENT_DATE
WHERE a.appointment_date = CURRENT_DATE;
```

### Duplicate patient check (before registering new patient)
```sql
SELECT id, patient_code, first_name, last_name, phone, date_of_birth
FROM patients
WHERE is_active = TRUE
  AND (
    phone = $1
    OR (LOWER(first_name) = LOWER($2) AND LOWER(last_name) = LOWER($3))
    OR national_id = $4
  )
LIMIT 5;
```

### Near-expiry medicines (within 60 days)
```sql
SELECT
  name, generic_name, strength, unit,
  stock_quantity, expiry_date,
  expiry_date - CURRENT_DATE AS days_until_expiry
FROM medicines
WHERE is_active = TRUE
  AND expiry_date IS NOT NULL
  AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
ORDER BY expiry_date ASC;
```

### Split payment total check for invoice
```sql
SELECT
  i.total_amount,
  i.paid_amount,
  COALESCE(SUM(ps.amount), 0)          AS splits_total,
  i.total_amount - COALESCE(SUM(ps.amount), 0) AS remaining
FROM invoices i
LEFT JOIN payment_splits ps ON ps.invoice_id = i.id
WHERE i.id = $1
GROUP BY i.id, i.total_amount, i.paid_amount;
```

### Returning patient check (for quick re-registration flow)
```sql
SELECT
  id, patient_code, first_name, last_name,
  phone, date_of_birth, allergies,
  (SELECT visit_date FROM consultations
   WHERE patient_id = patients.id
   ORDER BY visit_date DESC LIMIT 1) AS last_visit
FROM patients
WHERE phone = $1 AND is_active = TRUE
LIMIT 1;
```

---

## Query Update Log

> Every time you run a new query or change a table, add a record below.

| Date | Action | Table | Description | Status |
|------|--------|-------|-------------|--------|
| 2026-04-07 | CREATE | All tenant tables | Initial migration via `migrate.js` — all core tables created (staff, patients, appointments, consultations, prescriptions, medicines, invoices, etc.) | ✅ Done |
| 2026-04-07 | INSERT | `public.feature_flags` | Default flags inserted for demo tenant — pharmacy, lab, insurance, online_booking, multi_branch (all ON for demo) | ✅ Done |
| 2026-04-14 | ALTER | `clinic_settings` | Added `allow_walk_ins` column (BOOLEAN DEFAULT TRUE) | ✅ Done |
| 2026-04-14 | ALTER | `staff` | Added `signature_url` column (VARCHAR) | ✅ Done |
| 2026-04-15 | CREATE | `suppliers`, `purchase_orders`, `purchase_order_items`, `stock_adjustments` | Phase 5.1 pharmacy migration via `migrate_pharmacy.js` | ✅ Done |
| 2026-04-15 | ALTER | `prescriptions` | Added `is_dispensed`, `dispensed_at`, `dispensed_by` columns via `migrate_pharmacy.js` | ✅ Done |
| 2026-04-15 | CREATE | `lab_tests`, `lab_requests`, `lab_results` | Phase 5.2 lab migration via `migrate_lab.js` | ✅ Done |
| 2026-04-15 | INSERT | `lab_tests` | 12 common tests seeded (FBC, FBS, RBS, HbA1c, Lipid, Creatinine, LFT, TFT, UFR, Widal, ESR, CRP) | ✅ Done |
| 2026-04-15 | CREATE | `insurance_providers`, `corporate_accounts`, `insurance_claims` | Phase 5.3 insurance migration via `migrate_insurance.js` | ✅ Done |
| 2026-04-15 | ALTER | `patients` | Added `corporate_account_id INTEGER REFERENCES corporate_accounts(id)` via `migrate_insurance.js` | ✅ Done |
| 2026-04-15 | INSERT | `insurance_providers` | 4 common providers seeded (Ceylinco, AIA, Union Assurance, Softlogic) | ✅ Done |

---

*databasequeries.md — Doctor POS*  
*Update this file before and after every database change*