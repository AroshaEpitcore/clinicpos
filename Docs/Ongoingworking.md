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

**Currently working on:** Phase 5.3 complete — Phase 6 Beta & Launch next
**Last updated:** 2026-04-15
**Next up:** Phase 6 — Beta, payments, deployment, onboarding

### What is fully complete right now

| Phase | What's done |
|-------|-------------|
| Phase 1 — Foundation | ✅ DB, auth, multi-tenant, feature flags |
| Phase 2 — Core modules | ✅ Patients, Appointments, Consultations, Prescriptions, Billing, Reports, Settings (2.0–2.7) |
| Phase 3 — Branding + PDF | ✅ Clinic logo, doctor signatures, invoice PDF, prescription PDF |
| Phase 4 — Super admin | ✅ Admin panel, impersonation, feature flag toggles, suspend/activate |
| UI Polish pass | ✅ Dark mode, DatePicker, improved Select dropdowns, Inter font (2026-04-15) |
| Phase 5.1 — Pharmacy | ✅ Suppliers, Purchase Orders, Dispense Queue, Stock Adjustments (2026-04-15) |
| Phase 5.2 — Lab      | ✅ Test Catalog, Lab Queue, Enter Result (value + file upload), Patient Lab History tab (2026-04-15) |
| Phase 5.3 — Insurance | ✅ Claims (CLM-XXXXX), Insurance Providers, Corporate Accounts + Monthly Billing Summary (2026-04-15) |

### What is NOT yet started
- Phase 6 — Beta & launch (payments, deployment, onboarding)
- Phase 7 — Electron desktop version

### Small items deferred (documented but not started)

| Item | Deferred to |
|------|-------------|
| `patient_portal_enabled` Settings toggle | Phase 5 (when patient portal is built) |
| `duplicate_check_enabled` backend logic | Phase 5 |
| Session timeout backend enforcement | Phase 5 |
| PDF export for all reports | Phase 5 |
| Stock auto-deduct on prescription dispensing | ✅ Done in Phase 5.1 — dispense endpoint deducts stock |
| Appointment reminder SMS/WhatsApp job | Phase 5 |
| Online patient booking page | Phase 5 |
| Payment/subscription history in admin panel | Phase 5 |
| Trial management UI (extend, convert, expire) | Phase 5 |
| System health display in admin panel | Phase 5 |
| Audit log viewer | Phase 5 |

---

## UI Polish Pass — Dark Mode, DatePicker, Font (2026-04-15)

> Full UI polish pass applied to `clinic-frontend`. All changes are frontend-only.

| Change | Files affected | Notes |
|--------|---------------|-------|
| Dark mode system | `ThemeContext.jsx` (new), `main.jsx`, `variables.css`, `Sidebar.jsx`, `TopBar.jsx`, `tailwind.config.js` | Toggle button in TopBar (sun/moon icon). Theme persisted in localStorage. Follows system preference on first load. `darkMode: 'class'` in Tailwind. CSS variables for all dark overrides in `variables.css`. |
| DatePicker component | `DatePicker.jsx` (new), `package.json` | Custom calendar using `react-day-picker` v8 + `@radix-ui/react-popover`. Replaces all `<input type="date">` across 12 pages. Supports min/max, disabled days, keyboard nav. CSS imported in `index.css`. |
| Select dropdown | `Select.jsx` | Improved Radix Select — wider trigger, animated chevron, highlighted items, `disabled` prop support, `position="popper"` for correct placement in modals. |
| Input component | `Input.jsx` | Converted to `forwardRef` — required for `react-hook-form` `register()` to work correctly when used with spread props. |
| Inter font | `index.css`, `tailwind.config.js`, `package.json` | Installed `@fontsource/inter`. Weights 400/500/600/700 imported. Tailwind `fontFamily.sans` set to Inter. |
| Dark mode — component backgrounds | `Button.jsx`, `Card.jsx`, `Modal.jsx`, `Input.jsx`, `Select.jsx` | All `bg-white` → `bg-[var(--color-surface)]` |
| Dark mode — page cards/containers | `BillingPage.jsx`, `ConsultationsPage.jsx`, `PrescriptionsPage.jsx`, `MedicineStorePage.jsx`, `LoginPage.jsx`, `ImpersonatePage.jsx` | All inline `bg-white` container divs → `bg-[var(--color-surface)]` |
| Dark mode — dashboard stat cards | `AdminDashboard.jsx`, `DoctorDashboard.jsx`, `NurseDashboard.jsx`, `ReceptionistDashboard.jsx` | StatCard components + inline cells → `bg-[var(--color-surface)]`. Fallback badge colors `bg-gray-50/text-gray-600` → CSS variables. |
| Dark mode — dropdowns and pickers | `InvoiceModal.jsx`, `AppointmentModal.jsx`, `PrescriptionModal.jsx`, `ReportsPage.jsx` | Search dropdowns, payment method buttons, slot buttons, preset chips, sub-tab buttons → `bg-[var(--color-surface)]` |
| Dark mode — all raw inputs global | `index.css` | Added global `input, textarea, select { background-color: var(--color-surface); color: var(--color-text); }` — catches all raw inputs that don't use the Input component |

