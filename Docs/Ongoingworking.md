# ongoingworking.md — Feature Progress Tracker

> **Rule:** Update this file every time you complete a feature, stop mid-way, or start something new.  
> This is your memory. If it's not written here, you will forget it.

---

## How to Use This File

- When you **start** a feature → add it to "In Progress" with today's date
- When you **stop** mid-feature → note exactly where you stopped
- When you **complete** a feature → move it to "Completed" with date and notes
- When you **find a bug** → add it to "Known Issues"
- Check this file at the **start of every session** before writing any code

---

## Current Status

**Currently working on:** Phase 2.5 — Billing & Payments
**Last updated:** 2026-04-08
**Next up:** Phase 2.5 — Invoice generation, payment recording, end-of-day closing

---

## UI/UX Fixes Applied (2026-04-08)

> Fine-tune pass before moving to Phase 2.4. All changes are in `clinic-frontend` unless noted.

| Fix | File(s) | Notes |
|-----|---------|-------|
| Sidebar collapse/expand | `Sidebar.jsx`, `PageLayout.jsx`, `TopBar.jsx` | Smooth 300ms transition. Collapsed = 64px icons only. State persisted in localStorage. Toggle button at bottom. |
| Toast improvements | `main.jsx` | Better shadow, padding, font-weight, min-width. Sonner `richColors` + `closeButton` retained. |
| Modal sizing | Multiple | RegisterPatient → xl, EditPatient → xl, ConsultationModal → xl, AppointmentModal → lg, ManageScheduleModal → xl |
| Form validation — inline errors | `ConsultationModal.jsx` | `chief_complaint` is now required. Error shown under textarea. |
| Form validation — inline errors | `AppointmentModal.jsx` | All required fields (doctor, patient, time slot, new patient fields) now show red error text under the field. No toast for field errors. |
| Consultations page | `ConsultationsPage.jsx`, `App.jsx` | New `/consultations` route accessible from sidebar (doctor, admin). Date navigation, clickable rows link to patient profile. |
| Backend — list consultations | `consultation.routes.js` | Added `GET /api/v1/consultations` with optional `date`, `doctor_id`, `limit` query params. Route ordering also corrected (specific routes before `/:id`). |
| API client | `api/consultations.js` | Added `list(params)` method. |

---

## Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation — server, auth, multi-tenant setup | ✅ Complete |
| Phase 2 | Core clinic app — 6 main features | In Progress (2.1–2.4 complete) |
| Phase 3 | Super admin panel | Not started |
| Phase 4 | Add-on modules | Not started |
| Phase 5 | Beta and launch | Not started |
| Phase 6 | Desktop version | Not started |

---

## Phase 1 — Foundation

### 1.1 Server & Infrastructure
- [ ] Buy domain (clinicpos.com or similar)
- [ ] Spin up VPS on DigitalOcean / Hetzner
- [ ] Set wildcard DNS record `*.clinicpos.com`
- [ ] Install Nginx and configure reverse proxy
- [ ] Install SSL via Let's Encrypt (wildcard)
- [ ] Install Node.js, PostgreSQL, Redis on server
- [ ] Set up PM2 for process management

**Status:** Not started  
**Notes:** —

---

### 1.2 GitHub Repositories
- [ ] Create repo: `clinic-frontend`
- [ ] Create repo: `backend-api`
- [ ] Create repo: `admin-frontend`
- [x] Set up `.gitignore` in all three (include `.env`)
- [ ] Set up CI/CD — GitHub Actions auto deploy on push to main

**Status:** In progress
**Notes:** All three project folders scaffolded with package.json, .gitignore, .env.example, Tailwind, Vite config.

---

### 1.3 Database Setup
- [x] Create PostgreSQL database `clinicpos_db`
- [x] Create `public` schema tables: `tenants`, `feature_flags`, `subscriptions`
- [x] Write and run all public schema queries — `src/db/migrate.js`
- [x] Test tenant creation and schema isolation — demo tenant confirmed working

