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

**Currently working on:** All core features complete — Phase 6 Beta & Launch next
**Last updated:** 2026-04-17
**Next up:** Phase 6 — deployment, production setup

### What is fully complete right now

| Phase | What's done |
|-------|-------------|
| Phase 1 — Foundation | ✅ DB, auth, multi-tenant, feature flags |
| Phase 2 — Core modules | ✅ Patients, Appointments, Consultations, Prescriptions, Billing, Reports, Settings (2.0–2.7) |
| Phase 3 — Branding + PDF | ✅ Clinic logo, doctor signatures, invoice PDF, prescription PDF |
| Phase 4 — Super admin | ✅ Admin panel, clinic creation with credentials, impersonation, feature flag toggles, suspend/activate |
| UI Polish pass | ✅ Dark mode, DatePicker, improved Select dropdowns, Inter font (2026-04-15) |
| Phase 5.1 — Pharmacy | ✅ Suppliers, Purchase Orders, Dispense Queue, Stock Adjustments (2026-04-15) |
| Phase 5.2 — Lab      | ✅ Test Catalog, Lab Queue, Enter Result (value + file upload), Patient Lab History tab (2026-04-15) |
| Phase 5.3 — Insurance | ✅ Claims (CLM-XXXXX), Insurance Providers, Corporate Accounts + Monthly Billing Summary (2026-04-15) |
| Phase 5.4 — Patient Portal | ✅ Online booking (BK-XXXXXX), Settings toggle, Doctor dashboard enhanced, Online badge in queue (2026-04-15) |
| SaaS Onboarding | ✅ Clinic creation flow (credentials copy screen), staff management UI, removed trial/plan system (2026-04-15) |
| Token Slip Printing | ✅ 80mm thermal printer slip after Add to Queue — token number or booking ref (2026-04-16) |
| Phone Number Formatting | ✅ 10-digit validation + `xxx xxx xxxx` format across all inputs + backend normalization (2026-04-16) |
| Phone Search Fix + Auto-suggest | ✅ Formatted phone now matches stored digits; live search after 5 digits (2026-04-16) |
| Patient Registration Simplification | ✅ Only first_name + phone required everywhere; all other fields optional; New Patient tab removed from Add to Queue drawer; auto-create on submit (2026-04-16) |
| Queue & Sync Bug Fixes | ✅ Queue redesign, portal-backend token/slot sync, doctor ownership enforcement, doctor tab fix, nullable consultation_id on prescriptions (2026-04-16) |
| Billing & Invoice Fixes | ✅ Invoice auto-pull includes all medicines (incl. price=0); Add Item redesigned as dedicated 3-tab modal; prescription qty auto-calculated (2026-04-17) |
| Double-booking & Slot Fixes | ✅ All appointment types blocked from double-booking same slot; taken slots visually disabled in booking grid (2026-04-17) |
| Booking Portal UI Redesign | ✅ Full-width, dark/light mode, CSS variables, mobile-friendly, clinic logo + name from backend (2026-04-17) |
| Consult + Rx Combined Modal | ✅ Doctor writes consultation AND prescription in one step; food chips; custom medicine names; stock deduction clarified (2026-04-17) |
| Token for All Booking Types | ✅ Every booking (walk-in, booked, emergency) gets a sequential token number (2026-04-17) |
| Queue Badge Fixes | ✅ Online badge uses CSS variables; Rx button hidden if prescription already exists (2026-04-17) |

### What is NOT yet started
- Phase 6 — Beta & launch (deployment, onboarding)
- Phase 7 — Electron desktop version

### Small items deferred (documented but not started)

| Item | Deferred to |
|------|-------------|
| `duplicate_check_enabled` backend logic | Phase 6 |
| Session timeout backend enforcement | Phase 6 |
| PDF export for all reports | Phase 6 |
| Appointment reminder SMS/WhatsApp job | Phase 6 |
| System health display in admin panel | Phase 6 |
| Audit log viewer | Phase 6 |

---

## SaaS Onboarding Flow + Admin Improvements (2026-04-15)

> Comprehensive session covering clinic creation flow, removing trial/plan system, and adding staff management.

### Changes Made

