# PLAN.md — Doctor POS Development Plan

> **Read this before every coding session.**  
> This is the single source of truth for what to build, in what order, and why.  
> Do not skip phases. Do not start Phase 2 before Phase 1 is fully done.  
> Update `ongoingworking.md` as you complete each item here.

---

## Product Summary

A **customizable SaaS POS system** for clinics. You sell it. Each clinic gets their own isolated workspace at `clinicname.clinicpos.com`. They customize it as their own. You manage all clinics from `admin.clinicpos.com`.

**Three projects:**
```
clinic-frontend/    → React — what clinic staff use daily
backend-api/        → Node.js — all logic, all API routes
admin-frontend/     → React — your control panel for all clinics
```

---

## Build Order Overview

```
Phase 1  →  Foundation (infrastructure + auth + multi-tenant)
Phase 2  →  Core modules (the 6 key features)
Phase 3  →  Clinic customization (logo, settings, branding)
Phase 4  →  Super admin panel
Phase 5  →  Add-on modules (pharmacy, lab, insurance)
Phase 6  →  Beta, launch, payments
Phase 7  →  Desktop version (later)
```

**Rule: Never start the next phase until the current one is tested and committed.**

---

## Phase 1 — Foundation

> Everything depends on this. Build it right before touching any feature.

### Step 1.1 — Server Setup *(deferred to Phase 6 — local dev only for now)*
| Task | Done |
|------|------|
| Buy domain (e.g. `clinicpos.com`) | [ ] |
| Spin up VPS — DigitalOcean or Hetzner ($6–20/mo) | [ ] |
| Point wildcard DNS `*.clinicpos.com` → server IP | [ ] |
| Install Nginx, Node.js, PostgreSQL, Redis on server | [ ] |
| Configure Nginx as reverse proxy | [ ] |
| Install SSL via Let's Encrypt (wildcard cert) | [ ] |
| Set up PM2 to keep Node.js running | [ ] |
| Set up CI/CD — GitHub Actions auto-deploy on push | [ ] |

**Why first:** Every other step runs on this. Set it up once, use it forever.

---

### Step 1.2 — GitHub Repositories
| Task | Done |
|------|------|
| Create repo: `clinic-frontend` | [ ] |
| Create repo: `backend-api` | [ ] |
| Create repo: `admin-frontend` | [ ] |
| Add `.gitignore` to all three (include `.env`) | [x] |
| Create `Docs/` folder in `backend-api` with all 4 md files | [x] |

---

### Step 1.3 — Database Foundation ✅
| Task | Done |
|------|------|
| Create PostgreSQL database `clinicpos_db` | [x] |
| Create `public.tenants` table | [x] |
| Create `public.feature_flags` table | [x] |
| Create `public.subscriptions` table | [x] |
| Write tenant creation function (creates schema + inserts default flags) | [x] |
| Test: create a test tenant, verify schema isolation | [x] |
| Document all queries in `databasequeries.md` | [x] |

---

### Step 1.4 — Authentication System ✅
| Task | Done |
|------|------|
| `POST /api/v1/auth/login` — email + password → JWT token | [x] |
| JWT middleware — verify token on every protected route | [x] |
| Role middleware — check role before every protected route | [x] |
| Tenant middleware — read subdomain → load tenant + feature flags | [x] |
| `POST /api/v1/auth/logout` — invalidate token | [x] |
| Password hashing with bcrypt | [x] |
| Session timeout enforcement | [ ] *(UI built in Phase 2.7 — backend enforcement deferred to Phase 5)* |
| Test: login as doctor, login as receptionist, login as admin | [x] |
| Test: wrong role gets 403, wrong tenant gets 403 | [x] |

---

### Step 1.5 — Multi-Tenant Architecture ✅
| Task | Done |
|------|------|
| Subdomain-reading middleware | [x] |
| Schema-switching — every DB query uses correct tenant schema | [x] |
| New clinic creation flow — schema + default data + flags | [x] |
| Default `clinic_settings` row inserted on clinic creation | [x] |
| Default `feature_flags` rows inserted (all OFF) | [x] |
| Test: Clinic A data never visible to Clinic B | [x] |

---

### Step 1.6 — Feature Flag System ✅
| Task | Done |
|------|------|
| Load feature flags from DB on every authenticated request | [x] |
| Backend enforces flags — returns 403 if module is off | [x] |
| Frontend receives flags in login response | [x] |
| Frontend stores flags in global state | [x] |
| Frontend hides menu items based on flags | [x] |
| Test: turn pharmacy OFF → menu item disappears, API rejects request | [x] |

**✅ Phase 1 complete when:** A test clinic can log in, see correct role dashboard, and be blocked from disabled modules.

---

## Phase 2 — Core Modules

> Build in this exact order. Each module feeds the next.  
> `patients` → `appointments` → `consultations` → `prescriptions` → `billing` → `reports`