**Status:** ✅ Complete
**Notes:** migrate.js creates all public tables. createTenantSchema.js creates all per-clinic tables. seed.js creates demo clinic + 4 staff accounts.

---

### 1.4 Authentication System
- [x] Staff login endpoint (`POST /api/v1/auth/login`) — `src/routes/auth.routes.js`
- [x] JWT token generation and verification
- [x] Role middleware built — `src/middleware/auth.js` (authMiddleware + requireRole)
- [x] Tenant middleware built — `src/middleware/tenant.js` (tenantMiddleware + requireFeature)
- [x] Logout endpoint — `POST /api/v1/auth/logout`
- [x] Password hashing with bcrypt
- [ ] Session timeout enforcement (configured in clinic_settings — enforce in Phase 2.7)

**Status:** ✅ Complete
**Notes:** All 4 roles tested — login works, correct dashboard loads per role, JWT stored in localStorage, 401 auto-redirects to login.

---

### 1.5 Multi-Tenant Architecture
- [x] Subdomain reading middleware — reads from Host header or `X-Tenant-Subdomain` header (dev)
- [x] Tenant verification — confirms subdomain exists in `tenants` table, checks status
- [x] Schema switching — queryTenant() sets search_path per request
- [x] New clinic creation flow — createTenantSchema.js creates schema + all tables + default data
- [x] Test: demo tenant isolated, Clinic A cannot access Clinic B data

**Status:** ✅ Complete
**Notes:** In production subdomain comes from URL. In local dev pass VITE_TENANT_SUBDOMAIN in .env.

---

### 1.6 Customization System Setup

#### Level 1 — Super admin controls per clinic (feature flags)
- [x] `feature_flags` table created in public schema
- [x] Default flags inserted when a new clinic is created (seed.js inserts all ON for demo)
- [ ] Super admin can toggle flags ON/OFF — build in Phase 4 (admin-frontend)
- [x] Backend middleware loads flags on every authenticated request
- [x] Backend enforces flag check — requireFeature() returns 403 if module is off
- [x] Frontend loads flags after login and stores in AuthContext
- [x] Frontend sidebar hides module menu items based on loaded flags

**Available feature flags:**
```
pharmacy       — medicine store and dispensing
lab            — lab test requests and results
insurance      — insurance claims and coverage
online_booking — patient self-booking portal
multi_branch   — multiple branch management
custom_domain  — clinic uses their own domain
```

#### Level 2 — Clinic owner controls their own settings
- [ ] `clinic_settings` table created in tenant schema (see `databasequeries.md`)
- [ ] `doctor_fees` table created in tenant schema
- [ ] Default `clinic_settings` row inserted when new clinic is created
- [ ] Clinic settings screen built in `clinic-frontend` (admin/owner role only)
- [ ] Settings include: clinic name, logo, address, receipt header/footer, currency, tax rate, session timeout
- [ ] Doctor fee management screen (set consultation fee per doctor)
- [ ] Working hours / appointment slot duration configurable per clinic
- [ ] Patient portal toggle (enable/disable online booking per clinic preference)

**Status:** Not started  
**Started on:** —  
**Completed on:** —  
**Notes:** Build this in Phase 1 — before any feature module. Every module depends on flags being available.

---

## Phase 2 — Core Clinic Features

> ⚠️ **Customization reminder:** Before building any module below — confirm the feature flag exists, the backend checks it, and the frontend respects it. See Rule 11 in `INSTRUCTION.md`.

### 2.0 Role-Based Dashboards 🖥️
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [ ] `GET /api/v1/dashboard/doctor` — today's queue, patient count, completed
- [ ] `GET /api/v1/dashboard/receptionist` — all queues, billing summary, alerts
- [ ] `GET /api/v1/dashboard/admin` — revenue, patient count, doctor stats, EOD status
- [ ] `GET /api/v1/dashboard/nurse` — patients needing vitals today