| Change | Files affected | Notes |
|--------|---------------|-------|
| Clinic creation creates first admin staff | `admin.routes.js` | POST /tenants now accepts `initial_password`, bcrypt-hashes it, inserts into `staff` table in the new tenant schema. |
| Credentials copy screen | `ClinicsPage.jsx` (admin-frontend) | After creating a clinic, a modal shows Login URL, Email, Password each with a copy-to-clipboard button. Warning shown that password is not retrievable. |
| Removed trial system | `admin.routes.js`, `ClinicsPage.jsx`, `ClinicDetailPage.jsx`, `DashboardPage.jsx` | All `trial_days`, `trial_ends_at`, `status='trial'` references removed. New clinics always start with `status = 'active'`. Trial stat card removed from dashboard. Trial status tab removed from clinic list. |
| Removed plans system | `admin.routes.js`, `ClinicsPage.jsx`, `ClinicDetailPage.jsx`, `DashboardPage.jsx` | All `plan` field references removed from create/edit/list/detail. No basic/standard/premium tiers — super admin controls access manually via feature flags. |
| Fixed appointments table | `createTenantSchema.js` | Added `booking_reference VARCHAR(20)` and `booking_source VARCHAR(20) DEFAULT 'admin'` columns — new clinics now get these columns correctly (previously only added via `migrate_portal.js` for existing clinics). |
| Staff management backend | `staff.routes.js` (new), `index.js` | New route `/api/v1/staff` — GET list, POST create, PUT update, PUT reset-password, DELETE soft-deactivate. All protected by `requireRole('admin')`. Duplicate email check, bcrypt hashing, prevents self-deactivation. |
| Staff management frontend | `StaffPage.jsx` (new), `App.jsx`, `Sidebar.jsx` | New `/staff` page (admin only). Shows staff grouped by role. Add/edit/reset-password/activate-deactivate actions. `PageLayout` wrapper (sidebar + topbar). |

### Key decisions

- **No plans, no trials** — super admin manually activates/deactivates each clinic after payment. Feature flags are the only access control mechanism.
- **Staff roles:** `admin | doctor | nurse | receptionist` — permissions enforced by `requireRole()` in all backend routes and `ProtectedRoute allowedRoles` in frontend.
- **Multiple doctors per clinic** supported — any number of doctor-role staff can be created.
- **Data isolation** — all staff created via `/api/v1/staff` go into `tenant_{subdomain}.staff` — never touches another clinic.

### Local dev testing for new clinics

1. Create clinic from admin panel → copy credentials
2. Edit `clinic-frontend/.env`: `VITE_TENANT_SUBDOMAIN=yournewsubdomain`
3. Restart clinic-frontend
4. Login at `http://localhost:5173` with the credentials you copied

---

## Patient Registration Simplification (2026-04-16)

> Only first name and mobile number are required. All other patient fields are optional. New Patient tab removed from Add to Queue drawer — a patient is auto-created the moment staff submit any of the three queue actions (walk-in, booked appointment, emergency).

### Problem
Registering a patient required last name, date of birth, and gender — slow for front desk, blocked quick-add to queue. "New Patient" tab in the Add to Queue drawer was verbose and duplicated the full registration form.

### Changes Made

| Change | Files affected | Notes |
|--------|---------------|-------|
| `patients` table — nullable fields | `createTenantSchema.js` | Dropped `NOT NULL` from `last_name`, `date_of_birth`, `gender` for all new tenant schemas. |
| Migration for existing schemas | `src/db/migrate_optional_patient_fields.js` (NEW) | One-time script that ALTERs all existing `tenant_*` schemas to drop NOT NULL from those three columns. Run once: `node src/db/migrate_optional_patient_fields.js` |
| Backend POST patients | `patient.routes.js` | Only `first_name` + `phone` required. `last_name`, `date_of_birth`, `gender` accepted but all `\|\| null`. |
| Backend PUT patients | `patient.routes.js` | Same — only `first_name` + `phone` enforced. |
| Portal public booking | `portal.routes.js` | Auto-create no longer inserts `gender='unknown'` placeholder; `last_name` uses `\|\| null`. Phone lookup normalizes digits before query. |
| RegisterPatientModal | `RegisterPatientModal.jsx` | Removed `required` rule and error display from Last Name, Date of Birth, Gender fields. Only First Name + Phone still required. |
| EditPatientModal | `EditPatientModal.jsx` | Same — Last Name, Date of Birth, Gender all optional. |
| AppointmentModal — removed New Patient tab | `AppointmentModal.jsx` | Entire tab system removed. Single flow: phone input → live search → select existing OR type first name to auto-create. `newPhone`, `newGender`, `newDob`, `newDuplicates`, `newConfirmed`, `patientTab` states all removed. |
| AppointmentModal — auto-create on submit | `AppointmentModal.jsx` | If no existing patient selected: validates phone + first name → calls `patientsApi.create()` inline, then books appointment. No separate form — first/last name fields appear only when search returns no results. |

### New patient auto-create pattern (AppointmentModal)
```js
if (!resolvedPatient) {
  const res = await patientsApi.create({
    first_name: newFirst.trim(),
    last_name:  newLast.trim() || undefined,
    phone:      phoneInput.replace(/\D/g, ''),
  });
  resolvedPatient = res.data.data;
}
// Then proceed to create appointment with resolvedPatient.id
```

### Migration command (run once on dev DB)
```bash
node src/db/migrate_optional_patient_fields.js
```

