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

### Step 1.1 — Server Setup
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
| Add `.gitignore` to all three (include `.env`) | [ ] |
| Create `Docs/` folder in `backend-api` with all 4 md files | [ ] |

---

### Step 1.3 — Database Foundation
| Task | Done |
|------|------|
| Create PostgreSQL database `clinicpos_db` | [ ] |
| Create `public.tenants` table | [ ] |
| Create `public.feature_flags` table | [ ] |
| Create `public.subscriptions` table | [ ] |
| Write tenant creation function (creates schema + inserts default flags) | [ ] |
| Test: create a test tenant, verify schema isolation | [ ] |
| Document all queries in `databasequeries.md` | [ ] |

---

### Step 1.4 — Authentication System
| Task | Done |
|------|------|
| `POST /api/v1/auth/login` — email + password → JWT token | [ ] |
| JWT middleware — verify token on every protected route | [ ] |
| Role middleware — check role before every protected route | [ ] |
| Tenant middleware — read subdomain → load tenant + feature flags | [ ] |
| `POST /api/v1/auth/logout` — invalidate token | [ ] |
| Password hashing with bcrypt | [ ] |
| Session timeout enforcement | [ ] |
| Test: login as doctor, login as receptionist, login as admin | [ ] |
| Test: wrong role gets 403, wrong tenant gets 403 | [ ] |

---

### Step 1.5 — Multi-Tenant Architecture
| Task | Done |
|------|------|
| Subdomain-reading middleware | [ ] |
| Schema-switching — every DB query uses correct tenant schema | [ ] |
| New clinic creation flow — schema + default data + flags | [ ] |
| Default `clinic_settings` row inserted on clinic creation | [ ] |
| Default `feature_flags` rows inserted (all OFF) | [ ] |
| Test: Clinic A data never visible to Clinic B | [ ] |

---

### Step 1.6 — Feature Flag System
| Task | Done |
|------|------|
| Load feature flags from DB on every authenticated request | [ ] |
| Backend enforces flags — returns 403 if module is off | [ ] |
| Frontend receives flags in login response | [ ] |
| Frontend stores flags in global state | [ ] |
| Frontend hides menu items based on flags | [ ] |
| Test: turn pharmacy OFF → menu item disappears, API rejects request | [ ] |

**✅ Phase 1 complete when:** A test clinic can log in, see correct role dashboard, and be blocked from disabled modules.

---

## Phase 2 — Core Modules

> Build in this exact order. Each module feeds the next.  
> `patients` → `appointments` → `consultations` → `prescriptions` → `billing` → `reports`

---

### Module 2.0 — Role-Based Dashboards

**Why first:** Every staff member lands here after login. It must work before anything else.

| Task | Project | Done |
|------|---------|------|
| `GET /api/v1/dashboard/doctor` | backend | [ ] |
| `GET /api/v1/dashboard/receptionist` | backend | [ ] |
| `GET /api/v1/dashboard/admin` | backend | [ ] |
| `GET /api/v1/dashboard/nurse` | backend | [ ] |
| Doctor dashboard screen — today's queue, next patient, Rx link | frontend | [ ] |
| Receptionist dashboard — live queue, collected/pending, alert badges | frontend | [ ] |
| Admin dashboard — revenue, patient count, doctor stats, EOD status | frontend | [ ] |
| Nurse dashboard — patients needing vitals | frontend | [ ] |
| Auto-route to correct dashboard after login based on role | frontend | [ ] |

**Test:** Log in as each role → correct dashboard shown with correct data.

---

### Module 2.1 — Patient Registration 👤

**Why second:** Every other module needs a patient to exist first.

| Task | Project | Done |
|------|---------|------|
| Create `patients` table in tenant schema | backend | [ ] |
| Add DB indexes on `phone`, `first_name`, `last_name`, `patient_code` | backend | [ ] |
| `POST /api/v1/patients` — create new patient | backend | [ ] |
| `GET /api/v1/patients` — list with search and pagination | backend | [ ] |
| `GET /api/v1/patients/:id` — full profile | backend | [ ] |
| `PUT /api/v1/patients/:id` — update details | backend | [ ] |
| `DELETE /api/v1/patients/:id` — soft delete | backend | [ ] |
| `GET /api/v1/patients/check-duplicate` — check before registering | backend | [ ] |
| `GET /api/v1/patients/returning?phone=` — quick lookup | backend | [ ] |
| Auto-generate patient code `PT-XXXXX` | backend | [ ] |
| Returning patient quick search screen (phone → results → add to queue) | frontend | [ ] |
| New patient registration form | frontend | [ ] |
| Duplicate patient warning modal | frontend | [ ] |
| Patient list with search bar and filters | frontend | [ ] |
| Patient profile page (full history timeline) | frontend | [ ] |

