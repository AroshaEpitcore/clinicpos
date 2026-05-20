# RUNNING.md — ClinicPOS / HealthCenter.lk

How to run all four projects locally and in production.

---

## Projects Overview

| Project | Stack | Port | URL |
|---------|-------|------|-----|
| `backend-api` | Node.js · Express · PostgreSQL | 4000 | `http://localhost:4000` |
| `clinic-frontend` | React · Vite | 5173 | `http://localhost:5173` |
| `admin-frontend` | React · Vite | 5174 | `http://localhost:5174` |
| `landing-frontend` | React · Vite · Tailwind | 5175 | `http://localhost:5175` |

Run all four at the same time — each in its own terminal. The landing-frontend is optional for daily clinic development.

---

## Prerequisites

Install these once on your machine:

| Tool | Purpose |
|------|---------|
| Node.js 18+ | Runs all three projects |
| PostgreSQL 14+ | Main database |
| npm | Installs packages |

---

## First-Time Setup

### Step 1 — Install dependencies (run once per project)

```bash
cd backend-api      && npm install
cd clinic-frontend  && npm install
cd admin-frontend   && npm install
cd landing-frontend && npm install
```

> `clinic-frontend` includes Tailwind CSS, Radix UI, Sonner, Lucide, React Hook Form, Recharts, `date-fns`, `react-day-picker`, `clsx`, `@fontsource/inter`, and `qrcode.react` (QR code generation for the booking QR card in Settings).
> `admin-frontend` includes Tailwind CSS, Radix UI (`@radix-ui/react-dialog`), Sonner, Lucide, `clsx`, and `@fontsource/inter`.
> `landing-frontend` includes Tailwind CSS v3 (custom brand config), Lucide, React Router DOM. Uses a separate design system (custom Tailwind palette, no CSS variables). Logo served from `public/logosmall.png`.
> Running `npm install` in each project installs all of these at once — no extra steps needed.

### Step 2 — Create .env files

Each project has a `.env.example`. Copy it to `.env` and fill in your values.

**backend-api/.env**
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/clinicpos_db
JWT_SECRET=replace_with_a_long_random_secret_string
JWT_EXPIRES_IN=8h
ADMIN_JWT_SECRET=replace_with_a_different_long_secret
ADMIN_EMAIL=admin@healthcenter.lk
ADMIN_PASSWORD=yourAdminPassword
PORT=4000
NODE_ENV=development
UPLOADS_DIR=./uploads
MAX_FILE_SIZE_MB=2
DEMO_SUBDOMAIN=demo
```

**clinic-frontend/.env**
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_APP_DOMAIN=clinicpos.com
VITE_TENANT_SUBDOMAIN=demo
```

**admin-frontend/.env**
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_CLINIC_URL=http://localhost:5173
```

> `VITE_CLINIC_URL` — used by the "Login as Clinic" impersonation button to open the correct clinic-frontend URL. Set this to wherever your clinic-frontend runs.

**landing-frontend/.env** *(usually empty for local dev — landing fetches from relative /api paths)*
```env
# No variables required for local dev.
# In production the landing page fetches /api/v1/public/* via nginx proxy — no VITE_API_URL needed.
```

### Step 3 — Create the PostgreSQL database

```sql
CREATE DATABASE clinicpos_db;
```

Then run the table creation queries from `Docs/databasequeries.md` — start with `public.tenants`, `public.feature_flags`, `public.subscriptions`.

### Step 4 — Create the uploads folder inside backend-api

```bash
mkdir backend-api/uploads
```

### Step 5 — Run database migrations

Run these once after creating the database. Each script is safe to re-run (uses `IF NOT EXISTS`).

```bash
cd backend-api

# Core schema (patients, appointments, consultations, prescriptions, billing, etc.)
node src/db/migrate.js

# Pharmacy module (suppliers, purchase orders, stock adjustments + prescriptions dispensing columns)
node src/db/migrate_pharmacy.js

# Lab module (lab_tests, lab_requests, lab_results — also seeds 12 common tests)
node src/db/migrate_lab.js