---

## Phone Number Formatting + Search Fix + Auto-suggest (2026-04-16)

> Session covering consistent phone formatting across all inputs, backend normalization, search match fix, and live auto-suggest.

### Problem
Phones were stored as `0762946381` (digits only) by the backend, but the formatted input `076 294 6381` was being sent to search queries — ILIKE never matched. Duplicate check had the same mismatch. No live search — user had to click Search button manually.

### Changes Made

| Change | Files affected | Notes |
|--------|---------------|-------|
| Phone normalization on input | `format.js` (new functions) | `formatPhoneInput(v)` — strips non-digits, inserts spaces at pos 3 and 6, max 10 digits. `validatePhone(v)` — returns error string or undefined. `formatPhone(v)` — display formatter (stored digits → `xxx xxx xxxx`). |
| Patient registration — phone fields | `RegisterPatientModal.jsx` | Phone + emergency phone fields: format on type, validate 10 digits on submit. Placeholder: `077 123 4567`. |
| Patient edit — phone fields | `EditPatientModal.jsx` | Same pattern as registration. |
| Appointment modal — search field | `AppointmentModal.jsx` | Phone search input formats on type. Auto-suggest fires 350ms after user stops typing (once ≥5 digits entered). Results appear live — Search button is optional fallback. |
| Appointment modal — new patient phone | `AppointmentModal.jsx` | Inline new patient form phone field formats on type. Validates 10 digits before submit. |
| Staff phone field | `StaffPage.jsx` | Staff modal phone input formats on type. |
| Booking page (patient portal) | `BookingPage.jsx` | Patient phone formats on type. 10-digit validation before submit. |
| Backend — normalize before storing | `patient.routes.js` | `normalizePhone()` strips spaces/dashes. `validatePhoneDigits()` rejects non-10-digit numbers. Applied to both phone and emergency_phone in POST + PUT. |
| Backend — normalize before searching | `patient.routes.js` | `/returning` route: strips non-digits from query param before ILIKE. `/check-duplicate` route: strips non-digits from phone param before exact equality check. |
| Frontend — strip before API calls | `AppointmentModal.jsx`, `RegisterPatientModal.jsx` | `checkDuplicate` and `searchReturning` calls strip non-digits before sending — double normalization safety. |
| Admin-frontend placeholder | `ClinicsPage.jsx` | Owner phone placeholder updated to `077 123 4567`. |

### How phone is stored
All phones are stored as 10 raw digits (e.g. `0762946381`). The `formatPhone()` display helper formats them for reading. This is consistent everywhere — registration, edit, portal booking, staff creation.

### Auto-suggest pattern (AppointmentModal)
```jsx
// Fires 350ms after user stops typing, once ≥5 digits are present
useEffect(() => {
  const digits = phoneInput.replace(/\D/g, '');
  if (digits.length < 5) { setSearchResults([]); return; }
  clearTimeout(searchTimerRef.current);
  searchTimerRef.current = setTimeout(async () => {
    const res = await patientsApi.searchReturning(digits);
    setSearchResults(res.data.data);
  }, 350);
}, [phoneInput, patientTab, patient]);
```

---

## Billing & Invoice Fixes + Booking Portal UI Redesign (2026-04-17)

> Session covering invoice auto-pull bug, Add Item UI redesign, prescription quantity auto-calculation, double-booking fix, slot grid visual disable, and full booking portal UI rewrite.

---

### 1 — Invoice Auto-pull Bug: Missing Medicines

**Problem:** When billing auto-pulled medicines from a prescription, medicines with no selling price (`selling_price IS NULL` or `= 0`) were silently excluded. If a prescription had 3 medicines but only 1 had a price, only 1 appeared on the invoice.

**Root cause:** The invoice creation query had `AND m.selling_price IS NOT NULL AND m.selling_price > 0` — this filtered out unprice medicines entirely instead of including them at price 0.

**Fix:**

| File | Change |
|------|--------|
| `invoice.routes.js` | Removed price filter from auto-pull query. Added `COALESCE(m.selling_price, 0) AS selling_price`. Changed `unit_price = parseFloat(row.selling_price)` → `|| 0` fallback so unprice items appear at 0 and can be manually corrected. |

---

### 2 — Add Item UI Redesign: Dedicated 3-Tab Modal

**Problem:** The Add Item form was a small inline expanding row inside the invoice modal — cramped, hard to use, no medicine search.

**Solution:** Replaced with a dedicated `AddItemModal` (separate Radix Dialog) that opens on top of the InvoiceModal via portal rendering. Three tabs:

| Tab | Icon | What it does |
|-----|------|-------------|
| **Service** | Wrench | Clickable cards for configured custom services. Select one → qty + price auto-fill. Can also type manually. |
| **Medicine** | Package | Full-width search bar with live medicine results (stock + price shown). Click to select → description + price auto-fill. |
| **Custom** | FileText | Free-text description + qty + price. Live preview of line total. |