**Test:** Register new patient → appears in list. Search by phone → finds existing patient. Register same phone again → duplicate warning shown.

---

### Module 2.2 — Doctor Appointments 📅

**Why third:** Queue and appointments are needed before a consultation can happen.

| Task | Project | Done |
|------|---------|------|
| Create `appointments` table | backend | [ ] |
| Create `doctor_schedules` table | backend | [ ] |
| Create `clinic_holidays` table | backend | [ ] |
| `POST /api/v1/appointments` — create (booked or walk-in) | backend | [ ] |
| `GET /api/v1/appointments` — list by date, doctor, status | backend | [ ] |
| `PUT /api/v1/appointments/:id` — update status | backend | [ ] |
| `PUT /api/v1/appointments/:id/emergency` — insert as emergency | backend | [ ] |
| `DELETE /api/v1/appointments/:id` — cancel | backend | [ ] |
| `GET /api/v1/doctors/:id/slots` — available slots for a date | backend | [ ] |
| `POST /api/v1/doctor-schedules` — set working hours | backend | [ ] |
| `POST /api/v1/clinic-holidays` — add holiday / off day | backend | [ ] |
| Token number auto-assign for walk-ins | backend | [ ] |
| Appointment booking form (doctor, date, time slot) | frontend | [ ] |
| Calendar view — day and week | frontend | [ ] |
| Live queue display with token numbers and status colors | frontend | [ ] |
| Emergency patient button — jumps queue, shown in red | frontend | [ ] |
| Status update buttons — Arrived / Completed / Cancel | frontend | [ ] |
| Doctor schedule setup screen (admin only) | frontend | [ ] |
| Clinic holidays screen (admin only) | frontend | [ ] |
| Online booking page (public URL for patients) | frontend | [ ] |

**Test:** Book appointment → appears in queue. Mark arrived → status updates live. Add emergency → appears at top. Holiday blocked — cannot book on that date.

---

### Module 2.3 — Medical Records 🩺

**Why fourth:** Consultation is written after the patient is in the queue.

| Task | Project | Done |
|------|---------|------|
| Create `consultations` table | backend | [ ] |
| `POST /api/v1/consultations` — create visit record | backend | [ ] |
| `GET /api/v1/consultations/:id` — single record | backend | [ ] |
| `GET /api/v1/patients/:id/consultations` — full visit history | backend | [ ] |
| `PUT /api/v1/consultations/:id` — update (within 24hr only) | backend | [ ] |
| File upload endpoint for lab results (PDF/JPG) | backend | [ ] |
| Consultation form (doctor opens from appointment) | frontend | [ ] |
| Vitals input — BP, temperature, weight, pulse | frontend | [ ] |
| Diagnosis field with ICD-10 code search | frontend | [ ] |
| Clinical notes text area | frontend | [ ] |
| Follow-up date picker | frontend | [ ] |
| File attachment upload and viewer | frontend | [ ] |
| Patient visit history timeline | frontend | [ ] |
| Previous visit summary shown at top before doctor starts | frontend | [ ] |

**Test:** Open appointment → write consultation → save → appears in patient history. Previous visit allergies and complaint visible at top.

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
| PDF generation — server-side (deferred; browser print used instead) | backend | [ ] |
| Stock auto-deduct on dispensing (deferred to pharmacy module) | backend | [ ] |
| Prescription writer — "Write Rx" from completed appointment (doctor/admin) | frontend | [x] |
| Medicine search with live auto-suggest, debounced per row | frontend | [x] |
| Dosage / frequency / duration preset chips + free text per item | frontend | [x] |
| Prescription browser print (clinic header, medicines table, signature block) | frontend | [x] |
| PrescriptionsPage — date navigation, list Rx by date, print per row | frontend | [x] |
| Medicine store management screen (admin — add/edit/remove, low stock, near expiry tabs) | frontend | [x] |
| Medicine Store link in sidebar (admin only) | frontend | [x] |
| Patient profile Prescriptions tab — full history with items per Rx | frontend | [x] |
| Low stock / near-expiry alert badges on dashboard | frontend | [ ] |
| Doctor signature upload screen (deferred to Phase 3) | frontend | [ ] |

**Completed:** 2026-04-08  
**Test:** Search medicine → select → add dosage → save → Rx number generated. Print opens browser print window with clinic header and medicines table. Medicine Store shows low stock and near-expiry in separate tabs.

---

### Module 2.5 — Billing & Payments 💳

**Why sixth:** Invoice is generated after consultation and prescription are done.