**Bug fixes during this pass:**

| # | File | Bug | Fix |
|---|------|-----|-----|
| 12 | `ReportsPage.jsx` | `Calendar` icon used in TABS array but not imported → ReferenceError crashing Reports page | Added `Calendar` to lucide-react import |
| 13 | `AppointmentsPage.jsx` | Same — `Calendar` used at line 217 but not imported | Added `Calendar` to import |
| 14 | `BillingPage.jsx` | Same — `Calendar` used in date header but not imported | Added `Calendar` to import |
| 15 | `index.css` | `react-day-picker/dist/style.css` not imported — calendar popup rendered unstyled | Added CSS import |
| 16 | `TopBar.jsx` | `w-4.5 h-4.5` not a valid Tailwind class — sun/moon icons had no size | Changed to `w-[18px] h-[18px]` |

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
| Phase 2 | Core clinic app — all modules (2.0–2.7) | ✅ Complete |
| Phase 3 | Branding + PDF generation (2.7 settings, pdfkit, print fix, logo URL) | ✅ Complete |
| Phase 4 | Super admin panel | ✅ Complete (core — health/audit/trial mgmt deferred to Phase 5) |
| UI Polish | Dark mode, DatePicker, Select, Inter font, bg-white audit | ✅ Complete (2026-04-15) |
| Phase 5.1 | Pharmacy — suppliers, purchase orders, dispense queue, stock adjustments | ✅ Complete (2026-04-15) |
| Phase 5.2 | Lab — test catalog, queue, result entry + file upload, patient history tab | ✅ Complete (2026-04-15) |
| Phase 5.3 | Insurance — claims, insurance providers, corporate accounts + monthly billing | ✅ Complete (2026-04-15) |
| Phase 6 | Beta & launch | Not started |
| Phase 7 | Desktop version (Electron) | Not started |

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
- [x] Super admin can toggle flags ON/OFF — built in Phase 4 (admin-frontend ClinicDetailPage)
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
- [x] `clinic_settings` table created in tenant schema
- [x] `doctor_fees` table created in tenant schema
- [x] Default `clinic_settings` row inserted when new clinic is created
- [x] Clinic settings screen built in `clinic-frontend` (admin/owner role only)
- [x] Settings include: clinic name, logo, address, receipt header/footer, currency, tax rate, session timeout
- [x] Doctor fee management screen (set consultation fee per doctor)
- [x] Working hours / appointment slot duration configurable per clinic
- [x] Patient portal toggle (enable/disable online booking per clinic preference)

**Status:** ✅ Complete (built in Phase 2.7)

---

## Phase 2 — Core Clinic Features

> ⚠️ **Customization reminder:** Before building any module below — confirm the feature flag exists, the backend checks it, and the frontend respects it. See Rule 11 in `INSTRUCTION.md`.

### 2.0 Role-Based Dashboards 🖥️
**Project:** `clinic-frontend`

- [x] Doctor dashboard — stat cards (total/waiting/arrived/completed) + appointment list (uses `/appointments?date&doctor_id`)
- [x] Receptionist dashboard — stat cards + live queue table + billing summary (uses `/appointments` + `/end-of-day/summary`)
- [x] Admin dashboard — stat cards + monthly revenue bar chart + doctor performance table (uses `/reports/daily` + `/reports/monthly` + `/reports/doctors`)
- [x] Nurse dashboard — patients in clinic today with status + patient profile links (uses `/appointments`)
- [x] Dashboard auto-selects based on logged-in role — DashboardRouter reads user.role

*No dedicated `/dashboard/*` backend routes needed — dashboards compose from existing APIs.*

**Status:** ✅ Complete
**Started on:** 2026-04-07
**Completed on:** 2026-04-14
**Notes:** All 4 dashboards show live data. Admin uses reports API (admin-only). Other roles use appointments + end-of-day APIs.

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
- [ ] Appointment reminder job — runs nightly, sends SMS/WhatsApp (defer to Phase 5)

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
- [ ] Online booking page (patient-facing) — defer to Phase 5
- [ ] Reminder settings screen — defer to Phase 5

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
- [x] PDF generation — server-side (`GET /prescriptions/:id/pdf` + `GET /invoices/:id/pdf` via pdfkit)
- [ ] Stock auto-deduct when medicine is dispensed (deferred to Phase 5 pharmacy module)
- [ ] Expiry alert notifications (deferred to Phase 5)

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
- [x] Doctor signature upload screen — built in Phase 2.7 (Settings → Doctor Fees tab)
- [ ] Visit summary print (deferred — prescription print covers core need)