# Insurance module (insurance_providers, corporate_accounts, insurance_claims + patients.corporate_account_id — seeds 4 providers)
node src/db/migrate_insurance.js

# Patient Portal — booking columns (booking_reference, booking_source on appointments)
node src/db/migrate_portal.js

# Patient Portal — patient auth (portal_password_hash, portal_registered_at columns on patients)
node -r dotenv/config src/db/migrate_patient_portal_auth.js

# Make patient last_name, date_of_birth, gender optional (NOT NULL dropped)
node src/db/migrate_optional_patient_fields.js

# Make prescriptions.consultation_id nullable (allows Rx without a consultation link)
node src/db/migrate_prescription_consultation_nullable.js

# Allow custom medicine names in prescriptions (drops NOT NULL from medicine_id, adds custom_medicine_name column)
node src/db/migrate_custom_medicine.js

# Queue Display — adds queue_display_enabled column to clinic_settings
node src/db/migrate_queue_display.js

# Subscription Plans — creates subscription_plans table, adds plan_id/subscription_start/subscription_end to tenants
node src/db/migrate_subscription_plans.js

# Update plan prices to LKR and deactivate Premium plan
node -r dotenv/config src/db/migrate_update_plans.js

# Add billing_cycle column to subscription_plans, update Basic/Standard plan defaults
node -r dotenv/config src/db/migrate_plan_billing_cycle.js

# Platform settings — seeds company/contact/payment/system keys in public.platform_settings
node -r dotenv/config src/db/migrate_platform_info.js

# Nurse vitals — adds patient_vitals table to all tenant schemas
node -r dotenv/config src/db/migrate_vitals.js

# Fix clinic schemas created before addon modules existed (queue_display + pharmacy/lab/insurance tables)
node -r dotenv/config src/db/migrate_fix_new_clinics.js

# Website settings — adds website_enabled/tagline/about/hours/map_url/whatsapp/facebook/hero_url to all tenant clinic_settings
node -r dotenv/config src/db/migrate_website_settings.js

# Broadcast announcements — creates broadcast_announcements + announcement_reads tables in public schema
node -r dotenv/config src/db/migrate_broadcast_announcements.js

# Lanka QR Payment — adds qr_image_url/qr_image_filename to tenant clinic_settings; adds qr_total column to end_of_day
node -r dotenv/config src/db/migrate_qr_payment.js

# System audit logs type fix — changes tenant_id and user_id columns from INTEGER to VARCHAR(50) in system_audit_logs
# NOTE: already run on production server (2026-04-30). Run on fresh installs only if needed.
node -r dotenv/config src/db/migrate_system_logs_fix.js

# Phase 5.6 — Dual-queue (new vs returning patient tokens)
node src/db/migrate_dual_queue.js                 # adds appointments.patient_visit_type + dual_queue feature flag
node src/db/migrate_dual_queue_clinic_toggle.js   # adds clinic_settings.dual_queue_enabled (clinic-admin opt-in)

# Phase 5.6 — Daily caps + per-day-of-week booking-portal hours
node src/db/migrate_caps_and_portal_hours.js      # adds staff.max_patients_per_day + portal_hours table
```

> **Note:** `migrate.js` also runs `seed.js` to create the demo clinic and 4 staff accounts.  
> If you're setting up a fresh install, set `DEMO_SUBDOMAIN=demo` in your `.env` before running migrations.

### Step 6 — Set the tenant subdomain for local dev

In `clinic-frontend/.env`, set:

```env
VITE_TENANT_SUBDOMAIN=demo
```

This tells the frontend to pass `X-Tenant-Subdomain: demo` on every API request. In production this is read from the URL subdomain automatically.

---

## Running in Development

Open three terminals — one per project.

**Terminal 1 — Backend API**
```bash
cd backend-api
npm run dev
```
Runs on `http://localhost:4000`
Verify: open `http://localhost:4000/health` — should return `{ "status": "ok" }`