| Task | Project | Done |
|------|---------|------|
| Create `invoices` table | backend | [ ] |
| Create `invoice_items` table | backend | [ ] |
| Create `payment_splits` table | backend | [ ] |
| Create `custom_services` table | backend | [ ] |
| Create `end_of_day` table | backend | [ ] |
| `POST /api/v1/invoices` — create, auto-pull from consultation | backend | [ ] |
| `GET /api/v1/invoices` — list by status, date | backend | [ ] |
| `GET /api/v1/invoices/:id` — with items and splits | backend | [ ] |
| `PUT /api/v1/invoices/:id/pay` — single payment | backend | [ ] |
| `POST /api/v1/invoices/:id/splits` — split payment | backend | [ ] |
| `GET /api/v1/custom-services` — list services | backend | [ ] |
| `POST /api/v1/custom-services` — add service | backend | [ ] |
| `POST /api/v1/end-of-day` — submit daily closing | backend | [ ] |
| `GET /api/v1/end-of-day/:date` — get closing for a date | backend | [ ] |
| Auto-generate invoice number `INV-XXXXX` | backend | [ ] |
| Auto-pull doctor consultation fee from `doctor_fees` | backend | [ ] |
| Auto-pull prescribed medicines into invoice items | backend | [ ] |
| PDF generation — invoice and receipt (clinic-branded) | backend | [ ] |
| Invoice generation screen (receptionist) | frontend | [ ] |
| Add/remove/edit line items | frontend | [ ] |
| Custom service picker from clinic list | frontend | [ ] |
| Single payment method selection | frontend | [ ] |
| Split payment screen (multiple methods + amounts) | frontend | [ ] |
| Partial payment with balance due display | frontend | [ ] |
| Invoice list with filters (paid / unpaid / partial) | frontend | [ ] |
| Invoice print / PDF download | frontend | [ ] |
| Patient billing history view | frontend | [ ] |
| End of day closing screen | frontend | [ ] |
| EOD — system totals vs cash counted, discrepancy display | frontend | [ ] |

**Test:** Complete consultation → open billing → invoice auto-populated with doctor fee and medicines. Pay with split cash + insurance → both recorded. EOD shows correct totals. Cash discrepancy highlighted in red.

---

### Module 2.6 — Reports & History 📊

**Why last in Phase 2:** Needs all data from previous modules to exist first.

| Task | Project | Done |
|------|---------|------|
| `GET /api/v1/reports/daily` | backend | [ ] |
| `GET /api/v1/reports/monthly` | backend | [ ] |
| `GET /api/v1/reports/doctors` | backend | [ ] |
| `GET /api/v1/reports/medicines` | backend | [ ] |
| `GET /api/v1/reports/patients` | backend | [ ] |
| `GET /api/v1/reports/appointments` | backend | [ ] |
| `GET /api/v1/reports/end-of-day/history` | backend | [ ] |
| PDF export for all reports | backend | [ ] |
| Excel export for all reports | backend | [ ] |
| Admin analytics dashboard screen | frontend | [ ] |
| Daily summary widgets | frontend | [ ] |
| Monthly revenue chart | frontend | [ ] |
| Doctor performance table | frontend | [ ] |
| Medicine stock and expiry report | frontend | [ ] |
| EOD closing history list | frontend | [ ] |
| Date range filter on all reports | frontend | [ ] |
| Export buttons (PDF + Excel) | frontend | [ ] |

**Test:** All report screens load with correct data. Export produces valid PDF and Excel files. Date filter narrows results correctly.

**✅ Phase 2 complete when:** A full patient visit cycle works end to end — register patient → appointment → consultation → prescription → invoice → payment → report shows the data.

---

## Phase 3 — Clinic Self-Customization ⚙️

> This makes each clinic feel like the software is theirs.

| Task | Project | Done |
|------|---------|------|
| `GET /api/v1/settings` — get clinic settings | backend | [ ] |
| `PUT /api/v1/settings` — update settings | backend | [ ] |
| `POST /api/v1/settings/logo` — upload clinic logo | backend | [ ] |
| `DELETE /api/v1/settings/logo` — remove logo | backend | [ ] |
| `POST /api/v1/staff/:id/signature` — upload doctor signature | backend | [ ] |
| `GET /api/v1/doctor-fees` — list fees | backend | [ ] |
| `PUT /api/v1/doctor-fees/:id` — update fee | backend | [ ] |
| File validation — JPG/PNG only, max 2MB | backend | [ ] |
| Save files to `/uploads/tenants/{tenant_id}/` | backend | [ ] |
| Serve logo and signature via secure URL | backend | [ ] |
| Clinic settings screen — Branding tab | frontend | [ ] |
| Logo upload with live preview and remove button | frontend | [ ] |
| Clinic settings — Documents tab (headers, footers) | frontend | [ ] |
| Clinic settings — Billing tab (currency, tax, discounts) | frontend | [ ] |
| Clinic settings — Appointments tab (slot duration, max per day, walk-in toggle) | frontend | [ ] |
| Clinic settings — Notifications tab (reminder on/off, timing, message) | frontend | [ ] |
| Clinic settings — Security tab (session timeout) | frontend | [ ] |
| Clinic settings — Patient portal tab (enable/disable, welcome message) | frontend | [ ] |
| Doctor profile page — signature upload | frontend | [ ] |
| Doctor fees screen (set consultation fee per doctor) | frontend | [ ] |
| Custom services management screen | frontend | [ ] |
| Clinic holidays management screen | frontend | [ ] |
| Logo appears on — dashboard header, invoice PDF, prescription PDF, patient portal | frontend | [ ] |
| Doctor signature appears on — prescription PDF print | frontend | [ ] |