**Status:** ✅ Complete
**Started on:** 2026-04-08
**Completed on:** 2026-04-08
**Notes:** Browser print used instead of server-side PDF — works well for now. Stock auto-deduction deferred until pharmacy module. Prescription is linked to consultation via appointment_id resolution on backend. "Write Rx" button appears when appointment status = completed (doctor/admin roles only).

---

### 2.5 Billing & Payments 💳
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `POST /api/v1/invoices` — create from consultation; auto-pulls doctor fee + prescribed medicines; blocks duplicates (409); auto-generates INV-XXXXX
- [x] `GET /api/v1/invoices` — list by date + status filter + patient_id filter
- [x] `GET /api/v1/invoices/:id` — full invoice with items + payment splits
- [x] `POST /api/v1/invoices/:id/pay` — record a payment split (any method); updates paid_amount, balance_due, payment_status
- [x] `PUT /api/v1/invoices/:id/items` — add or remove a line item; recalculates totals
- [x] `GET /api/v1/invoices/patient/:patientId` — full billing history for a patient
- [x] `GET /api/v1/invoices/check/:consultationId` — check if invoice already exists for a consultation
- [x] `GET /api/v1/custom-services` — list active custom services
- [x] `POST /api/v1/custom-services` — add custom service (admin)
- [x] `PUT /api/v1/custom-services/:id` — update (admin)
- [x] `DELETE /api/v1/custom-services/:id` — soft delete (admin)
- [x] `GET /api/v1/doctor-fees` — list all doctors with their consultation fee
- [x] `PUT /api/v1/doctor-fees/:doctorId` — upsert doctor fee (admin)
- [x] `GET /api/v1/end-of-day/summary/:date` — live totals for a date (pre-close view)
- [x] `GET /api/v1/end-of-day/:date` — get a specific closed EOD record
- [x] `GET /api/v1/end-of-day` — list past EOD records
- [x] `POST /api/v1/end-of-day` — submit and lock day closing
- [x] Auto-generate invoice number (INV-XXXXX)
- [x] Auto-pull doctor consultation fee from `doctor_fees` on invoice creation
- [x] Auto-pull prescribed medicines (with prices) from `prescription_items` on invoice creation
- [x] PDF generation for invoice/receipt (`GET /invoices/:id/pdf` + Download PDF button in InvoiceModal)

#### Frontend
- [x] BillingPage — date navigation, status filter tabs (All/Unpaid/Partial/Paid), summary strip (billed/collected/outstanding), invoice table
- [x] InvoiceModal — patient header, line items table, add item (with custom service picker dropdown), remove item, totals breakdown, payment history, record payment form (Cash/Card/Online/Insurance with reference field)
- [x] Split payment — each payment call adds a split record; multiple payments shown in history
- [x] Partial payment — balance_due updates correctly; status shows "partial" until fully paid
- [x] EndOfDayPage — date picker, system totals, per-method breakdown, cash count input, live discrepancy indicator (green/amber/red), notes field, lock button, closed-day read-only view
- [x] "Bill" button on completed appointments queue row (receptionist + admin) — creates or opens existing invoice
- [x] Patient profile Billing tab — invoice history table with summary totals, view invoice in modal
- [x] `api/invoices.js` — invoicesApi, customServicesApi, doctorFeesApi, endOfDayApi
- [x] `appointment.routes.js` updated — `consultation_id` now included in list query
- [x] Invoice PDF — "Download PDF" button in InvoiceModal, opens branded A4 PDF
- [x] Doctor fees management screen in Settings — built in Phase 2.7
- [x] Custom services management screen in Settings — built in Phase 2.7

**Status:** ✅ Complete
**Started on:** 2026-04-09
**Completed on:** 2026-04-09
**Notes:** Invoice auto-creates from appointment queue (Bill button) or can be viewed from Billing page. Payment supports multiple methods in sequence (split). EOD locks the day — cannot be re-submitted. Invoice PDF deferred until clinic branding (logo, header/footer) is set up in Phase 3.

---