#### Frontend
- [x] Doctor dashboard screen — scaffold with stat cards and empty queue (TODO: wire up API)
- [x] Receptionist dashboard screen — scaffold with stat cards and empty queue (TODO: wire up API)
- [x] Admin dashboard screen — scaffold with stat cards and empty charts (TODO: wire up API)
- [x] Nurse dashboard screen — scaffold with empty vitals list (TODO: wire up API)
- [x] Dashboard auto-selects based on logged-in role — DashboardRouter reads user.role

**Status:** Frontend scaffold done — needs backend API to show real data
**Started on:** 2026-04-07
**Completed on:** —
**Stopped at:** Dashboard screens show empty states. Wire up after backend dashboard routes are built.
**Notes:** DashboardRouter at `/dashboard` reads role from AuthContext and renders the correct screen.

---

### 2.1 Patient Registration 👤
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `POST /api/v1/patients` — create patient
- [x] `GET /api/v1/patients` — list with search + pagination
- [x] `GET /api/v1/patients/:id` — full profile with visit/invoice stats
- [x] `PUT /api/v1/patients/:id` — update patient
- [x] `DELETE /api/v1/patients/:id` — soft delete
- [x] `GET /api/v1/patients/check-duplicate` — checks phone, name+DOB, national ID
- [x] `GET /api/v1/patients/returning?phone=` — quick lookup with last visit
- [x] Auto-generate patient code (PT-XXXXX)
- [x] DB indexes on phone, name, patient_code, national_id

#### Frontend
- [x] Patient list page — search bar, paginated table, allergy warning in row
- [x] Returning patient quick search — phone search card at top of list
- [x] Register Patient modal — full form with all fields, grouped in sections
- [x] Duplicate warning modal — shows matches, Use Existing or Register Anyway
- [x] Patient profile page — header card, stats, tabs (overview/visits/prescriptions/billing)
- [x] Edit patient modal
- [x] Delete patient confirm dialog (admin only)
- [x] Role-based access — receptionist/admin register+edit, doctor/nurse view only

**Status:** ✅ Complete
**Started on:** 2026-04-08
**Completed on:** 2026-04-08
**Notes:** Visits/Prescriptions/Billing tabs show empty states — filled in Phases 2.3–2.5.

---

### 2.2 Doctor Appointments 📅
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `POST /api/v1/appointments` — create appointment (booked or walk-in)
- [x] `GET /api/v1/appointments` — list appointments (filter by date, doctor, status)
- [x] `PUT /api/v1/appointments/:id` — update status
- [x] `PUT /api/v1/appointments/:id/emergency` — insert as emergency, re-order queue
- [x] `DELETE /api/v1/appointments/:id` — cancel appointment
- [x] `GET /api/v1/doctors/:id/slots` — get available time slots for a date
- [x] `POST /api/v1/doctors/schedules` — set doctor working hours per day (upsert)
- [x] `GET /api/v1/doctors/schedules/:doctorId` — get doctor's weekly schedule
- [x] `POST /api/v1/doctors/holidays` — add clinic holiday
- [x] `GET /api/v1/doctors/holidays` — list all holidays
- [x] `DELETE /api/v1/doctors/holidays/:id` — remove holiday
- [x] Token number auto-assignment for walk-ins (sequential per doctor per day)
- [x] Holiday blocking on both booking and slot loading
- [ ] Appointment reminder job — runs nightly, sends SMS/WhatsApp (defer to Phase 4)