---

### Module 2.0 — Role-Based Dashboards ✅

**Why first:** Every staff member lands here after login. It must work before anything else.

| Task | Project | Done |
|------|---------|------|
| Doctor dashboard — today's queue stats + appointment list (uses existing `/appointments`) | frontend | [x] |
| Receptionist dashboard — live queue table + billing summary (uses `/appointments` + `/end-of-day/summary`) | frontend | [x] |
| Admin dashboard — revenue stats + monthly chart + doctor table (uses `/reports/daily` + `/reports/monthly` + `/reports/doctors`) | frontend | [x] |
| Nurse dashboard — all patients in clinic today with status (uses `/appointments`) | frontend | [x] |
| Auto-route to correct dashboard after login based on role | frontend | [x] |

*Note: No dedicated `/dashboard/*` backend routes needed — dashboards compose from existing report + appointment APIs.*

**Completed:** 2026-04-14
**Test:** Log in as each role → correct dashboard shown with real data from today.

---

### Module 2.1 — Patient Registration 👤 ✅

**Why second:** Every other module needs a patient to exist first.

| Task | Project | Done |
|------|---------|------|
| Create `patients` table in tenant schema | backend | [x] |
| Add DB indexes on `phone`, `first_name`, `last_name`, `patient_code` | backend | [x] |
| `POST /api/v1/patients` — create new patient | backend | [x] |
| `GET /api/v1/patients` — list with search and pagination | backend | [x] |
| `GET /api/v1/patients/:id` — full profile | backend | [x] |
| `PUT /api/v1/patients/:id` — update details | backend | [x] |
| `DELETE /api/v1/patients/:id` — soft delete | backend | [x] |
| `GET /api/v1/patients/check-duplicate` — check before registering | backend | [x] |
| `GET /api/v1/patients/returning?phone=` — quick lookup | backend | [x] |
| Auto-generate patient code `PT-XXXXX` | backend | [x] |
| Returning patient quick search screen (phone → results → add to queue) | frontend | [x] |
| New patient registration form | frontend | [x] |
| Duplicate patient warning modal | frontend | [x] |
| Patient list with search bar and filters | frontend | [x] |
| Patient profile page (full history timeline) | frontend | [x] |

**Completed:** 2026-04-08
**Test:** Register new patient → appears in list. Search by phone → finds existing patient. Register same phone again → duplicate warning shown.

---

### Module 2.2 — Doctor Appointments 📅 ✅

**Why third:** Queue and appointments are needed before a consultation can happen.

| Task | Project | Done |
|------|---------|------|
| Create `appointments` table | backend | [x] |
| Create `doctor_schedules` table | backend | [x] |
| Create `clinic_holidays` table | backend | [x] |
| `POST /api/v1/appointments` — create (booked or walk-in) | backend | [x] |
| `GET /api/v1/appointments` — list by date, doctor, status | backend | [x] |
| `PUT /api/v1/appointments/:id` — update status | backend | [x] |
| `PUT /api/v1/appointments/:id/emergency` — insert as emergency | backend | [x] |
| `DELETE /api/v1/appointments/:id` — cancel | backend | [x] |
| `GET /api/v1/doctors/:id/slots` — available slots for a date | backend | [x] |
| `POST /api/v1/doctor-schedules` — set working hours | backend | [x] |
| `POST /api/v1/clinic-holidays` — add holiday / off day | backend | [x] |
| Token number auto-assign for walk-ins | backend | [x] |
| Appointment booking form (doctor, date, time slot) | frontend | [x] |
| Calendar view — day and week | frontend | [ ] *(deferred — queue view used instead)* |
| Live queue display with token numbers and status colors | frontend | [x] |
| Emergency patient button — jumps queue, shown in red | frontend | [x] |
| Status update buttons — Arrived / Completed / Cancel | frontend | [x] |
| Doctor schedule setup screen (admin only) | frontend | [x] |
| Clinic holidays screen (admin only) | frontend | [x] |
| Online booking page (public URL for patients) | frontend | [x] *(done in Phase 5.4 — `/book` public route, `BookingPage.jsx`, `portal.routes.js`)* |

**Completed:** 2026-04-07
**Test:** Book appointment → appears in queue. Mark arrived → status updates live. Add emergency → appears at top. Holiday blocked — cannot book on that date.

---

### Module 2.3 — Medical Records 🩺 ✅

**Why fourth:** Consultation is written after the patient is in the queue.