**Test:** Upload logo → appears on dashboard and invoice PDF. Upload doctor signature → appears on printed prescription. Change receipt footer → appears on next generated invoice.

**✅ Phase 3 complete when:** A clinic can fully brand the system as their own without your help.

---

## Phase 4 — Super Admin Panel

> Your control room for managing all clinics.

| Task | Project | Done |
|------|---------|------|
| Admin login (separate credentials, IP-restricted) | admin-frontend + backend | [ ] |
| `GET /api/v1/admin/tenants` — list all clinics | backend | [ ] |
| `POST /api/v1/admin/tenants` — create new clinic | backend | [ ] |
| `PUT /api/v1/admin/tenants/:id` — update clinic | backend | [ ] |
| `PUT /api/v1/admin/tenants/:id/suspend` — suspend | backend | [ ] |
| `PUT /api/v1/admin/tenants/:id/activate` — activate | backend | [ ] |
| `POST /api/v1/admin/tenants/:id/impersonate` — login as clinic | backend | [ ] |
| `PUT /api/v1/admin/feature-flags/:tenant_id` — toggle flags | backend | [ ] |
| `GET /api/v1/admin/dashboard` — MRR, totals, health | backend | [ ] |
| Admin overview dashboard — total clinics, MRR, active, trial, suspended | admin-frontend | [ ] |
| Clinic list with status badges and search | admin-frontend | [ ] |
| Create clinic form | admin-frontend | [ ] |
| Clinic detail view — usage stats, last login, plan | admin-frontend | [ ] |
| Feature flag toggles per clinic (per module switch) | admin-frontend | [ ] |
| Plan assignment — basic / standard / premium | admin-frontend | [ ] |
| Suspend / activate button | admin-frontend | [ ] |
| Login as clinic button (impersonation — clearly marked) | admin-frontend | [ ] |
| Payment and subscription history per clinic | admin-frontend | [ ] |
| Trial management — extend, convert, expire | admin-frontend | [ ] |
| Announcement send to all or selected clinics | admin-frontend | [ ] |
| System health display — server, DB, uptime | admin-frontend | [ ] |
| Audit log viewer | admin-frontend | [ ] |

**Test:** Create new clinic → log in as that clinic → data isolated. Toggle pharmacy flag OFF → clinic cannot access pharmacy. Suspend clinic → clinic login blocked.

**✅ Phase 4 complete when:** You can fully manage any clinic from the admin panel without touching the server.

---

## Phase 5 — Add-On Modules

> Only build these after Phase 4 is stable. These are premium plan features.

| Module | Flag | Priority |
|--------|------|----------|
| Pharmacy / full inventory management | `pharmacy` | High |
| Lab test requests and results | `lab` | Medium |
| Insurance claims management | `insurance` | Medium |
| Multi-branch support | `multi_branch` | Low |

### Module 5.1 — Pharmacy / Inventory
- Advanced stock management (purchase orders, supplier records)
- Medicine dispensing workflow separate from prescription
- Batch tracking and expiry management
- Pharmacy-specific billing

### Module 5.2 — Lab Integration
- Lab test request from consultation
- Result upload and attachment to patient record
- Result notification to patient via SMS

### Module 5.3 — Insurance Claims
- Insurance provider management
- Claim submission from invoice
- Claim status tracking (pending / approved / rejected)
- Corporate account billing (monthly bulk invoice)

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
| Phase 1 — Foundation | 2–3 weeks |
| Phase 2 — Core modules | 8–12 weeks |
| Phase 3 — Customization | 2–3 weeks |
| Phase 4 — Super admin | 2–3 weeks |
| Phase 5 — Add-on modules | 4–6 weeks |
| Phase 6 — Beta & launch | 2–3 weeks |
| Phase 7 — Desktop | 3–4 weeks |
| **Total to launch (SaaS)** | **~5–6 months** |

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