Footer shows the calculated line total and "Add to Invoice" button. Two modals stack correctly because Radix Dialog renders via React Portal into document body — no z-index conflicts.

| File | Change |
|------|--------|
| `InvoiceModal.jsx` | Complete rewrite — added `AddItemModal` sub-component with 3 tabs; `showAddItem` state; `handleAddItem()` merges new line into items array; `+ Add Item` button is now a proper `Button` component |

---

### 3 — Prescription Quantity Auto-calculation

**Problem:** The prescription form had dosage/frequency/duration dropdowns but `quantity_given` was always saved as `1` — the invoice pulled qty=1 for every medicine regardless of how many days were prescribed.

**Fix:** Added `calcQuantity(dosage, frequency, duration)` function in PrescriptionModal. When any of the three fields change, quantity is auto-calculated and shown in a read-only "Qty to Dispense (auto)" field. Staff can override by typing a custom value.

**Formula:** `Math.ceil(units_per_dose × doses_per_day × duration_days)`

Examples:
- 1 tablet × Twice daily × 7 days = **14**
- 5 ml × Three times daily × 5 days = **75**
- ½ tablet × Once daily × 14 days = **7**

| File | Change |
|------|--------|
| `PrescriptionModal.jsx` | Added `DOSAGE_UNITS`, `FREQUENCY_PER_DAY`, `DURATION_DAYS` lookup constants; `calcQuantity()` function; `quantity_given` field in `emptyItem()`; `updateItem` triggers auto-calc when dosage/frequency/duration change; `quantity_given` sent in save payload |

---

### 4 — Double-booking Fix: All Appointment Types

**Problem:** Two appointments (e.g. a walk-in and a booked slot) could be created at the same doctor + date + time because the conflict check only ran when `type === 'booked'`, and even then only checked against other `type='booked'` rows.

**Fix:** The conflict check now runs for **any appointment that has an `appointment_time`** (any type), and checks against all non-cancelled appointments regardless of type.

| File | Change |
|------|--------|
| `appointment.routes.js` | Removed `if (type === 'booked')` wrapper; removed `AND type = 'booked'` from conflict query. Conflict check now runs for walk-in + booked + emergency if a time is given. |

---

### 5 — Slot Grid Visual Disable

**Problem:** Taken slots (including completed appointments) appeared as available in the booking grid. Users could click them and only got an error after submitting.

**Root cause:** The `GET /doctors/:id/slots` query had `AND type = 'booked'` — this excluded walk-ins and emergencies from the "taken" set. Completed appointments (`status = 'completed'`) also weren't blocked because the original filter used `NOT IN ('cancelled')` inconsistently.

**Fix:** Changed the slot availability query to block any appointment that has a `appointment_time` and is not cancelled.

| File | Change |
|------|--------|
| `doctor.routes.js` | Slot query: removed `AND type = 'booked'`; changed `AND status NOT IN ('cancelled')` → `AND appointment_time IS NOT NULL AND status != 'cancelled'` |

**Frontend:** Taken slots now render as a non-interactive `<div>` (line-through, muted colour, no cursor) instead of a disabled `<button>`. Added Available / Taken legend below the time heading.

---

### 6 — Booking Portal UI Redesign

**Problem:** The public `/book` page used hardcoded Tailwind color classes (`blue-*`, `gray-*`, `emerald-*`) — no dark mode support, no mobile optimisation, no clinic logo, gradient background inconsistent with app design patterns.

**Solution:** Complete rewrite of `BookingPage.jsx` using the same design system as the app.

| Feature | Implementation |
|---------|---------------|
| CSS variables | All colors via `var(--color-*)` — zero hardcoded Tailwind color classes |
| Dark / light mode | `useTheme()` hook; Sun/Moon toggle button in page header |
| Clinic logo | `mediaUrl(clinicInfo.logo_url)` — falls back to Stethoscope icon if no logo set |
| Clinic name | From `/portal/info` response — shows in header |
| Full-width layout | `min-h-screen` page + `max-w-2xl mx-auto px-4` container |
| Mobile-friendly slot grid | `3 cols` on mobile → `5 cols` on `sm+` |
| Taken slots | Non-interactive `<div>` with line-through (not a disabled button) + Available/Taken legend |
| Doctor avatars | Shows `avatar_url` image if set, falls back to User icon |
| Sticky header | Logo + clinic name + dark toggle — stays at top while scrolling |
| Print | Print/Save PDF button on Step 4 confirmation |

**Backend fix required (done):** `portal.routes.js` GET `/info` was selecting `logo_url` — column does not exist. Corrected to `clinic_logo_url AS logo_url`.