| Task | Project | Done |
|------|---------|------|
| Create `consultations` table | backend | [x] |
| `POST /api/v1/consultations` — create visit record | backend | [x] |
| `GET /api/v1/consultations/:id` — single record | backend | [x] |
| `GET /api/v1/consultations/patient/:patientId` — full visit history | backend | [x] |
| `GET /api/v1/consultations` — list by date | backend | [x] |
| `PUT /api/v1/consultations/:id` — update (within 24hr only) | backend | [x] |
| File upload endpoint for lab results (PDF/JPG) | backend | [ ] *(deferred to Phase 5)* |
| Consultation form (doctor opens from appointment) | frontend | [x] |
| Vitals input — BP, temperature, weight, pulse | frontend | [x] |
| Diagnosis field with ICD-10 code | frontend | [x] |
| Clinical notes text area | frontend | [x] |
| Follow-up date picker | frontend | [x] |
| File attachment upload and viewer | frontend | [ ] *(deferred to Phase 5)* |
| Patient visit history timeline | frontend | [x] |
| ConsultationsPage — date navigation, list all consultations | frontend | [x] |

**Completed:** 2026-04-08
**Test:** Open appointment → write consultation → save → appears in patient history. Allergies shown in red banner at top of form.

---

### Module 2.4 — Prescriptions 💊 ✅

**Why fifth:** Written at the end of a consultation, links to billing next.

| Task | Project | Done |
|------|---------|------|
| Create `medicines` table | backend | [x] |
| Create `prescriptions` table | backend | [x] |
| Create `prescription_items` table | backend | [x] |
| `POST /api/v1/prescriptions` — create | backend | [x] |
| `GET /api/v1/prescriptions/:id` — with all items | backend | [x] |
| `GET /api/v1/prescriptions/patient/:patientId` — full medicine history | backend | [x] |
| `GET /api/v1/prescriptions` — list by date with item count | backend | [x] |
| `GET /api/v1/medicines` — list with search | backend | [x] |
| `POST /api/v1/medicines` — add medicine to store | backend | [x] |
| `PUT /api/v1/medicines/:id` — update stock, price, expiry | backend | [x] |
| `DELETE /api/v1/medicines/:id` — soft delete / deactivate | backend | [x] |
| `GET /api/v1/medicines/low-stock` | backend | [x] |
| `GET /api/v1/medicines/near-expiry` | backend | [x] |
| Auto-generate Rx number `RX-XXXXX` | backend | [x] |
| PDF generation — server-side (`GET /prescriptions/:id/pdf`) | backend | [x] |
| Stock auto-deduct on dispensing (deferred to pharmacy module) | backend | [ ] |
| Prescription writer — "Write Rx" from completed appointment (doctor/admin) | frontend | [x] |
| Medicine search with live auto-suggest, debounced per row | frontend | [x] |
| Dosage / frequency / duration preset chips + free text per item | frontend | [x] |
| Prescription browser print (clinic header, medicines table, signature block) | frontend | [x] |
| PrescriptionsPage — date navigation, list Rx by date, print per row | frontend | [x] |
| Medicine store management screen (admin — add/edit/remove, low stock, near expiry tabs) | frontend | [x] |
| Medicine Store link in sidebar (admin only) | frontend | [x] |
| Patient profile Prescriptions tab — full history with items per Rx | frontend | [x] |
| Low stock / near-expiry alert badges on dashboard | frontend | [ ] *(deferred — use Reports medicines tab for now)* |
| Doctor signature upload screen | frontend | [x] *(built in Phase 2.7 Settings → Doctor Fees tab)* |

**Completed:** 2026-04-08  
**Test:** Search medicine → select → add dosage → save → Rx number generated. Print opens browser print window with clinic header and medicines table. Medicine Store shows low stock and near-expiry in separate tabs.

---

### Module 2.5 — Billing & Payments 💳 ✅

**Why sixth:** Invoice is generated after consultation and prescription are done.