#### Frontend
- [x] Walk-in / Book / Emergency modal — AppointmentModal.jsx (combined 3-mode form)
- [x] Patient section: "Search Existing" tab (phone search) + "New Patient" tab (inline mini form)
- [x] Quick patient registration from within the modal — creates patient first, then appointment
- [x] "Register New" shortcut appears after a failed search (pre-fills phone into new patient form)
- [x] Doctor selector with time slot grid (booked mode)
- [x] Holiday / no-schedule messaging on slot grid
- [x] Live queue page — AppointmentsPage.jsx
- [x] Date navigation (prev/next day + date picker + back-to-today)
- [x] Doctor filter tabs (auto-built from doctors in today's queue)
- [x] Queue row with token #, emergency badge, allergy warning, status badge
- [x] Arrived / Complete / Cancel action buttons with confirm dialog
- [x] Make Emergency button (moves to top of queue)
- [x] Doctor schedule setup modal — ManageScheduleModal.jsx (admin)
- [x] Holidays management modal — HolidaysModal.jsx (admin)
- [ ] Online booking page (patient-facing) — defer to Phase 4
- [ ] Reminder settings screen — defer to Phase 4

**Status:** ✅ Complete
**Started on:** 2026-04-07
**Completed on:** 2026-04-07
**Notes:** Cancelled appointments excluded from queue view. Emergency patients sorted first via ORDER BY. Run `node src/db/migrate_add_constraints.js` once to add UNIQUE(doctor_id, day_of_week) on the demo tenant's doctor_schedules table. Quick patient registration from the Add to Queue modal creates a full patient record (PT-XXXXX) — optional fields can be completed later via patient profile.

---

### 2.3 Medical Records 🩺
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `POST /api/v1/consultations` — create, auto-completes appointment on save
- [x] `GET /api/v1/consultations/:id` — single record with patient + doctor info
- [x] `GET /api/v1/consultations/patient/:patientId` — full visit history
- [x] `PUT /api/v1/consultations/:id` — update, enforces 24hr window
- [x] Duplicate prevention — blocks second consultation on same appointment_id
- [ ] File upload for lab results (defer to Phase 5)

#### Frontend
- [x] ConsultationModal — opened from "Consult" button on arrived appointments
- [x] Patient info bar + allergy alert at top of form
- [x] Vitals section: BP (systolic/diastolic), pulse, temperature, weight
- [x] Clinical section: chief complaint, symptoms, diagnosis + ICD-10, doctor notes
- [x] Follow-up date field
- [x] Save → appointment auto-marked as completed
- [x] Patient profile Visits tab — full consultation history timeline with vitals

**Status:** ✅ Complete
**Started on:** 2026-04-08
**Completed on:** 2026-04-08
**Notes:** "Consult" button visible to doctor/admin roles only, when appointment status = arrived. 24hr edit window enforced on backend. File attachments deferred to Phase 5.

---

### 2.4 Prescriptions 💊
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `POST /api/v1/prescriptions` — create prescription with items array; resolves consultation_id from appointment_id; blocks duplicates (409); auto-generates RX-XXXXX
- [x] `GET /api/v1/prescriptions/:id` — full prescription with items and medicine details
- [x] `GET /api/v1/prescriptions/patient/:patientId` — full history with items per prescription
- [x] `GET /api/v1/prescriptions` — list by date with item count
- [x] `GET /api/v1/medicines` — list with search (name/generic/brand), category filter, include_inactive
- [x] `POST /api/v1/medicines` — create medicine (admin); name + unit required
- [x] `PUT /api/v1/medicines/:id` — update using COALESCE pattern (admin)
- [x] `DELETE /api/v1/medicines/:id` — soft delete / deactivate (admin)
- [x] `GET /api/v1/medicines/low-stock` — medicines at or below reorder level
- [x] `GET /api/v1/medicines/near-expiry` — medicines expiring within 60 days
- [x] Auto-generate Rx number (RX-XXXXX from COUNT+1)
- [ ] PDF generation — server-side (deferred; using browser print for now)
- [ ] Stock auto-deduct when medicine is dispensed (deferred to pharmacy module)
- [ ] Expiry alert notifications (deferred to Phase 4)

#### Frontend
- [x] PrescriptionModal — opened from "Write Rx" button on completed appointments (doctor/admin)
- [x] Medicine search with live auto-suggest (debounced 300ms, per-row independent search)
- [x] Dosage / frequency / duration preset chips + free-text input (`FieldWithPresets`)
- [x] Multi-row prescription items with add/remove row
- [x] Save → shows success banner with Rx number, Print button enabled
- [x] Print — browser print window with clinic header, patient/doctor info, allergies alert, medicines table, signature block (`printPrescription.js`)
- [x] PrescriptionsPage — date navigation, list all Rx for date, print per row
- [x] MedicineStorePage — All/Low Stock/Near Expiry tabs, search, table with status badges, add/edit/remove modal
- [x] Patient profile Prescriptions tab — full history with items per Rx
- [x] Sidebar — "Medicine Store" link added for admin role
- [ ] Doctor signature upload screen (deferred to Phase 2.7)
- [ ] Visit summary print (deferred — prescription print covers core need)

**Status:** ✅ Complete
**Started on:** 2026-04-08
**Completed on:** 2026-04-08
**Notes:** Browser print used instead of server-side PDF — works well for now. Stock auto-deduction deferred until pharmacy module. Prescription is linked to consultation via appointment_id resolution on backend. "Write Rx" button appears when appointment status = completed (doctor/admin roles only).

---

### 2.5 Billing & Payments 💳
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [ ] `POST /api/v1/invoices` — create invoice (auto-pull from consultation)
- [ ] `GET /api/v1/invoices` — list invoices (filter by status, date, doctor)
- [ ] `GET /api/v1/invoices/:id` — get invoice with all items and payment splits
- [ ] `PUT /api/v1/invoices/:id/pay` — record single payment method
- [ ] `POST /api/v1/invoices/:id/splits` — record split payment (multiple methods)
- [ ] `GET /api/v1/patients/:id/invoices` — full patient billing history
- [ ] `GET /api/v1/custom-services` — list clinic's custom service items
- [ ] `POST /api/v1/custom-services` — add new custom service (admin)
- [ ] `PUT /api/v1/custom-services/:id` — update service / price
- [ ] `GET /api/v1/end-of-day/:date` — get EOD record for a date
- [ ] `POST /api/v1/end-of-day` — submit daily closing with cash count
- [ ] Auto-generate invoice number (INV-XXXXX)
- [ ] Auto-pull consultation fee (from `doctor_fees`) and medicines into invoice on creation
- [ ] Auto-pull custom services selected during consultation into invoice
- [ ] PDF generation for invoice and receipt (with clinic logo, header, footer)
- [ ] Create tenant schema tables: `invoices`, `invoice_items`, `payment_splits`, `custom_services`, `end_of_day`

#### Frontend
- [ ] Invoice generation screen (receptionist — auto-populated from consultation)
- [ ] Add / remove / edit invoice line items manually if needed
- [ ] Custom service picker — select from clinic's pre-defined service list
- [ ] Single payment method selection
- [ ] Split payment screen — add multiple methods with amounts and references
- [ ] Partial payment recording with balance due shown clearly
- [ ] Invoice list with status filters (paid / unpaid / partial) and date filter
- [ ] Invoice print / PDF download (clinic-branded)
- [ ] Patient billing history view with total spent
- [ ] End of day closing screen (receptionist / admin)
  - [ ] Shows system totals per payment method
  - [ ] Cash count input field
  - [ ] Discrepancy shown clearly (green if matched, red if difference)
  - [ ] Notes field for explanation
  - [ ] Confirm and lock button

**Status:** Not started  
**Started on:** —  
**Completed on:** —  
**Stopped at:** —  
**Notes:** Split payment is common — half cash half insurance is the most frequent case. EOD closing is a daily must-have for every clinic owner.

---

### 2.6 Reports & History 📊
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [ ] `GET /api/v1/reports/daily` — daily revenue, patient count, payment method breakdown
- [ ] `GET /api/v1/reports/monthly` — monthly summary with trends
- [ ] `GET /api/v1/reports/doctors` — income and visits per doctor for date range
- [ ] `GET /api/v1/reports/medicines` — stock levels, dispensed, near-expiry
- [ ] `GET /api/v1/reports/patients` — demographics, new vs returning, visit frequency
- [ ] `GET /api/v1/reports/appointments` — count, cancellation rate, peak hours
- [ ] `GET /api/v1/reports/end-of-day/history` — all past EOD closing records
- [ ] PDF export for all reports
- [ ] Excel export for all reports

#### Frontend
- [ ] Admin analytics dashboard home screen — revenue, patients, doctor stats, alert badges
- [ ] Daily summary — today's patients, income collected, pending, appointments completed
- [ ] Monthly revenue chart (bar or line)
- [ ] Doctor performance table (patients seen, revenue, cancellations)
- [ ] Medicine stock report with near-expiry highlighted in amber/red
- [ ] End of day history — list of all past closings, flag any days with discrepancy
- [ ] Patient demographics report
- [ ] Appointment analysis (peak hours, no-show rate)
- [ ] Date range filter on all reports
- [ ] Export to PDF button
- [ ] Export to Excel button
- [ ] Scheduled monthly email report toggle (admin setting)

**Status:** Not started  
**Started on:** —  
**Completed on:** —  
**Stopped at:** —  
**Notes:** EOD history is important — owner must be able to review any past day's closing record.

---

## Phase 2.7 — Clinic Self-Customization ⚙️
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [ ] `GET /api/v1/settings` — get clinic settings
- [ ] `PUT /api/v1/settings` — update clinic settings
- [ ] `POST /api/v1/settings/logo` — upload clinic logo (multipart form)
- [ ] `DELETE /api/v1/settings/logo` — remove clinic logo
- [ ] `POST /api/v1/staff/:id/signature` — upload doctor signature image
- [ ] `GET /api/v1/doctor-fees` — get all doctor fees
- [ ] `PUT /api/v1/doctor-fees/:doctor_id` — update a doctor's consultation fee
- [ ] File validation — type (JPG/PNG only), max size 2MB, save to `/uploads/tenants/{tenant_id}/`
- [ ] Logo URL stored in `clinic_settings.clinic_logo_url`
- [ ] Signature URL stored in `staff.signature_url`

#### Frontend — Clinic Settings Screen (admin/owner only)
- [ ] **Branding tab** — clinic name, logo upload with preview, address, phone, email
- [ ] **Documents tab** — receipt header, receipt footer, prescription footer
- [ ] **Billing tab** — currency, tax rate, tax label, discount rules
- [ ] **Appointments tab** — slot duration, max patients per day, walk-in toggle, advance booking days
- [ ] **Notifications tab** — reminder toggle, hours before, custom message template
- [ ] **Security tab** — session timeout duration
- [ ] **Patient portal tab** — enable/disable, welcome message, which doctors visible
- [ ] Logo upload button with image preview and remove option
- [ ] Doctor signature upload in each doctor's staff profile page
- [ ] Custom services management screen — add/edit/delete clinic services with prices
- [ ] Doctor fees screen — set consultation fee per doctor
- [ ] Clinic holidays screen — add/remove blocked dates

**Status:** Not started  
**Started on:** —  
**Completed on:** —  
**Stopped at:** —  
**Notes:** Logo and signature upload are the most visible customization features — clinics judge the software by whether it looks like theirs.

---

## Phase 3 — Super Admin Panel

### 3.1 Admin Dashboard
- [ ] Overview — total clinics, MRR, active users, server health
- [ ] Clinic list with status (active, trial, suspended)
- [ ] Alert panel — clinics with overdue payments, trials expiring soon

**Status:** Not started

### 3.2 Clinic Management
- [ ] Create new clinic (triggers schema creation + default settings + feature flag setup)
- [ ] Edit clinic details (name, plan, subdomain)
- [ ] Suspend / activate clinic account
- [ ] Login as clinic — impersonation for support (clearly marked so you know you are impersonating)
- [ ] View clinic usage stats — patient count, last login, storage used

**Status:** Not started

### 3.3 Plans & Feature Flags
- [ ] Assign / change plan per clinic (basic / standard / premium)
- [ ] Toggle individual feature flags per clinic
  - [ ] pharmacy on/off
  - [ ] lab on/off
  - [ ] insurance on/off
  - [ ] online_booking on/off
  - [ ] multi_branch on/off
  - [ ] custom_domain on/off
- [ ] View payment status and subscription history
- [ ] Trial management — extend trial, convert to paid, expire early
- [ ] Send announcement to all clinics or selected clinics

**Status:** Not started

### 3.4 System Health
- [ ] Server CPU, memory, disk usage display
- [ ] Database connection status
- [ ] Uptime display
- [ ] Audit log viewer — who did what across the system

**Status:** Not started

---

## Known Issues & Bugs

> Add bugs here as you find them. Never leave a bug undocumented.

| # | Date found | Description | Severity | Status |
|---|-----------|-------------|----------|--------|
| — | — | No issues logged yet | — | — |

---

## Completed Features

> Move items here when fully done and tested.

| Feature | Completed on | Notes |
|---------|-------------|-------|
| Project scaffold — all 3 folders | 2026-04-07 | package.json, .gitignore, .env.example, Vite + Tailwind config for both frontends |
| clinic-frontend UI component library | 2026-04-07 | Button, Input, Select, Modal, Badge, Table, PageHeader, Card, ConfirmDialog, EmptyState, Spinner, OfflineBanner |
| clinic-frontend layout system | 2026-04-07 | Sidebar (role+flag aware), TopBar, PageLayout, ProtectedRoute |
| clinic-frontend auth flow | 2026-04-07 | LoginPage, AuthContext, Axios instance with JWT + subdomain header, 401 auto-redirect |
| clinic-frontend dashboard scaffolds | 2026-04-07 | All 4 role dashboards with correct structure, empty states, TODO markers for API wiring |
| backend-api middleware | 2026-04-07 | auth.js (JWT + requireRole), tenant.js (subdomain lookup + requireFeature), db.js (queryPublic + queryTenant) |

---

## Session Log

> Quick notes from each coding session.

| Date | What I worked on | Where I stopped | Next session plan |
|------|-----------------|-----------------|-------------------|
| 2026-04-07 | clinic-frontend full Phase 1 scaffold — UI components, layout, auth, dashboards | Dashboard screens show empty states — backend not yet connected | Build `POST /api/v1/auth/login` in backend-api, then create DB tables from databasequeries.md |
| 2026-04-08 | backend Phase 1 complete — migrate.js, seed.js, auth routes, tenant + feature flag middleware | Phase 1 fully done — all 4 roles can log in and land on correct dashboard | Start Phase 2.1 Patient Registration |
| 2026-04-08 | Phase 2.1 Patient Registration — all backend routes + full frontend (list, profile, register, edit, duplicate check) | Complete | Start Phase 2.2 Appointments |
| 2026-04-07 | Phase 2.2 Appointments — all backend routes, AppointmentModal, ManageScheduleModal, HolidaysModal, AppointmentsPage (live queue) | Complete | Start Phase 2.3 Medical Records |
| 2026-04-08 | Phase 2.3 Medical Records — consultation routes, ConsultationModal, VisitsTab on patient profile | Complete | Start Phase 2.4 Prescriptions |
| 2026-04-08 | UI/UX fine-tune pass — sidebar collapse, toast improvements, modal sizing, inline form validation, ConsultationsPage + route | Complete | Start Phase 2.4 Prescriptions |
| 2026-04-08 | Phase 2.4 Prescriptions — medicines + prescriptions backend routes, PrescriptionModal, PrescriptionsPage, MedicineStorePage, PatientProfile Rx tab, browser print | Complete | Start Phase 2.5 Billing |

---

*ongoingworking.md — Doctor POS*  
*Update this file at the start and end of every coding session*