| File | Change |
|------|--------|
| `portal.routes.js` | Changed `logo_url` → `clinic_logo_url AS logo_url` in GET /info SELECT query |
| `BookingPage.jsx` | Complete rewrite — CSS variables, `useTheme`, `mediaUrl`, sticky header, slot legend, doctor avatars |

**Also fixed:** `patient_portal_enabled` defaults to `FALSE` in the DB schema. After enabling via Settings → Security → Patient Portal toggle, or directly via SQL: `UPDATE tenant_*.clinic_settings SET patient_portal_enabled = TRUE;`

---

## Consult + Rx Combined, Custom Medicines, Food Chips, Token Fix, Badge Fixes (2026-04-17)

> Doctor no longer needs two separate steps to write a consultation then a prescription. Both are done in a single modal. Custom medicines (not in the store) are now supported. Food instruction chips added. All bookings now get a token. Online badge and Rx button badge fixed to use theme variables.

---

### 1 — Consultation + Prescription in One Modal

**Problem:** Doctor had to click Consult → save → then click Write Rx → save. Two steps, two modals, too slow.

**Solution:** `ConsultationModal.jsx` fully rewritten to include the entire prescription section at the bottom. The doctor fills vitals, clinical notes, and medicines all in one screen and clicks **Save & Complete** once.

**Save flow:**
1. Consultation saved via `consultationsApi.create()`
2. If any medicine rows are filled → prescription saved via `prescriptionsApi.create({ appointment_id, ... })`
3. The prescription route resolves `consultation_id` from `appointment_id` automatically — no extra input needed
4. After save: success banner shows Rx number + **Print Rx** button activates

**Medicines section behaviour:**
- All medicine rows are optional — if no medicines are entered, only the consultation is saved (no error)
- Rows are validated only if at least one medicine field is partially filled
- Empty row at bottom stays as a placeholder — only filled rows are submitted