| Task | Project | Done |
|------|---------|------|
| Create `invoices` table | backend | [x] |
| Create `invoice_items` table | backend | [x] |
| Create `payment_splits` table | backend | [x] |
| Create `custom_services` table | backend | [x] |
| Create `end_of_day` table | backend | [x] |
| `POST /api/v1/invoices` — create, auto-pull from consultation | backend | [x] |
| `GET /api/v1/invoices` — list by status, date | backend | [x] |
| `GET /api/v1/invoices/:id` — with items and splits | backend | [x] |
| `POST /api/v1/invoices/:id/pay` — record payment split | backend | [x] |
| `PUT /api/v1/invoices/:id/items` — add/remove line item | backend | [x] |
| `GET /api/v1/invoices/patient/:patientId` — billing history | backend | [x] |
| `GET /api/v1/invoices/check/:consultationId` — duplicate check | backend | [x] |
| `GET /api/v1/custom-services` — list services | backend | [x] |
| `POST /api/v1/custom-services` — add service | backend | [x] |
| `PUT /api/v1/custom-services/:id` — update | backend | [x] |
| `DELETE /api/v1/custom-services/:id` — soft delete | backend | [x] |
| `GET /api/v1/doctor-fees` — list fees | backend | [x] |
| `PUT /api/v1/doctor-fees/:doctorId` — upsert fee | backend | [x] |
| `POST /api/v1/end-of-day` — submit daily closing | backend | [x] |
| `GET /api/v1/end-of-day/summary/:date` — live pre-close totals | backend | [x] |
| `GET /api/v1/end-of-day/:date` — get closed record | backend | [x] |
| `GET /api/v1/end-of-day` — list history | backend | [x] |
| Auto-generate invoice number `INV-XXXXX` | backend | [x] |
| Auto-pull doctor consultation fee from `doctor_fees` | backend | [x] |
| Auto-pull prescribed medicines into invoice items | backend | [x] |
| PDF generation — invoice and receipt (`GET /invoices/:id/pdf`) | backend | [x] |
| BillingPage — date nav, status tabs, summary strip, table | frontend | [x] |
| InvoiceModal — line items, add/remove, totals, payment form | frontend | [x] |
| Custom service picker inside InvoiceModal | frontend | [x] |
| Split payment — multiple methods, each recorded as a split | frontend | [x] |
| Partial payment with balance due shown | frontend | [x] |
| "Bill" button on completed appointments (receptionist/admin) | frontend | [x] |
| Patient billing history tab — summary + invoice table | frontend | [x] |
| EndOfDayPage — totals, cash count, discrepancy, lock button | frontend | [x] |
| Invoice "Download PDF" button in InvoiceModal | frontend | [x] |

**Completed:** 2026-04-09
**Test:** Complete consultation → click Bill on queue row → invoice auto-populated with doctor fee and medicines. Add service item. Pay cash + insurance in two steps → both recorded as splits. EOD shows correct totals. Cash short highlighted in red.

---

### Module 2.6 — Reports & History 📊 ✅

**Why last in Phase 2:** Needs all data from previous modules to exist first.

| Task | Project | Done |
|------|---------|------|
| `GET /api/v1/reports/daily` | backend | [x] |
| `GET /api/v1/reports/monthly` | backend | [x] |
| `GET /api/v1/reports/doctors` | backend | [x] |
| `GET /api/v1/reports/medicines` | backend | [x] |
| `GET /api/v1/reports/patients` | backend | [x] |
| `GET /api/v1/reports/appointments` | backend | [x] |
| `GET /api/v1/reports/end-of-day/history` | backend | [x] |
| PDF export for all reports | backend | [ ] *(deferred to Phase 5)* |
| Excel / CSV export for all reports | backend | [x] *(CSV download in frontend)* |
| Admin analytics dashboard screen | frontend | [x] |
| Daily summary widgets | frontend | [x] |
| Monthly revenue chart | frontend | [x] |
| Doctor performance table | frontend | [x] |
| Medicine stock and expiry report | frontend | [x] |
| EOD closing history list | frontend | [x] |
| Date range filter on all reports | frontend | [x] |
| Export CSV button on all report tabs | frontend | [x] |
| Scheduled monthly email report toggle | frontend | [ ] *(deferred to Phase 5)* |

**Completed:** 2026-04-10
**Test:** All report tabs load with correct data. CSV export downloads. Date filter narrows results. Monthly bar charts render. Medicine low-stock and expiry lists highlighted correctly.

**✅ Phase 2 complete when:** A full patient visit cycle works end to end — register patient → appointment → consultation → prescription → invoice → payment → report shows the data.

---

## Phase 3 — Clinic Self-Customization ⚙️ *(moved to Module 2.7 — complete)*

> This makes each clinic feel like the software is theirs.

| Task | Project | Done |
|------|---------|------|
| `GET /api/v1/settings` — get clinic settings | backend | [x] |
| `PUT /api/v1/settings` — update settings | backend | [x] |
| `POST /api/v1/settings/logo` — upload clinic logo | backend | [x] |
| `DELETE /api/v1/settings/logo` — remove logo | backend | [x] |
| `POST /api/v1/settings/staff/:id/signature` — upload doctor signature | backend | [x] |
| `DELETE /api/v1/settings/staff/:id/signature` — remove signature | backend | [x] |
| `GET /api/v1/doctor-fees` — list fees | backend | [x] *(built in Phase 2.5)* |
| `PUT /api/v1/doctor-fees/:id` — update fee | backend | [x] *(built in Phase 2.5)* |
| File validation — JPG/PNG only, max 2MB | backend | [x] |
| Save files to `/uploads/tenants/{schema}/` | backend | [x] |
| Serve logo and signature via static `/uploads` URL | backend | [x] |
| Clinic settings screen — Branding tab (name, logo, address, phone, email) | frontend | [x] |
| Logo upload with live preview and remove button | frontend | [x] |
| Clinic settings — Documents tab (receipt header/footer, prescription footer) | frontend | [x] |
| Clinic settings — Billing tab (currency, tax rate, tax label) | frontend | [x] |
| Clinic settings — Appointments tab (slot duration, max per day, walk-in toggle) | frontend | [x] |
| Walk-in toggle enforcement — backend blocks walkin type when `allow_walk_ins=false`; frontend hides Walk-in tab in AppointmentModal | both | [x] |
| Clinic settings — Notifications tab (reminder toggle, hours, message template) | frontend | [x] |
| Clinic settings — Security tab (session timeout) | frontend | [x] |
| Doctor fees screen (set consultation fee per doctor) | frontend | [x] |
| Custom services management screen (add/edit/remove) | frontend | [x] |
| Clinic holidays management screen | frontend | [x] *(already in AppointmentsPage — HolidaysModal)* |
| Logo appears on invoice PDF / prescription PDF | frontend | [x] |
| Doctor signature appears on prescription PDF | frontend | [x] |
| "PDF" download button per Rx on PrescriptionsPage | frontend | [x] |
| `GET /api/v1/doctor-fees` returns `signature_url` for each doctor | backend | [x] *(fixed 2026-04-14 — was missing from SELECT)* |