**Terminal 2 — Clinic Frontend**
```bash
cd clinic-frontend
npm run dev
```
Runs on `http://localhost:5173`
API calls to `/api/*` are automatically proxied to `localhost:4000` — no CORS issues.

**Terminal 3 — Admin Frontend**
```bash
cd admin-frontend
npm run dev
```
Runs on `http://localhost:5174`

**Terminal 4 — Landing Frontend** *(optional — only needed for landing page work)*
```bash
cd landing-frontend
npm run dev
```
Runs on `http://localhost:5175`
This is the public marketing site (healthcenter.lk). No API proxy — it fetches from the backend directly on `/api/*`.

---

## Local Dev — Tenant Subdomain

In production, the tenant is read from the URL subdomain (`sunshine.clinicpos.com`).  
In local dev, the frontend sends it as an HTTP header instead. Set it in `clinic-frontend/.env`:

```env
VITE_TENANT_SUBDOMAIN=demo
```

This is automatically picked up by `src/api/index.js` — no code changes needed.

**To test a newly created clinic locally:**

1. Create the clinic from the admin panel (`http://localhost:5174`)
2. Copy the subdomain from the credentials screen (e.g. `sunshine`)
3. Edit `clinic-frontend/.env`: `VITE_TENANT_SUBDOMAIN=sunshine`
4. Restart clinic-frontend (`Ctrl+C` → `npm run dev`)
5. Login at `http://localhost:5173` with the email + password you set

**To go back to the demo clinic:** Set `VITE_TENANT_SUBDOMAIN=demo` and restart.

---

## Building for Production

```bash
# Backend — no build step needed
# Frontend apps — generate static files
cd clinic-frontend  && npm run build   # output: clinic-frontend/dist/
cd admin-frontend   && npm run build   # output: admin-frontend/dist/
cd landing-frontend && npm run build   # output: landing-frontend/dist/
```

**Backend — keep running with PM2**
```bash
# IMPORTANT: --node-args="-r dotenv/config" is required so .env is loaded
pm2 start backend-api/src/index.js --name clinicpos-api --node-args="-r dotenv/config"
pm2 save
pm2 logs clinicpos-api
```

**Nginx — serve frontends and proxy API**
```nginx
# Clinic frontend — wildcard subdomain
server {
    server_name *.clinicpos.com;
    root /var/www/clinic-frontend/dist;
    location / { try_files $uri /index.html; }
    location /api/ { proxy_pass http://localhost:4000; }
}

# Admin panel — IP-restricted
server {
    server_name admin.clinicpos.com;
    allow YOUR.IP.ADDRESS;
    deny all;
    root /var/www/admin-frontend/dist;
    location / { try_files $uri /index.html; }
    location /api/ { proxy_pass http://localhost:4000; }
}
```

---

## Project Folder Structure