### 2.6 Reports & History 📊
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `GET /api/v1/reports/daily` — daily revenue, patient count, payment method breakdown
- [x] `GET /api/v1/reports/monthly` — monthly summary with trends
- [x] `GET /api/v1/reports/doctors` — income and visits per doctor for date range
- [x] `GET /api/v1/reports/medicines` — stock levels, dispensed, near-expiry
- [x] `GET /api/v1/reports/patients` — demographics, new vs returning, visit frequency
- [x] `GET /api/v1/reports/appointments` — count, cancellation rate, peak hours
- [x] `GET /api/v1/reports/end-of-day/history` — all past EOD closing records
- [ ] PDF export for all reports (deferred to Phase 5)
- [ ] Excel export for all reports (deferred to Phase 5)

#### Frontend
- [x] Admin analytics dashboard home screen — revenue, patients, doctor stats
- [x] Daily summary — date picker; appointments breakdown, revenue, payment method totals, top diagnoses; CSV export
- [x] Monthly revenue chart (bar chart — recharts, billed vs collected per day)
- [x] Doctor performance table (patients seen, revenue billed/collected per doctor)
- [x] Medicine stock report with near-expiry highlighted in amber/red; sub-tabs: Low Stock, Near Expiry, Top Prescribed
- [x] End of day history — list of all past closings with discrepancy highlighted (green/amber/red); CSV export
- [x] Patient demographics report — new vs returning, gender split, age groups, top diagnoses
- [x] Appointment analysis — status + type breakdown, busiest day-of-week bar chart
- [x] Date range filter on all reports
- [ ] Export to PDF button (deferred to Phase 5)
- [x] Export to CSV button on all report tabs
- [ ] Scheduled monthly email report toggle (deferred to Phase 5)

**Status:** ✅ Complete
**Started on:** 2026-04-10
**Completed on:** 2026-04-10
**Notes:** PDF and Excel export deferred to Phase 3. CSV export available on all tabs. Scheduled monthly email deferred to Phase 5. Recharts used for bar charts (already installed). All 7 routes + 7 frontend tabs built.

---

## Phase 2.7 — Clinic Self-Customization ⚙️
**Project:** `clinic-frontend` + `backend-api`

#### Backend
- [x] `GET /api/v1/settings` — get clinic settings
- [x] `PUT /api/v1/settings` — update clinic settings (also syncs `public.tenants.clinic_name`)
- [x] `POST /api/v1/settings/logo` — upload clinic logo (multipart form)
- [x] `DELETE /api/v1/settings/logo` — remove clinic logo
- [x] `POST /api/v1/settings/staff/:id/signature` — upload doctor signature image
- [x] `DELETE /api/v1/settings/staff/:id/signature` — remove doctor signature
- [x] `GET /api/v1/doctor-fees` — get all doctor fees (built in Phase 2.5)
- [x] `PUT /api/v1/doctor-fees/:doctor_id` — update a doctor's consultation fee (built in Phase 2.5)
- [x] File validation — type (JPG/PNG only), max size 2MB, save to `/uploads/tenants/{schema}/`
- [x] Logo URL stored in `clinic_settings.clinic_logo_url`
- [x] Signature URL stored in `staff.signature_url`

#### Frontend — Clinic Settings Screen (admin/owner only)
- [x] **Clinic tab** — clinic name, address, phone, email; logo upload with live preview and remove button
- [x] **Documents tab** — receipt header, receipt footer, prescription footer
- [x] **Billing tab** — currency code, tax rate (%), tax label
- [x] **Appointments tab** — slot duration, max patients per day, walk-in toggle
- [x] **Notifications tab** — reminder toggle, hours before, custom message template
- [x] **Security tab** — session timeout duration
- [x] **Doctor Fees tab** — inline edit fee label + amount per doctor
- [x] **Custom Services tab** — add/edit/remove services (name, category, price)
- [x] Logo upload button with image preview and remove option
- [x] Doctor signature upload per doctor in Doctor Fees tab
- [x] Clinic holidays management — already in AppointmentsPage (HolidaysModal)

**Status:** ✅ Complete
**Started on:** 2026-04-14
**Completed on:** 2026-04-14
**Notes:** Settings page has 8 tabs. Logo upload uses multer (JPG/PNG, max 2MB), stored at `/uploads/tenants/{schema}/logo.ext`. Doctor signature stored at `/uploads/tenants/{schema}/signatures/{staffId}.ext`. Doctor fees and custom services use the existing Phase 2.5 APIs. Clinic holidays management already exists in AppointmentsPage (HolidaysModal). Session timeout UI built but backend enforcement deferred to Phase 5. Walk-in toggle enforcement added as bug fix after Phase 4.

---

## Phase 4 — Super Admin Panel

### 4.1 Admin Dashboard
- [x] Overview — total clinics, MRR, active/trial/suspended counts
- [x] Clinic list (last 8 recent clinics with quick link to full list)
- [ ] Alert panel — clinics with overdue payments, trials expiring soon (deferred to Phase 5)