**Completed:** 2026-04-14
**Test:** Upload logo → preview shown. Set doctor fee → appears on next invoice. Add custom service → appears in InvoiceModal picker. Change currency → reflected in billing settings. Download PDF on invoice → branded PDF with logo, line items, payment history. Download PDF on prescription → logo, medicines table, doctor signature.

**Deferred (column ready, UI/logic not yet built):**
- `patient_portal_enabled` — ✅ Done in Phase 5.4 — toggle in Settings → Security tab + shareable URL + Copy button
- `duplicate_check_enabled` — DB column ✅, **backend does not read/write it**, **no UI** — implement duplicate patient check logic + Settings UI toggle in Phase 6

**✅ Phase 3 complete.**

---

## Phase 4 — Super Admin Panel

> Your control room for managing all clinics.

| Task | Project | Done |
|------|---------|------|
| Admin login (separate credentials, separate JWT secret) | admin-frontend + backend | [x] |
| `GET /api/v1/admin/tenants` — list all clinics | backend | [x] |
| `GET /api/v1/admin/tenants/:id` — clinic detail + usage stats | backend | [x] |
| `POST /api/v1/admin/tenants` — create clinic + auto-creates first admin staff account | backend | [x] |
| `PUT /api/v1/admin/tenants/:id` — update clinic name/email/phone | backend | [x] |
| `PUT /api/v1/admin/tenants/:id/suspend` — suspend | backend | [x] |
| `PUT /api/v1/admin/tenants/:id/activate` — activate | backend | [x] |
| `POST /api/v1/admin/tenants/:id/impersonate` — login as clinic | backend | [x] |
| `GET /api/v1/admin/feature-flags/:tenantId` — get flags | backend | [x] |
| `PUT /api/v1/admin/feature-flags/:tenant_id` — toggle flags | backend | [x] |
| `GET /api/v1/admin/dashboard` — totals (active, suspended, total) | backend | [x] |
| Admin overview dashboard — total clinics, active, suspended stat cards | admin-frontend | [x] |
| Clinic list with status badges and search | admin-frontend | [x] |
| Create clinic form — name, subdomain (auto-generated), email, phone, password | admin-frontend | [x] |
| Credentials copy screen after clinic creation (URL, email, password) | admin-frontend | [x] |
| Clinic detail view — usage stats (patients, staff count), status | admin-frontend | [x] |
| Feature flag toggles per clinic (per module switch) | admin-frontend | [x] |
| Suspend / activate button | admin-frontend | [x] |
| Login as clinic button (impersonation) | admin-frontend | [x] |
| Removed: plan assignment (no tiers) | — | removed |
| Removed: trial management (no trials) | — | removed |
| Announcement send to all or selected clinics | admin-frontend | [ ] *(deferred)* |
| System health display — server, DB, uptime | admin-frontend | [ ] *(deferred)* |
| Audit log viewer | admin-frontend | [ ] *(deferred)* |

### Staff Management (Clinic Admin)

| Task | Project | Done |
|------|---------|------|
| `GET /api/v1/staff` — list all staff for the clinic | backend | [x] |
| `POST /api/v1/staff` — create staff member (admin only) | backend | [x] |
| `PUT /api/v1/staff/:id` — update staff details (admin only) | backend | [x] |
| `PUT /api/v1/staff/:id/reset-password` — reset password (admin only) | backend | [x] |
| `DELETE /api/v1/staff/:id` — soft-deactivate (admin only, cannot self-deactivate) | backend | [x] |
| `StaffPage.jsx` — grouped by role, add/edit/reset-password/activate-deactivate | clinic-frontend | [x] |
| `/staff` route registered in `App.jsx` (admin only) | clinic-frontend | [x] |
| Staff nav item in `Sidebar.jsx` (admin only) | clinic-frontend | [x] |

