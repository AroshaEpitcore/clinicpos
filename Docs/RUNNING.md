# RUNNING.md — Doctor POS

How to run all three projects locally and in production.

---

## Projects Overview

| Project | Stack | Port | URL |
|---------|-------|------|-----|
| `backend-api` | Node.js · Express · PostgreSQL | 4000 | `http://localhost:4000` |
| `clinic-frontend` | React · Vite | 5173 | `http://localhost:5173` |
| `admin-frontend` | React · Vite | 5174 | `http://localhost:5174` |

Run all three at the same time — each in its own terminal.

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
```

> `clinic-frontend` and `admin-frontend` include Tailwind CSS, Radix UI, Sonner, Lucide, React Hook Form, and Recharts.
> Running `npm install` installs all of these at once — no extra steps needed.

### Step 2 — Create .env files

Each project has a `.env.example`. Copy it to `.env` and fill in your values.

**backend-api/.env**
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/clinicpos_db
JWT_SECRET=replace_with_a_long_random_secret_string
JWT_EXPIRES_IN=8h
ADMIN_JWT_SECRET=replace_with_a_different_long_secret
ADMIN_EMAIL=admin@clinicpos.com
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

# Patient Portal module (adds booking_reference, booking_source columns to appointments)
node src/db/migrate_portal.js
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
Build this only when you reach Phase 4 in `PLAN.md`.

---

## Local Dev — Tenant Subdomain

In production, the tenant is read from the URL subdomain (`drsilva.clinicpos.com`).  
In local dev, pass it as a request header from your frontend Axios instance:

```javascript
// src/api/index.js in clinic-frontend
api.interceptors.request.use(config => {
  config.headers['X-Tenant-Subdomain'] = 'drsilva'; // your test clinic subdomain
  return config;
});
```

---

## Building for Production

```bash
# Backend — no build step needed
# Frontend apps — generate static files
cd clinic-frontend  && npm run build   # output: clinic-frontend/dist/
cd admin-frontend   && npm run build   # output: admin-frontend/dist/
```

**Backend — keep running with PM2**
```bash
pm2 start backend-api/src/index.js --name clinicpos-api
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
│   ├── RUNNING.md          ← This file
│   ├── PLAN.md             ← Build order and phases
│   ├── INSTRUCTION.md      ← Development rules
│   ├── databasequeries.md  ← All DB tables and queries
│   └── ongoingworking.md   ← Feature progress tracker
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
│   │   │   ├── pharmacy.routes.js  — Phase 5.1
│   │   │   ├── lab.routes.js       — Phase 5.2
│   │   │   ├── insurance.routes.js — Phase 5.3
│   │   │   └── portal.routes.js    — Phase 5.4 (public, no auth)
│   │   ├── db/
│   │   │   ├── migrate.js          — Core tables + seed
│   │   │   ├── migrate_pharmacy.js — Phase 5.1 tables
│   │   │   ├── migrate_lab.js      — Phase 5.2 tables
│   │   │   ├── migrate_insurance.js — Phase 5.3 tables
│   │   │   └── migrate_portal.js   — Phase 5.4 columns
│   │   └── index.js              — Express entry point
│   ├── uploads/                  — Uploaded files (gitignored)
│   ├── .env                      — Secrets (gitignored)
│   ├── .env.example
│   └── package.json
│
├── clinic-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/             — Login, Impersonate
│   │   │   ├── dashboard/        — Role-based dashboards
│   │   │   ├── patients/         — List, Profile, Register, Edit
│   │   │   ├── appointments/     — Queue, modals, schedule, holidays
│   │   │   ├── consultations/    — Consultation list + modal
│   │   │   ├── prescriptions/    — Rx list + modal
│   │   │   ├── medicines/        — Medicine Store (admin)
│   │   │   ├── billing/          — BillingPage, EndOfDayPage, InvoiceModal
│   │   │   ├── reports/          — 7-tab reports page
│   │   │   ├── settings/         — 8-tab settings page
│   │   │   ├── pharmacy/         — Phase 5.1 (4 tabs)
│   │   │   ├── lab/              — Phase 5.2 (2 tabs)
│   │   │   ├── insurance/        — Phase 5.3 (3 tabs)
│   │   │   └── booking/          — Phase 5.4 (public /book page)
│   │   ├── components/
│   │   │   ├── layout/           — Sidebar, TopBar, PageLayout, ProtectedRoute
│   │   │   └── ui/               — Button, Input, Select, Modal, Badge, DatePicker, etc.
│   │   ├── api/                  — One file per module (patients.js, pharmacy.js, lab.js, etc.)
│   │   ├── store/                — AuthContext, ThemeContext
│   │   ├── utils/                — format.js, mediaUrl.js
│   │   ├── styles/               — variables.css (CSS vars + dark mode overrides)
│   │   ├── App.jsx               — All routes
│   │   └── main.jsx              — Entry point + providers
│   ├── vite.config.js            — Port 5173, /api proxy
│   ├── .env
│   ├── .env.example
│   └── package.json
│
└── admin-frontend/
    ├── src/
    │   ├── pages/                — Admin panel screens
    │   ├── components/
    │   ├── api/
    │   ├── App.jsx
    │   └── main.jsx
    ├── vite.config.js            — Port 5174, /api proxy
    ├── .env
    ├── .env.example
    └── package.json
```

---

*Doctor POS — Read PLAN.md for build order. Read INSTRUCTION.md for rules.*