**Status:** ✅ Complete (core dashboard)

### 4.2 Clinic Management
- [x] Create new clinic (triggers schema creation + default settings + feature flag setup)
- [x] Edit clinic details (name, owner email/phone, plan)
- [x] Suspend / activate clinic account
- [x] Login as clinic — impersonation opens clinic-frontend with super admin JWT; "Impersonating" badge shown in TopBar
- [x] View clinic usage stats — staff count, patient count (queried from tenant schema)
- [ ] Trial management UI — extend trial, convert to paid, expire early (deferred)

**Status:** ✅ Complete (core management)

### 4.3 Plans & Feature Flags
- [x] Assign / change plan per clinic (basic / standard / premium) — in edit modal
- [x] Toggle individual feature flags per clinic (live toggle switches)
  - [x] pharmacy on/off
  - [x] lab on/off
  - [x] insurance on/off
  - [x] online_booking on/off
  - [x] multi_branch on/off
  - [x] custom_domain on/off
- [ ] View payment status and subscription history (deferred — table exists, UI not built)
- [ ] Send announcement to all clinics or selected clinics (deferred to Phase 5)

**Status:** ✅ Complete (flags + plan assignment)

### 4.4 System Health
- [ ] Server CPU, memory, disk usage display (deferred to Phase 5)
- [ ] Database connection status (deferred)
- [ ] Uptime display (deferred)
- [ ] Audit log viewer (deferred)

**Status:** Deferred to Phase 5

---

## Known Issues & Bugs

> Add bugs here as you find them. Never leave a bug undocumented.