**Test:** Create new clinic → log in as that clinic → data isolated. Toggle pharmacy flag OFF → clinic cannot access pharmacy. Suspend clinic → clinic login blocked. Impersonate → opens clinic-frontend. Admin creates doctor/nurse/receptionist from Staff page → each can log in with their own credentials.

**Completed:** 2026-04-15
**✅ Phase 4 complete.**

---

## Phase 5 — Add-On Modules

> Only build these after Phase 4 is stable. These are premium plan features.

| Module | Flag | Status |
|--------|------|--------|
| Pharmacy / full inventory management | `pharmacy` | ✅ Complete (2026-04-15) |
| Lab test requests and results | `lab` | ✅ Complete (2026-04-15) |
| Insurance claims management | `insurance` | ✅ Complete (2026-04-15) |
| Patient Portal / Online Booking | `online_booking` + `patient_portal_enabled` | ✅ Complete (2026-04-15) |
| Multi-branch support | `multi_branch` | Not started |

---

### Module 5.1 — Pharmacy / Inventory ✅

**Completed:** 2026-04-15

| Task | Project | Done |
|------|---------|------|
| Create `suppliers` table | backend | [x] |
| Create `purchase_orders` table | backend | [x] |
| Create `purchase_order_items` table | backend | [x] |
| Create `stock_adjustments` table | backend | [x] |
| Add `is_dispensed`, `dispensed_at`, `dispensed_by` columns to `prescriptions` | backend | [x] |
| `GET/POST /pharmacy/suppliers` — list and create suppliers | backend | [x] |
| `PUT/DELETE /pharmacy/suppliers/:id` — update and soft-delete | backend | [x] |
| `GET/POST /pharmacy/purchase-orders` — list and create POs | backend | [x] |
| `GET /pharmacy/purchase-orders/:id` — single PO with items | backend | [x] |
| `PUT /pharmacy/purchase-orders/:id/receive` — receive stock, update medicine quantities | backend | [x] |
| `GET /pharmacy/dispense?date=` — dispense queue by date | backend | [x] |
| `POST /pharmacy/dispense/:prescriptionId` — dispense and deduct stock | backend | [x] |
| `GET/POST /pharmacy/stock-adjustments` — log and list adjustments | backend | [x] |
| All routes behind `requireFeature('pharmacy')` middleware | backend | [x] |
| Migration script — `migrate_pharmacy.js` | backend | [x] |
| PharmacyPage — 4-tab UI: Dispense Queue, Purchase Orders, Suppliers, Stock Adjustments | frontend | [x] |
| `pharmacy.js` API client | frontend | [x] |
| Route `/pharmacy` registered in `App.jsx` (receptionist, admin) | frontend | [x] |
| Sidebar entry already present (flag-gated) | frontend | [x] |

**Access:** Receptionist + Admin (sidebar + route). Add/Edit/Delete suppliers: Admin only on backend.

---

### Module 5.2 — Lab Integration ✅

**Completed:** 2026-04-15

| Task | Project | Done |
|------|---------|------|
| Create `lab_tests` table — test catalog | backend | [x] |
| Create `lab_requests` table — doctor orders test for patient | backend | [x] |
| Create `lab_results` table — result value + file per request | backend | [x] |
| Seed 12 common lab tests (FBC, FBS, HbA1c, Lipid, LFT, TFT, etc.) | backend | [x] |
| `GET /lab/tests` — list catalog (active_only filter) | backend | [x] |
| `POST /lab/tests` — add test (admin, receptionist) | backend | [x] |
| `PUT /lab/tests/:id` — edit test (admin, receptionist) | backend | [x] |
| `DELETE /lab/tests/:id` — soft delete (admin, receptionist) | backend | [x] |
| `GET /lab/requests` — queue by date/status/patient | backend | [x] |
| `POST /lab/requests` — create requests (doctor, admin, receptionist) | backend | [x] |
| `GET /lab/requests/:id` — single request with result | backend | [x] |
| `PUT /lab/requests/:id/result` — enter result + optional file upload (multer, 5MB, PDF/JPG/PNG) | backend | [x] |
| `GET /lab/patients/:patientId` — full lab history for patient | backend | [x] |
| All routes behind `requireFeature('lab')` middleware | backend | [x] |
| Migration script — `migrate_lab.js` | backend | [x] |
| LabPage — 2-tab UI: Lab Queue (date nav, enter/view result) + Test Catalog (grouped by category) | frontend | [x] |
| `lab.js` API client | frontend | [x] |
| Route `/lab` registered in `App.jsx` (doctor, nurse, admin, receptionist) | frontend | [x] |
| Patient Profile — Lab tab added (full history with result values and file links) | frontend | [x] |
| Sidebar entry already present (flag-gated, now includes receptionist) | frontend | [x] |