**Form section order (top to bottom):**
1. Patient info bar (name, code, doctor, reason)
2. Allergy alert (if allergies on file)
3. **Chief Complaint** (required) — moved to very top for speed
4. Vitals (BP, pulse, temperature, weight)
5. Clinical Notes (symptoms, diagnosis, ICD-10, doctor's notes)
6. Follow-up date
7. Medicines (optional — embedded prescription section)

| File | Change |
|------|--------|
| `ConsultationModal.jsx` | Complete rewrite — prescription state + `MedicineRow` sub-component embedded; `PresetChips` component; `FOOD_PRESETS` + `DOSAGE/FREQUENCY/DURATION` presets; `getFilledRxItems()` + `validateRx()` helpers; combined `onSubmit()` saves both consultation and prescription; `handlePrintRx()`; `savedRx` state; Chief Complaint moved to top of form |

**The standalone "Write Rx" button on the queue** still exists for cases where a consultation was saved without medicines — the doctor can open `PrescriptionModal` separately to add a prescription later. But once a prescription exists (`appt.prescription_id` set), the Write Rx button disappears.

---

### 2 — Custom Medicine Names (Medicines Not in Store)

**Problem:** Prescription form required selecting a medicine from the store. Doctors couldn't prescribe medicines that weren't in the inventory yet.

**Solution:** The medicine search field now accepts free text. If the doctor types a name but doesn't select from the dropdown, the typed text is saved as `custom_medicine_name`. The medicine row shows **✎ custom name** label to make this clear.

**Database changes:**
- `prescription_items.medicine_id` — dropped `NOT NULL` constraint (now nullable)
- `prescription_items.custom_medicine_name VARCHAR(255)` — new column added
- All `SELECT` queries on `prescription_items` updated to `LEFT JOIN medicines m ON m.id = pi.medicine_id` + `COALESCE(m.name, pi.custom_medicine_name) AS medicine_name`

| File | Change |
|------|--------|
| `createTenantSchema.js` | `prescription_items` table: `medicine_id` nullable; `custom_medicine_name VARCHAR(255)` column added |
| `migrate_custom_medicine.js` (NEW) | One-time migration: drops NOT NULL from `medicine_id`; adds `custom_medicine_name` to all existing `tenant_*` schemas. Run: `node src/db/migrate_custom_medicine.js` |
| `prescription.routes.js` | Validation: `item.medicine_id \|\| item.custom_medicine_name?.trim()`; INSERT includes `$3 = custom_medicine_name`; GET /patient/:id, GET /:id, GET /:id/pdf all use LEFT JOIN + COALESCE |
| `invoice.routes.js` | Auto-pull query: `LEFT JOIN medicines m ON m.id = pi.medicine_id`; `COALESCE(m.name, pi.custom_medicine_name) AS name` |
| `ConsultationModal.jsx` | `emptyItem()` includes `custom_medicine_name: ''`; `isCustomName` flag drives the `✎ custom name` label; submitted payload sets `medicine_id: null, custom_medicine_name: searchQuery` for typed-not-selected entries |
| `PrescriptionModal.jsx` | Same — validation accepts `searchQueries[index].trim().length >= 2`; payload sends `custom_medicine_name`; `✎ custom medicine name` label shown |

---

### 3 — Food Instruction Chips

**Problem:** Instructions field was a plain text box — doctors had to type "Before food", "After food" etc. every time.

**Solution:** Quick-select chip buttons added below the instructions text input in both modals.

**Chips:** `Before food` · `After food` · `With food` · `At bedtime`

Clicking a chip sets the instructions field to that value (toggle — clicking the active chip clears it). Doctor can still type any custom instruction manually.

| File | Change |
|------|--------|
| `ConsultationModal.jsx` | `FOOD_PRESETS` constant; food chips rendered via `PresetChips` component inside each `MedicineRow` below the instructions input |
| `PrescriptionModal.jsx` | `FOOD_PRESETS` constant; chip buttons rendered inline below the instructions input inside each medicine card |

---

### 4 — prescription_id in Appointment List Query

**Problem:** The queue had no way to know if a prescription had already been written for a consultation. The "Write Rx" button stayed visible even after a prescription existed, and clicking it returned a 409 error.

**Fix:** Appointment list query now LEFT JOINs prescriptions and returns `prescription_id`. The `canWriteRx` guard in the frontend includes `!appt.prescription_id`.

| File | Change |
|------|--------|
| `appointment.routes.js` | Added `pr.id AS prescription_id` to SELECT; added `LEFT JOIN prescriptions pr ON pr.consultation_id = c.id` |
| `AppointmentsPage.jsx` | `canWriteRx` now: `isDoctor && appt.status === 'completed' && !!appt.consultation_id && !appt.prescription_id && isOwnAppt` |

---

### 5 — Token for ALL Booking Types

**Problem:** Only walk-in and emergency bookings got a token number. Booked appointments (with a time slot) had `token_number = null` — no token column shown in the queue, confusing for the receptionist.

**Fix:** `nextToken()` now runs for every appointment type. All bookings get a sequential token per doctor per date.

| File | Change |
|------|--------|
| `appointment.routes.js` | Removed `if (type === 'walkin' \|\| type === 'emergency')` condition. `const token = await nextToken(...)` now runs unconditionally for all types. |

**Note:** Emergency appointments still sort to the top (token = 0 via the `CASE WHEN type = 'emergency' THEN 0` ORDER BY). Booked appointments keep their `appointment_time` slot in addition to their token.

---

### 6 — Online Badge + Rx Button CSS Fix

**Problem:** Online booking badge in the queue used hardcoded `bg-blue-100 text-blue-700` — invisible in dark mode.

**Fix:** Replaced with `bg-[var(--color-primary-light)] text-[var(--color-primary)]` — follows the theme in both dark and light mode.

| File | Change |
|------|--------|
| `AppointmentsPage.jsx` | `QueueRow` Online badge: `bg-blue-100 text-blue-700` → `bg-[var(--color-primary-light)] text-[var(--color-primary)]` |

---

### Stock Deduction Clarification (Not a Bug — By Design)

Saving a prescription does **not** reduce stock. Stock only decreases when a pharmacist goes to **Pharmacy → Dispense Queue** and clicks "Dispense" on the prescription. This is the correct clinical flow:

1. Doctor writes prescription → stored in DB, items added to dispense queue
2. Patient goes to pharmacy window
3. Pharmacist checks stock, physically hands over medicines
4. Pharmacist clicks Dispense → `POST /pharmacy/dispense/:id` → stock deducted per `quantity_given`
5. If insufficient stock, dispense is blocked with a clear error showing which medicine is short

If a clinic has no dedicated pharmacist and wants stock to auto-deduct on Rx save, that would need a separate setting — not yet implemented (deferred to Phase 6 if requested).

---

## Queue & Sync Bug Fixes (2026-04-16)

> Multiple bugs fixed in a single session: queue redesign, portal-backend token/slot sync, doctor ownership enforcement, nullable prescription constraint, and doctor filter tab disappearing.

### Problems fixed

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | AppointmentModal crash on open | `DatePicker` imported from wrong path (or not at all) + stale `switchToNew()` function calling deleted state setters | Added correct import; removed dead `switchToNew()` function |
| 2 | Queue table data not clear; token number too small | Token column was inline text, no visual hierarchy | QueueRow redesigned: `w-20` left sidebar with `text-5xl font-black` token, colour-coded by type (blue=walk-in, red=emergency) |
| 3 | Token slip showed "Invalid Date" | Date `"2026-04-16T00:00:00.000Z"` + `"T00:00:00"` appended = invalid ISO | `String(d).slice(0, 10)` normalises to `YYYY-MM-DD` before parsing |
| 4 | Token slip number too small for doctor to read at a glance | Default 52px font | Token font increased to 72px |
| 5 | Online bookings had no token number | Portal POST didn't call `nextToken()` | Added `nextToken()` helper to `portal.routes.js`; portal INSERT now includes `token_number`; confirmation card shows token |
| 6 | Portal slot availability allowed double-booking of walk-in times | Slot query filtered `AND type = 'booked'` — missed walk-ins at same time | Changed to `AND appointment_time IS NOT NULL` in both the availability query and conflict check |
| 7 | Portal confirmation showed typed name ("Kumudu"), not DB name ("shamantha") | Response used `req.body.patient_name` | Introduced `resolvedPatientName` — set from DB lookup when existing patient found |
| 8 | Patient name returned NULL for patients with no last name | `first_name \|\| ' ' \|\| last_name` returns NULL when last_name IS NULL in PostgreSQL | Changed to `first_name \|\| COALESCE(' ' \|\| last_name, '')` across all 7 route files |
| 9 | Prescription POST returned 500 (NOT NULL violation on `consultation_id`) | `prescriptions.consultation_id` had `NOT NULL` constraint | Removed NOT NULL from `createTenantSchema.js`; added migration `migrate_prescription_consultation_nullable.js` for existing schemas |
| 10 | "Rx" button appeared even when no consultation existed | `canWriteRx` didn't check `appt.consultation_id` | Added `!!appt.consultation_id` guard to `canWriteRx` |
| 11 | Doctor "indika" could open Consult on Dr. James Silva's patients | No ownership check in UI or backend | Frontend: `isOwnAppt = user?.role === 'admin' \|\| String(appt.doctor_id) === String(user?.id)` guards `canConsult`/`canWriteRx`; Backend: 403 check added to both `consultation.routes.js` and `prescription.routes.js` POST handlers |
| 12 | Doctor filter tabs disappeared when clicking non-"All" tab | `load()` passed `doctor_id` to API → smaller result set → `doctorsInQueue` re-filtered from shrunken list → other tabs vanished | Removed `doctor_id` from API call; all doctor filtering is now client-side |

### Architecture decisions

- **Client-side doctor tab filter** — all appointments for the day load once (`load({ date })`). Tabs filter `appointments` array in memory. One API call per date navigation, zero per tab switch. Backend `effectiveDoctorId` still enforces role isolation so doctors can't bypass via direct API calls.
- **Doctor ownership two-layer enforcement** — frontend hides/disables buttons for `isOwnAppt === false`; backend returns 403 if `req.user.role === 'doctor' && doctor_id !== req.user.id`. Belt and suspenders.
- **Portal slot conflict check uses `appointment_time IS NOT NULL`** — any appointment (walk-in, booked, emergency) that has a time blocks that slot. Previously only `type='booked'` was excluded, allowing walk-in double-booking.

### Migration commands (run once)

```bash
# Drop NOT NULL from prescription.consultation_id on all existing tenant schemas
node src/db/migrate_prescription_consultation_nullable.js
```

### Files changed

| File | Change summary |
|------|---------------|
| `AppointmentsPage.jsx` | Removed `doctor_id` from `load()`; client-side `filtered`; `doctorsInQueue` from full list; doctor tabs hidden for doctor role; `isOwnAppt` ownership guard; QueueRow token column redesign; `onPrint` prop plumbed |
| `printTokenSlip.js` | Token font 72px; date normaliser `slice(0,10)` fix |
| `appointment.routes.js` | `COALESCE(' ' \|\| last_name, '')` fix; `effectiveDoctorId` enforces doctor isolation |
| `portal.routes.js` | `nextToken()` added; slot queries use `appointment_time IS NOT NULL`; `resolvedPatientName` from DB; `token_number` in INSERT and response |
| `consultation.routes.js` | `COALESCE` patient_name fix; doctor ownership 403 check |
| `prescription.routes.js` | `COALESCE` patient_name fix; doctor ownership 403 check |
| `patient.routes.js` | `COALESCE` patient_name fix in search queries |
| `pharmacy.routes.js`, `insurance.routes.js`, `lab.routes.js` | `COALESCE` patient_name fix |
| `createTenantSchema.js` | `consultation_id UUID REFERENCES consultations(id)` — removed NOT NULL |
| `migrate_prescription_consultation_nullable.js` | NEW — one-time migration to drop NOT NULL on existing schemas |

---

## Token Slip Printing (2026-04-16)

> After a patient is added to the queue, a confirmation screen shows the token/booking reference with a Print Slip button that sends to a thermal receipt printer.

### How it works
1. Staff clicks "Add to Queue" or "Book Appointment" and submits the form
2. Instead of closing the drawer, a **confirmation screen** appears inside the same drawer showing:
   - Large token number (walk-in / emergency) or BK-XXXXXX booking reference (booked/online)
   - Patient name, doctor, date, time, type
3. Footer shows **Done** (closes drawer) and **Print Slip** buttons
4. Print Slip opens a new 80mm-width browser window and triggers `window.print()` automatically

### Thermal printer format (80mm paper)
- Clinic name (large bold)
- "Appointment Token" title
- Type badge (WALK-IN green / BOOKED blue / ⚡ EMERGENCY red)
- TOKEN (large 52px number) — or BOOKING REF for booked appointments
- Patient name, doctor, date, time rows
- Footer: "Please keep this slip · HH:MM"
- `@page { size: 80mm auto; margin: 0; }` CSS for thermal printers

### New files

| File | Purpose |
|------|---------|
| `clinic-frontend/src/utils/printTokenSlip.js` | Opens 80mm popup, generates HTML, auto-prints. Accepts: `{ clinicName, patientName, patientCode, doctorName, tokenNumber, bookingRef, date, time, type }` |

### Modified files

| File | Change |
|------|--------|
| `AppointmentModal.jsx` | Added `bookedSlip` state. After successful submit → sets `bookedSlip` instead of closing. Drawer title changes to "Booking Confirmed". Form hidden, confirmation screen shown. Footer changes to Done + Print Slip. `handleClose()` resets `bookedSlip`. Imports `Printer`, `printTokenSlip`, `useAuth`. |

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

**Bug fixes during Phase 5.4 (2026-04-15):**

| # | File | Bug | Fix |
|---|------|-----|-----|
| 17 | `ConsultationModal.jsx` | `watch is not defined` — ReferenceError crash at line 239 when DatePicker tried to use `watch` | Added `watch` and `setValue` to `useForm()` destructure |
| 18 | `portal.routes.js` | Patient code generated as `P-00001` (wrong prefix) instead of `PT-00001` — local function had wrong regex and prefix | Removed local `nextPatientCode` from `portal.routes.js`; both `patient.routes.js` and `portal.routes.js` now import shared `utils/patientCode.js` |
| 19 | Multiple (17 occurrences, 11 files) | Double "Dr." prefix shown on doctor names — `staff.full_name` already stores "Dr. James Silva" but UI was prepending "Dr. " again | Removed all hardcoded `"Dr. "` prepends across `AppointmentsPage`, `DoctorDashboard`, `ReceptionistDashboard`, `AdminDashboard`, `NurseDashboard`, `ConsultationModal`, `ConsultationsPage`, `PrescriptionModal`, `PrescriptionsPage`, `PatientProfile` (×2), `printPrescription.js` (×2), `BookingPage` (×4) |
| 20 | `portal.routes.js` | After extracting `bookingReference` to shared util, local `nextBookingReference` function remained → duplicate identifier error | Removed local function block from `portal.routes.js` |

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
| Phase 5.4 | Patient Portal — public online booking, BK-XXXXXX reference, Settings toggle, enhanced Doctor dashboard | ✅ Complete (2026-04-15) |
| Token Slip | 80mm thermal printer slip after Add to Queue — confirmation screen + Print Slip button | ✅ Complete (2026-04-16) |
| Phone Formatting | 10-digit validation, `xxx xxx xxxx` format, backend normalization, auto-suggest search | ✅ Complete (2026-04-16) |
| Patient Reg. Simplification | first_name + phone only required; optional last_name/DOB/gender; auto-create in queue drawer | ✅ Complete (2026-04-16) |
| Queue & Sync Bug Fixes | Queue redesign, portal-backend sync, doctor ownership, doctor tab fix, prescription/consult fixes | ✅ Complete (2026-04-16) |
| Billing & Invoice Fixes | Invoice auto-pull all medicines; Add Item 3-tab modal; Rx qty auto-calculation | ✅ Complete (2026-04-17) |
| Double-booking & Slot Fix | All types blocked from double-booking; taken slots visually disabled in grid | ✅ Complete (2026-04-17) |
| Booking Portal UI Redesign | Full-width, dark/light mode, CSS vars, mobile, clinic logo + name from backend | ✅ Complete (2026-04-17) |
| Consult + Rx Combined Modal | One-step consultation + prescription; food chips; custom medicines; Chief Complaint moved to top | ✅ Complete (2026-04-17) |
| Token for All Booking Types | walk-in, booked, emergency all get sequential token numbers | ✅ Complete (2026-04-17) |
| Queue Badge Fixes | Online badge CSS variables; Rx button hidden when prescription already exists | ✅ Complete (2026-04-17) |
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
- [x] Online booking page (patient-facing) — done in Phase 5.4 (`/book`, `BookingPage.jsx`, `portal.routes.js`)
- [ ] Reminder settings screen — defer to Phase 6

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