| # | Date found | Description | Severity | Status |
|---|-----------|-------------|----------|--------|
| 1 | 2026-04-10 | Invoice creation: `prescription_items` column queried as `quantity` but actual column name is `quantity_given` → 500 on Bill button | High | ✅ Fixed — changed to `COALESCE(pi.quantity_given, 1) AS qty` in `invoice.routes.js` |
| 2 | 2026-04-10 | Payment UPDATE: `$3` used twice in same query (both `payment_status=$3` and `CASE WHEN $3='paid'`) → PostgreSQL "inconsistent types" 500 error; payment_splits record inserted but invoice not updated | High | ✅ Fixed — pass `status` as `$6` separately: `CASE WHEN $6='paid'` with extra param |
| 3 | 2026-04-14 | Clinic logo not showing after re-login — `clinic_logo_url` stored as relative path `/uploads/...`, rendered in Sidebar as `<img src="/uploads/...">` which resolved against frontend port 5173 → 404 | High | ✅ Fixed — added `mediaUrl()` utility in `src/utils/mediaUrl.js`, used in Sidebar and SettingsPage |
| 4 | 2026-04-14 | Inconsistent API response format across backend routes — Phase 2.5 routes (invoice, customservice, doctorfee, endofday, settings) used `{ data }` / `{ message }` while Phase 2.1–2.4 used `{ status, data }` | Medium | ✅ Fixed — standardized all 5 route files to `{ status: 'success'/'error', message?, data? }`; EOD `already_closed` field replaced with `status: 'already_closed'`; updated EndOfDayPage.jsx accordingly |
| 5 | 2026-04-14 | Super admin panel showed old clinic name — `PUT /api/v1/settings` only updated `clinic_settings.clinic_name` in tenant schema, never synced `public.tenants.clinic_name` used by super admin panel | Medium | ✅ Fixed — settings.routes.js now also runs `UPDATE public.tenants SET clinic_name = $1 WHERE id = $2` when clinic_name changes; ran one-time sync script to fix existing demo clinic |
| 6 | 2026-04-14 | Allow Walk-ins toggle in Settings had no effect — `allow_walk_ins=false` never blocked walk-in appointments; AppointmentModal always showed Walk-in tab regardless of setting | Medium | ✅ Fixed — backend checks `allow_walk_ins` before creating walk-in (returns 403 if disabled); frontend loads setting on AppointmentsPage mount and hides Walk-in tab from mode selector when false |
| 7 | 2026-04-14 | `GET /api/v1/doctor-fees` did not return `signature_url` — Doctor Fees tab showed signature upload UI but thumbnails never appeared on page load because `signature_url` was missing from the SELECT query | Medium | ✅ Fixed — added `s.signature_url` (and `s.specialization`) to SELECT in `doctorfee.routes.js` |
| 8 | 2026-04-14 | `patient_portal_enabled` has no UI — column exists in `clinic_settings`, backend GET returns it and PUT accepts it, but there is no toggle in the Settings page for clinic admins to control it | Low | Deferred to Phase 5 — toggle will be added to Security tab when patient portal module is built |
| 9 | 2026-04-14 | `duplicate_check_enabled` is dead code — column exists in `clinic_settings` DB schema with intent to warn on duplicate patient name/DOB at registration, but backend PUT never writes it and GET never uses it; no frontend UI | Low | Deferred to Phase 5 — needs backend logic in patient registration route + Settings toggle |
| 10 | 2026-04-14 | Impersonation ("Login as Clinic") did not pass clinic logo to new tab — backend impersonate endpoint never queried `clinic_settings`, so `logo_url` was always null; also `ImpersonatePage` called `navigate('/dashboard')` immediately after `login()` causing ProtectedRoute race condition where `user` state wasn't committed yet | High | ✅ Fixed — backend now queries `clinic_settings` for `clinic_logo_url`+`currency`; admin-frontend passes `logo_url` in URL params; `ImpersonatePage` split into two effects: first calls `login()`, second navigates only after `user` state is set |
| 11 | 2026-04-14 | Clinic logo not updated in real time after replace — backend always saves logo as `logo.png` (same filename/URL); browser served cached old image even after upload; Sidebar showed stale logo for rest of session | Medium | ✅ Fixed — appended `?v=${Date.now()}` cache-buster to URL after upload in both `setLogoPreview` and `updateClinic`; button now reads "Replace Logo" when logo exists |
| 12 | 2026-04-15 | `Calendar` icon used but not imported in `ReportsPage.jsx`, `AppointmentsPage.jsx`, `BillingPage.jsx` — ReferenceError crashing all three pages on load | High | ✅ Fixed — added `Calendar` to lucide-react import in all three files |
| 13 | 2026-04-15 | `react-day-picker/dist/style.css` not imported — DayPicker calendar popup rendered with no layout or visual styling | Medium | ✅ Fixed — added CSS import to `index.css` |
| 14 | 2026-04-15 | `w-4.5 h-4.5` used in `TopBar.jsx` for sun/moon icons — not a valid Tailwind class, icons rendered at zero/default size | Low | ✅ Fixed — changed to `w-[18px] h-[18px]` |
| 15 | 2026-04-15 | All raw `<input>` and `<textarea>` elements outside the shared Input component had no background class — browser defaulted to white, broke dark mode across AppointmentModal, ConsultationModal, InvoiceModal, EndOfDayPage, PatientList, SettingsPage, and more | Medium | ✅ Fixed — added global CSS rule `input, textarea, select { background-color: var(--color-surface); color: var(--color-text); }` in `index.css` |
| 16 | 2026-04-15 | Pharmacy page showed "Something went wrong" on every tab load — `pharmacy.routes.js` used `staff.first_name \|\| ' ' \|\| staff.last_name` but the `staff` table only has `full_name` column → 500 on all dispense, purchase orders, and stock adjustment queries | High | ✅ Fixed — changed all 4 occurrences to `staff.full_name` in `pharmacy.routes.js` |
| 17 | 2026-04-15 | Pharmacy CreatePOModal crashed on open — `supplierOptions` included `{ value: '' }` ("No supplier") which Radix Select forbids as a Select.Item value → React error boundary crash | High | ✅ Fixed — changed sentinel to `'none'`, `supplierId` default to `'none'`, save converts `'none'` back to `null` |

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
| Dark mode | 2026-04-15 | ThemeContext, CSS variable overrides, TopBar toggle, localStorage, system preference on first load |
| DatePicker component | 2026-04-15 | react-day-picker v8 + Radix Popover, replaces all date inputs on 12 pages, supports min/max/disabled days |
| Inter font | 2026-04-15 | @fontsource/inter (400/500/600/700), applied globally via index.css + Tailwind fontFamily.sans |
| Dark mode audit — bg-white cleanup | 2026-04-15 | 15 files patched + global CSS rule for all raw inputs/textareas |
| Phase 5.1 — Pharmacy module | 2026-04-15 | DB: suppliers, purchase_orders, purchase_order_items, stock_adjustments tables + prescriptions dispensing columns. Backend: pharmacy.routes.js (suppliers CRUD, purchase orders + receive, dispense queue + dispense, stock adjustments). Frontend: PharmacyPage.jsx 4-tab UI, pharmacy.js API client, App.jsx route. Access: receptionist + admin. |
| Phase 5.2 — Lab module | 2026-04-15 | DB: lab_tests, lab_requests, lab_results tables + 12 seeded common tests. Backend: lab.routes.js (test catalog CRUD, request creation, result entry with file upload, patient history). Frontend: LabPage.jsx (Queue tab + Catalog tab), lab.js API client, App.jsx route, PatientProfile Lab tab. Access: doctor/nurse/admin/receptionist. |
| Phase 5.3 — Insurance module | 2026-04-15 | DB: insurance_providers, corporate_accounts, insurance_claims tables + patients.corporate_account_id column + 4 seeded providers. Backend: insurance.routes.js (invoice lookup, providers CRUD, claims CRUD + status update, corporate accounts CRUD + monthly billing summary). Frontend: InsurancePage.jsx (3-tab UI: Claims, Providers, Corporate Accounts), insurance.js API client, App.jsx route, Sidebar entry. Access: admin/receptionist full, doctor view-only. |

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
| 2026-04-09 | Phase 2.5 Billing — invoice + custom-services + doctor-fees + end-of-day backend, BillingPage, InvoiceModal, EndOfDayPage, Bill button on queue, PatientProfile billing tab | Complete | Start Phase 2.6 Reports |
| 2026-04-10 | Phase 2.5 bug fixes — fixed Bill button 500 (prescription_items column name), fixed Confirm Payment 500 (PostgreSQL $3 type conflict in UPDATE), improved error responses with `detail` field | Bugs fixed — 2.5 fully working | Start Phase 2.6 Reports |
| 2026-04-10 | Phase 2.6 Reports — 7 backend routes (daily/monthly/doctors/medicines/patients/appointments/EOD history), ReportsPage with 7 tabs, recharts bar charts, CSV export | Complete | Start Phase 2.7 Clinic Settings |
| 2026-04-14 | Bug fixes — BillingPage patient name link navigated to `/patients/undefined` (missing `i.patient_id` in SELECT), ReportsPage PageHeader wrong import path fixed | Complete | Start Phase 2.7 Clinic Settings |
| 2026-04-14 | Phase 2.7 Settings — settings.routes.js (GET/PUT/logo upload+delete/signature upload+delete), SettingsPage with 8 tabs (Clinic, Documents, Billing, Appointments, Notifications, Security, Doctor Fees, Custom Services) | Complete | Start Phase 3 Super Admin |
| 2026-04-14 | Bug fix — sidebar logo/name not updating after upload; added `updateClinic()` to AuthContext, called on logo upload/delete and clinic name save | Complete | Start Phase 3 Super Admin |
| 2026-04-14 | Phase 3 PDF generation — `pdfkit` installed; `pdfGenerator.js` with `generateInvoicePDF` + `generatePrescriptionPDF`; `GET /invoices/:id/pdf` + `GET /prescriptions/:id/pdf` routes; Download PDF button in InvoiceModal; PDF button per row in PrescriptionsPage; A4 branded PDF with logo, clinic info, tables, doctor signature | Complete | Start Phase 4 Super Admin |
| 2026-04-14 | Fix prescription Print — rewrote `printPrescription.js` to use full clinic_settings (name/address/phone/email/logo/footer); PrescriptionsPage now loads settings via `settingsApi.get()` and passes to print function; logo and signature rendered as full-URL `<img>` tags | Complete | — |
| 2026-04-14 | Phase 2.0 Dashboards wired — AdminDashboard (reports API: daily stats + monthly bar chart + doctor table), DoctorDashboard (appointments by doctor_id: queue list + stats), ReceptionistDashboard (appointments + EOD summary: live queue table + billing stats), NurseDashboard (appointments: all patients today with status); no new backend routes needed | Complete | Start Phase 4 Super Admin |
| 2026-04-14 | Bug fix — logo not showing after re-login; added `mediaUrl()` utility to prefix relative backend paths; applied in Sidebar + SettingsPage; removed hardcoded `http://localhost:4000` references | Complete | — |
| 2026-04-14 | Standards fix — standardized backend API response format across invoice, customservice, doctorfee, endofday, settings routes to `{ status, message?, data? }`; changed EOD `already_closed` field to `status: 'already_closed'`; updated EndOfDayPage.jsx to match | Complete | Start Phase 4 Super Admin |
| 2026-04-14 | Phase 4 Super Admin Panel — backend `admin.routes.js` (login, dashboard, list/create/update/suspend/activate tenants, impersonation, feature flags); `adminAuth.js` middleware; admin-frontend full build with Tailwind (LoginPage, DashboardPage, ClinicsPage, ClinicDetailPage, AdminLayout, UI components); clinic-frontend ImpersonatePage + "Impersonating" badge in TopBar | Complete | Start Phase 5 |
| 2026-04-14 | Bug fix — super admin clinic name stale; `PUT /api/v1/settings` now syncs `public.tenants.clinic_name`; one-time DB sync ran to fix demo clinic | Complete | — |
| 2026-04-14 | Bug fix — Allow Walk-ins toggle had no effect; backend now enforces `allow_walk_ins` on appointment creation; AppointmentModal hides Walk-in tab when disabled; `allow_walk_ins` prop passed from AppointmentsPage | Complete | Start Phase 5 |
| 2026-04-14 | Settings audit + fixes — built signature upload/delete UI in Doctor Fees tab (SettingsPage.jsx); fixed `GET /api/v1/doctor-fees` missing `signature_url` in SELECT; documented `patient_portal_enabled` (no UI) and `duplicate_check_enabled` (dead column) as deferred to Phase 5; updated Plan.md, Ongoingworking.md, workflow.md | Complete | Start Phase 5 |
| 2026-04-14 | Bug fixes — impersonation logo: backend now returns `clinic_logo_url`+`currency` from `clinic_settings`; admin-frontend passes `logo_url` in URL params; ImpersonatePage fixed race condition (two-effect pattern waits for `user` state before navigating); logo real-time replace: `?v=timestamp` cache-buster added after upload; "Replace Logo" button label when logo exists | Complete | Start Phase 5 |
| 2026-04-15 | UI Polish — dark mode (ThemeContext, CSS variables, TopBar toggle, localStorage persist), DatePicker component (react-day-picker + Radix Popover, replaces all date inputs across 12 pages), improved Select (Radix, animated, disabled support), Input forwardRef fix, Inter font (@fontsource/inter 400/500/600/700) | Complete | — |
| 2026-04-15 | Bug fixes — missing Calendar icon import in ReportsPage + AppointmentsPage + BillingPage (ReferenceError crash), missing react-day-picker CSS import (unstyled calendar), invalid w-4.5 Tailwind class in TopBar | Complete | — |
| 2026-04-15 | Dark mode audit — replaced all bg-white with bg-[var(--color-surface)] across 15 files (Button, LoginPage, dashboards, ConsultationsPage, PrescriptionsPage, MedicineStorePage, BillingPage, InvoiceModal, AppointmentModal, PrescriptionModal, ReportsPage, ImpersonatePage); added global CSS rule for raw inputs/textareas | Complete | Start Phase 5.1 Pharmacy |
| 2026-04-15 | Phase 5.1 Pharmacy — DB migration (suppliers, purchase_orders, purchase_order_items, stock_adjustments tables + prescriptions dispensing columns); backend pharmacy.routes.js (all 4 areas, requireFeature gate); frontend PharmacyPage.jsx (4-tab UI: Dispense Queue, Purchase Orders, Suppliers, Stock Adjustments); pharmacy.js API client; route registered in App.jsx | Complete | Start Phase 5.2 Lab |
| 2026-04-15 | Bug fix — Pharmacy page "Something went wrong" on all tabs; `pharmacy.routes.js` used `staff.first_name \|\| last_name` but staff table only has `full_name`; fixed 4 occurrences (purchase orders list, purchase order detail, dispense queue, stock adjustments) | Complete | — |
| 2026-04-15 | Bug fix — Pharmacy CreatePOModal crashed on open; `supplierOptions` had `{ value: '' }` which Radix Select forbids; changed sentinel to `'none'`, updated default state and save handler | Complete | — |
| 2026-04-15 | Phase 5.2 Lab — DB migration (lab_tests, lab_requests, lab_results + 12 seeded tests); backend lab.routes.js (catalog CRUD, requests, result entry with multer file upload, patient history); frontend LabPage.jsx (Queue + Catalog tabs), lab.js API client, App.jsx route, PatientProfile Lab tab added | Complete | Start Phase 5.3 Insurance |
| 2026-04-15 | Phase 5.3 Insurance — DB migration (insurance_providers, corporate_accounts, insurance_claims tables + patients.corporate_account_id column, 4 seeded providers); backend insurance.routes.js (invoice lookup, providers CRUD, claims CRUD + status update, corporate accounts CRUD + monthly summary); frontend InsurancePage.jsx (3 tabs: Claims, Providers, Corporate Accounts), insurance.js API client, App.jsx route, Sidebar entry | Complete | Start Phase 6 Beta & Launch |
| 2026-04-15 | Docs update — thoroughly updated all 8 docs in Docs/ folder through Phase 5.3: INSTRUCTION.md (Rule 5 expanded to 8 files, Docs Folder Structure updated, session-end checklist expanded), DESIGN.md (added missing npm packages: react-day-picker/@radix-ui/react-popover/@fontsource/inter, added Dark Mode section), Doctor pos core features.md (added Phase 5.1 Pharmacy + Phase 5.2 Lab + Phase 5.3 Insurance sections, Role Summary table updated), Plan.md/workflow.md/databasequeries.md/RUNNING.md/Ongoingworking.md all kept current | Complete | — |

---

*ongoingworking.md — Doctor POS*  
*Update this file at the start and end of every coding session*