**Access:** Doctor, Nurse, Admin, Receptionist (all can view queue and enter results). Add/Edit/Delete tests + request tests: Admin, Receptionist, Doctor (not Nurse).

---

### Module 5.3 — Insurance Claims ✅

**Completed:** 2026-04-15

| Task | Project | Done |
|------|---------|------|
| Create `insurance_providers` table | backend | [x] |
| Create `corporate_accounts` table | backend | [x] |
| Add `corporate_account_id` column to `patients` | backend | [x] |
| Create `insurance_claims` table | backend | [x] |
| Seed 4 common insurance providers (Ceylinco, AIA, Union, Softlogic) | backend | [x] |
| `GET /insurance/lookup-invoice?invoice_number=` — resolve invoice → patient for claim form | backend | [x] |
| `GET/POST /insurance/providers` — list and create providers | backend | [x] |
| `PUT/DELETE /insurance/providers/:id` — update and soft-delete | backend | [x] |
| `GET /insurance/claims?status=&date_from=&date_to=&provider_id=` — filtered claim list | backend | [x] |
| `POST /insurance/claims` — create claim with auto CLM-XXXXX number | backend | [x] |
| `GET /insurance/claims/:id` — single claim with full detail | backend | [x] |
| `PUT /insurance/claims/:id/status` — update status + amount approved | backend | [x] |
| `GET/POST /insurance/corporate-accounts` — list and create accounts | backend | [x] |
| `PUT/DELETE /insurance/corporate-accounts/:id` — update and soft-delete | backend | [x] |
| `GET /insurance/corporate-accounts/:id/summary?month=` — monthly billing summary | backend | [x] |
| All routes behind `requireFeature('insurance')` middleware | backend | [x] |
| Migration script — `migrate_insurance.js` | backend | [x] |
| InsurancePage — 3-tab UI: Claims, Insurance Providers, Corporate Accounts | frontend | [x] |
| Claims tab: stats strip, filters (status/date), table, New Claim modal, Update Status modal | frontend | [x] |
| New Claim modal: invoice number lookup → auto-fills patient, then enter provider/amount/date/notes | frontend | [x] |
| Corporate Accounts: monthly billing summary modal with invoices table | frontend | [x] |
| `insurance.js` API client | frontend | [x] |
| Route `/insurance` registered in `App.jsx` (admin, receptionist, doctor) | frontend | [x] |
| Sidebar entry added (flag-gated `insurance`, roles: admin/receptionist/doctor) | frontend | [x] |

**Access:** Admin + Receptionist = full access. Doctor = view Claims tab only (read-only). Nurse = no access.

---

### Module 5.4 — Patient Portal / Online Booking ✅

**Completed:** 2026-04-15

| Task | Project | Done |
|------|---------|------|
| Add `booking_reference VARCHAR(20)`, `booking_source VARCHAR(20)` to appointments | backend | [x] |
| Create `backend-api/src/utils/patientCode.js` — shared PT-XXXXX generator | backend | [x] |
| Create `backend-api/src/utils/bookingReference.js` — shared BK-XXXXXX generator | backend | [x] |
| `GET /portal/info` — public clinic info | backend | [x] |
| `GET /portal/doctors` — list active doctors | backend | [x] |
| `GET /portal/doctors/:id/slots?date=` — available time slots | backend | [x] |
| `POST /portal/book` — submit booking, auto-create patient, return BK-XXXXXX | backend | [x] |
| `GET /portal/booking/:reference` — look up booking by reference | backend | [x] |
| Slot conflict check on `POST /portal/book` — server-side race condition protection | backend | [x] |
| Slot conflict check added to `POST /appointments` for `type='booked'` | backend | [x] |
| All portal routes behind `tenantMiddleware` only (no authMiddleware) | backend | [x] |
| `patient_portal_enabled` checked at start of each portal handler | backend | [x] |
| Migration script — `migrate_portal.js` | backend | [x] |
| `clinic-frontend/src/api/portal.js` — public Axios instance | frontend | [x] |
| `BookingPage.jsx` — 4-step public booking page at `/book` (no Sidebar/login) | frontend | [x] |
| `Drawer.jsx` — right-side slide-in drawer component (540px) | frontend | [x] |
| `AppointmentModal.jsx` rewrite — Drawer, slot grid for walk-in (optional) and booked (required) | frontend | [x] |
| Settings → Security tab — Patient Portal toggle + shareable URL + Copy button | frontend | [x] |
| AppointmentsPage — Globe badge + BK-XXXXXX reference in queue rows | frontend | [x] |
| DoctorDashboard — Now Seeing card, Next Up card, Online Booked stat | frontend | [x] |
| `/book` route in App.jsx — public, outside ProtectedRoute | frontend | [x] |
| Bug fix: ConsultationModal `watch is not defined` crash | frontend | [x] |
| Bug fix: portal patient code `P-XXXXX` → `PT-XXXXX` (shared util) | backend | [x] |
| Bug fix: double "Dr." prefix removed across all 11 affected files | frontend | [x] |