```
clinicpos/
├── Docs/
│   ├── RUNNING.md          ← This file (local dev)
│   ├── HOSTING.md          ← Step-by-step production deployment guide
│   ├── HOSTING_SESSION.md  ← Full record of the actual production deployment
│   ├── PLAN.md             ← Build order and phases
│   ├── DESIGN.md           ← UI design rules and component system
│   ├── INSTRUCTION.md      ← Development rules
│   ├── BUGS.md             ← Automated test results + known bugs
│   ├── databasequeries.md  ← All DB tables and queries
│   ├── workflow.md         ← Role-by-role access, data flow, module status
│   └── ongoingworking.md   ← Feature progress tracker, session log
│
├── backend-api/
│   ├── src/
│   │   ├── config/db.js          — PostgreSQL pool + queryPublic/queryTenant helpers
│   │   ├── middleware/auth.js     — JWT verification, requireRole()
│   │   ├── middleware/tenant.js   — Subdomain → tenant, requireFeature()
│   │   ├── routes/               — One file per module
│   │   │   ├── auth.routes.js
│   │   │   ├── patient.routes.js
│   │   │   ├── appointment.routes.js
│   │   │   ├── consultation.routes.js
│   │   │   ├── prescription.routes.js
│   │   │   ├── medicine.routes.js
│   │   │   ├── invoice.routes.js
│   │   │   ├── endofday.routes.js
│   │   │   ├── report.routes.js
│   │   │   ├── settings.routes.js
│   │   │   ├── admin.routes.js
│   │   │   ├── staff.routes.js     — Staff CRUD (admin only)
│   │   │   ├── pharmacy.routes.js  — Phase 5.1
│   │   │   ├── lab.routes.js       — Phase 5.2
│   │   │   ├── insurance.routes.js — Phase 5.3
│   │   │   ├── portal.routes.js    — Phase 5.4 + 5.5 (public booking/website, no auth)
│   │   │   └── patient-portal.routes.js — Phase 5.5 patient auth + data endpoints
│   │   ├── db/
│   │   │   ├── migrate.js                              — Core tables + seed
│   │   │   ├── migrate_pharmacy.js                     — Phase 5.1 tables
│   │   │   ├── migrate_lab.js                          — Phase 5.2 tables
│   │   │   ├── migrate_insurance.js                    — Phase 5.3 tables
│   │   │   ├── migrate_portal.js                       — Phase 5.4 booking columns (booking_reference, booking_source)
│   │   │   ├── migrate_patient_portal_auth.js          — Phase 5.5 patient auth (portal_password_hash, portal_registered_at)
│   │   │   ├── migrate_optional_patient_fields.js      — drops NOT NULL from last_name/dob/gender
│   │   │   ├── migrate_prescription_consultation_nullable.js — drops NOT NULL from consultation_id
│   │   │   ├── migrate_custom_medicine.js              — nullable medicine_id + custom_medicine_name
│   │   │   ├── migrate_queue_display.js                — queue_display_enabled column
│   │   │   ├── migrate_subscription_plans.js           — subscription_plans table + tenant subscription columns
│   │   │   ├── migrate_update_plans.js                 — updates plan prices to LKR, deactivates Premium
│   │   │   ├── migrate_plan_billing_cycle.js           — adds billing_cycle column to subscription_plans
│   │   │   ├── migrate_platform_settings.js            — public.platform_settings table (landing page toggle)
│   │   │   ├── migrate_platform_info.js                — seeds 17 company/contact/payment/system keys
│   │   │   ├── migrate_vitals.js                       — patient_vitals table in all tenant schemas
│   │   │   ├── migrate_fix_new_clinics.js              — backport addon tables to all existing schemas
│   │   │   ├── migrate_website_settings.js             — website_enabled + 7 columns to tenant clinic_settings
│   │   │   ├── migrate_contact_enquiries.js            — public.contact_enquiries table (landing page form)
│   │   │   ├── migrate_broadcast_announcements.js      — public.broadcast_announcements + announcement_reads
│   │   │   ├── migrate_qr_payment.js                   — qr_image_url/qr_image_filename in clinic_settings + qr_total in end_of_day
│   │   │   ├── migrate_system_logs_fix.js              — changes tenant_id/user_id in system_audit_logs from INTEGER to VARCHAR(50)
│   │   │   ├── migrate_dual_queue.js                   — appointments.patient_visit_type + dual_queue feature flag
│   │   │   ├── migrate_dual_queue_clinic_toggle.js     — clinic_settings.dual_queue_enabled (clinic-admin opt-in)
│   │   │   └── migrate_caps_and_portal_hours.js        — staff.max_patients_per_day + portal_hours table
│   │   ├── utils/
│   │   │   ├── patientCode.js      — shared PT-XXXXX generator
│   │   │   ├── bookingReference.js — shared BK-XXXXXX generator
│   │   │   ├── dailyCap.js         — daily appointment cap enforcement (clinic + per-doctor)
│   │   │   └── portalHours.js      — portal-hours status helper (open_now, next_open)
│   │   └── index.js              — Express entry point
│   ├── __tests__/                   — Jest + Supertest tests (run with `npm test`)
│   │   ├── dual_queue/              — Dual-queue, caps, portal-hours suites
│   │   └── helpers/testApp.js       — Test-app factory with mocked DB + middleware
│   ├── uploads/                  — Uploaded files (gitignored); subdirs: logo/, signature/, hero/
│   ├── .env                      — Secrets (gitignored)
│   ├── .env.example
│   └── package.json
│
├── clinic-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/             — Login, Impersonate
│   │   │   ├── dashboard/        — Role-based dashboards (Admin, Doctor, Receptionist, Nurse)
│   │   │   ├── patients/         — List, Profile, Register, Edit
│   │   │   ├── appointments/     — Queue, modals, schedule, holidays, VitalsModal
│   │   │   ├── consultations/    — Consultation list + detail modal
│   │   │   ├── prescriptions/    — Rx list + detail modal
│   │   │   ├── medicines/        — Medicine Store (admin)
│   │   │   ├── billing/          — BillingPage, EndOfDayPage, InvoiceModal
│   │   │   ├── reports/          — 7-tab reports page
│   │   │   ├── settings/         — 9-tab settings page (includes Website tab)
│   │   │   ├── pharmacy/         — Phase 5.1 (4 tabs)
│   │   │   ├── lab/              — Phase 5.2 (2 tabs)
│   │   │   ├── insurance/        — Phase 5.3 (3 tabs)
│   │   │   ├── booking/          — Phase 5.4 (public /book page, no auth)
│   │   │   ├── display/          — Phase 5.5 (public /display TV screen, no auth)
│   │   │   ├── patient-portal/   — Phase 5.5 (patient login + 8 data pages: dashboard, appointments, consultations, prescriptions, labs, invoices, profile, login, register)
│   │   │   ├── my-day/           — MyDayPage.jsx — doctor daily view (today's schedule + pending labs + today's Rx)
│   │   │   ├── public/           — PublicClinicPage.jsx (public / root page, no auth — clinic's own website)
│   │   │   ├── staff/            — Staff management (admin only) — add/edit/reset-password/deactivate
│   │   │   ├── subscription/     — SubscriptionPage.jsx — clinic admin views own subscription status
│   │   │   └── help/             — HelpPage.jsx — step-by-step guide per role (Overview/Receptionist/Doctor/Nurse/Admin tabs)
│   │   ├── components/
│   │   │   ├── layout/           — Sidebar (collapsible), TopBar (live clock + dark toggle), PageLayout, ProtectedRoute
│   │   │   └── ui/               — Button, Input, Select, Modal, Drawer, Badge, Card, DatePicker, Spinner, EmptyState, OfflineBanner, ConfirmDialog, DispenseModal, AnnouncementBanner
│   │   ├── api/                  — One file per module (patients.js, pharmacy.js, lab.js, portal.js, patientPortal.js, announcements.js, etc.)
│   │   ├── store/                — AuthContext, ThemeContext, PatientAuthContext (patient JWT separate from staff JWT)
│   │   ├── utils/                — format.js, mediaUrl.js, printTokenSlip.js
│   │   ├── styles/               — variables.css (CSS vars + dark mode overrides)
│   │   ├── App.jsx               — All routes
│   │   └── main.jsx              — Entry point + ThemeProvider + Toaster
│   ├── vite.config.js            — Port 5173, /api proxy
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── admin-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx         — Super admin login (logosmall.png branding)
│   │   │   ├── DashboardPage.jsx     — Stat cards + recent clinics
│   │   │   ├── ClinicsPage.jsx       — Clinic list + search + create
│   │   │   ├── ClinicDetailPage.jsx  — Clinic detail + feature flags + suspend/activate + set plan/renew
│   │   │   ├── PlansPage.jsx         — CRUD for subscription plans (name, billing cycle, price)
│   │   │   ├── SubscriptionsPage.jsx — All clinics subscription status + assign/renew plan
│   │   │   ├── EnquiriesPage.jsx     — Contact form submissions from landing page (list, mark read, delete, reply)
│   │   │   ├── AnnouncementsPage.jsx — Create/publish/archive broadcast messages to all clinic dashboards
│   │   │   ├── SystemHealthPage.jsx  — Real-time server + DB + memory + CPU metrics (30s auto-refresh)
│   │   │   ├── SystemLogsPage.jsx    — Audit log viewer (all API mutations, filterable)
│   │   │   └── PlatformSettingsPage.jsx — 4-tab: Company Info, Contact Details, Payment Details, System
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   └── AdminLayout.jsx — Collapsible sidebar (logosmall.png) + TopBar (live clock, dark/light toggle, logout)
│   │   │   └── ui/
│   │   │       ├── Button.jsx      — CSS variable variants (primary, secondary, danger, success, ghost)
│   │   │       ├── Input.jsx       — CSS variables, forwardRef
│   │   │       ├── Badge.jsx       — statusMap (active→success, suspended→danger, etc.)
│   │   │       ├── Card.jsx        — Card + StatCard with CSS variables
│   │   │       ├── Modal.jsx       — Radix Dialog (@radix-ui/react-dialog) — proper overlay
│   │   │       ├── Spinner.jsx     — CSS variable spinner + LoadingState
│   │   │       ├── ConfirmDialog.jsx — Wraps Modal for all destructive confirmations
│   │   │       └── EmptyState.jsx  — Consistent empty list state component
│   │   ├── api/
│   │   │   └── admin.js            — adminAuthApi, adminTenantsApi, adminFlagsApi, adminDashboardApi, adminPlansApi, adminSubscriptionsApi, adminPlatformApi, adminSystemApi, adminEnquiriesApi, adminAnnouncementsApi
│   │   ├── store/
│   │   │   ├── AdminAuthContext.jsx — Admin JWT + login/logout
│   │   │   └── ThemeContext.jsx     — Dark/light mode toggle (persisted in localStorage)
│   │   ├── styles/
│   │   │   └── variables.css       — CSS variables + .dark {} overrides (matches clinic-frontend)
│   │   ├── App.jsx                 — Routes (login + protected admin routes)
│   │   └── main.jsx                — Entry point + ThemeProvider + @fontsource/inter
│   ├── public/
│   │   └── logosmall.png           — Brand logo served at /logosmall.png
│   ├── tailwind.config.js          — darkMode: 'class' + theme extensions
│   ├── vite.config.js              — Port 5174, /api proxy
│   ├── .env                        — VITE_API_URL + VITE_CLINIC_URL
│   ├── .env.example
│   └── package.json
│
└── landing-frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LandingPage.jsx     — Marketing homepage (hero, features, pricing, testimonials, CTA)
    │   │   └── GuidePage.jsx       — Public user guide (tabs: Overview, Receptionist, Doctor, Nurse, Admin)
    │   ├── sections/               — HeroSection, TrustBar, FeaturesSection, QrPaymentSection,
    │   │                             ClinicWebsiteSection, WorkflowSection, RolesSection,
    │   │                             PricingSection, TestimonialsSection, ContactSection, CtaSection
    │   ├── components/layout/
    │   │   ├── Navbar.jsx          — Sticky nav with logosmall.png + left-side slide drawer (mobile)
    │   │   ├── Footer.jsx          — Footer with logosmall.png + dynamic platform info from API
    │   │   └── Layout.jsx          — Wraps Navbar + <main> + Footer (used by all pages)
    │   ├── styles/
    │   │   └── globals.css         — CSS utilities: hero-radial-bg, dot-grid, step-ring, cta-radial, pricing-featured-bg, guide-hero-text
    │   ├── App.jsx                 — Routes: / (LandingPage), /guide (GuidePage)
    │   └── main.jsx                — Entry point
    ├── public/
    │   └── logosmall.png           — Brand logo (blue/teal clinic cross) served at /logosmall.png
    ├── tailwind.config.js          — Custom brand palette: primary #07548E, teal #07A39A, surface, ink, ink-light, ink-faint
    ├── vite.config.js              — Port 5175
    ├── index.html                  — Vite entry point (required — do not delete)
    └── package.json
```

---

*ClinicPOS / HealthCenter.lk — Read PLAN.md for build order. Read INSTRUCTION.md for rules.*