**Access:** Public (no login) for `/book`. All roles see Online badge. Doctor gets enhanced dashboard. Admin controls toggle.

---

## Phase 6 — Beta, Payments & Launch

| Task | Done |
|------|------|
| Integrate payment gateway for SaaS subscriptions (PayHere / Stripe) | [ ] |
| Auto-suspend clinics with overdue payment | [ ] |
| Invite 2–5 pilot clinics (free or discounted) | [ ] |
| Collect feedback — fix top issues | [ ] |
| Set up support channel (WhatsApp / email) | [ ] |
| Write user guide for clinic admins | [ ] |
| Write setup guide for new clinics (onboarding email) | [ ] |
| Set up automated daily database backups | [ ] |
| Set up uptime monitoring (UptimeRobot or similar) | [ ] |
| Set up error logging (Sentry or similar) | [ ] |
| Public launch | [ ] |

---

## Phase 7 — Desktop Version (After Stable SaaS)

> Only start this after you have at least 5 paying clinics and the SaaS is stable.

| Task | Done |
|------|------|
| Wrap `clinic-frontend` with Electron | [ ] |
| Add SQLite for local offline storage | [ ] |
| Add background sync (local → cloud when online reconnects) | [ ] |
| Offline warning banner when internet drops | [ ] |
| Package as Windows installer (.exe) | [ ] |
| Package as Mac installer (.dmg) | [ ] |
| Test install on a fresh Windows machine | [ ] |
| Set up auto-update mechanism | [ ] |

---

## Time Estimates (Solo Developer)

| Phase | Estimated Time |
|-------|---------------|
| Phase 1 — Foundation | 2–3 weeks | ✅ Done |
| Phase 2 — Core modules (2.0–2.7) | 8–12 weeks | ✅ Done |
| Phase 3 — PDF generation + branding | 1–2 weeks | ✅ Done |
| Phase 4 — Super admin | 2–3 weeks | ✅ Done |
| Phase 5.1 — Pharmacy | — | ✅ Done |
| Phase 5.2 — Lab | — | ✅ Done |
| Phase 5.3 — Insurance | — | ✅ Done |
| Phase 5.4 — Patient Portal | — | ✅ Done |
| Phase 5.5+ — Multi-branch | 2–4 weeks | |
| Phase 6 — Beta & launch | 2–3 weeks | |
| Phase 7 — Desktop | 3–4 weeks | |
| **Total to launch (SaaS)** | **~5–6 months** | |

---

## Module Dependency Chain

```
Phase 1 (Foundation)
    ↓
Auth + Multi-tenant + Feature flags
    ↓
2.0 Role dashboards
    ↓
2.1 Patient registration
    ↓
2.2 Appointments + Queue
    ↓
2.3 Medical records (consultation)
    ↓
2.4 Prescriptions + Medicine store
    ↓
2.5 Billing + Payments + EOD
    ↓
2.6 Reports
    ↓
Phase 3 Customization (logo, settings, branding)
    ↓
Phase 4 Super admin panel
    ↓
Phase 5 Add-on modules
    ↓
Phase 6 Beta + Launch
```

**Never jump ahead.** You cannot build billing before prescriptions. You cannot build reports before billing. The chain is strict.

---

## Daily Habit

```
Morning:
  1. Open ongoingworking.md — read where you stopped
  2. Open INSTRUCTION.md — read the rules
  3. git pull origin main
  4. Start exactly where you left off

Evening:
  1. Commit all changes with a clear message
  2. Update ongoingworking.md with today's progress
  3. Update databasequeries.md if DB was changed
  4. git push origin main
  5. Note what to do next session in ongoingworking.md
```

---

## Definition of Done — Per Module

A module is only DONE when all of the following are true:

- [ ] All backend API routes built and tested (Postman or similar)
- [ ] All frontend screens built and connected to backend
- [ ] Role access tested — wrong roles blocked at both frontend and backend
- [ ] Feature flag tested — module hidden when flag is OFF
- [ ] Empty state handled — screen shows something useful when no data exists
- [ ] Error states handled — API errors show clear messages to user
- [ ] Mobile view checked — usable on tablet/phone screen
- [ ] Committed to GitHub with clear message
- [ ] Marked as complete in `ongoingworking.md`
- [ ] Any new DB queries added to `databasequeries.md`

---

*PLAN.md — Doctor POS*  
*Stack: React · Node.js · PostgreSQL*  
*Read this file. Follow this order. Update ongoingworking.md as you go.*