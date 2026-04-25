# workflow.md — Role-Based Workflow Reference

> **Rule:** Update this file at the end of every phase.
> Describes what each role can do, the full patient journey, and how all modules connect.
> Keep this in sync with `ongoingworking.md` and `Plan.md`.

---

## Last updated: 2026-04-25
## Covers: Phases 1–4 complete + Phase 5.1 Pharmacy + Phase 5.2 Lab + Phase 5.3 Insurance + Phase 5.4 Patient Portal + Phase 5.5 Queue Display + SaaS onboarding flow + Staff Management + Token Slip Printing + Phone Formatting + Queue redesign + Doctor ownership enforcement + Billing invoice fixes + Slot double-booking fix + Booking portal UI redesign + Consult+Rx combined modal + Custom medicines + Food chips + Token for all booking types + Queue badge fixes + TopBar redesign + Token slip logo + Auto-arrive on print + Consultations/Prescriptions detail modals + Search/filter on all list pages + Dispense confirmation modal + InvoiceModal dispense quick action + Low stock dashboard badge + Post-dispense low stock toast + DispenseModal reorder_level threshold + Queue Display bug fix + Admin-frontend DESIGN.md UI rebuild + Medicine Store test automation + Lab page patient search fix + Token numbers on Billing/Consultations/Prescriptions + Lab requests in consultation and prescription modals + Subscription billing management + Production deployment (healthcenter.lk) + Schema completeness fix + Date comparison bug fix + Logo display fix + Auto-polling dashboards + Landing page redesign (dark UI, role tabs, animated hero) + Platform Settings full page (company/contact/payment/system) + Clinic subscription contact+payment cards + Platform info public API + Mobile/tablet responsive layout + Help & User Guide page + Landing page guide.html + Nurse vitals workflow (patient_vitals table, VitalsModal, pre-populate ConsultationModal) + Landing page full light theme conversion (all sections light) + Navbar left-side slide drawer (mobile) + Logo caching fix (timestamp filenames + old file deletion) + AuthContext currency field fix + Nginx conflicting server_name fix + PM2 auto-start on reboot via systemd + Booking QR Code Card (Settings → Security tab).
## API standard: all routes return `{ status: 'success'|'error', message?, data? }`

---

## The Core Patient Journey

```
Patient books online at /book (no login) — OR — walk-in at clinic
      ↓
Patient registered (auto-created from phone number if first visit)
      ↓
Appointment booked (walk-in / booked slot / online via portal)
ALL bookings get a sequential token number per doctor per date
      ↓
Patient marked as Arrived
      ↓
[ NEW ] Nurse opens "Vitals" button → VitalsModal: BP, pulse, SpO2, temperature, weight, height
        Vitals saved to patient_vitals table (linked to appointment)
      ↓
Doctor clicks Consult → ONE modal opens with nurse vitals pre-populated (blue summary banner shown)
Doctor reviews/adjusts vitals + adds diagnosis + notes + medicines (optional)
      ↓         ← appointment auto-flips to "completed" on Save & Complete
If medicines were added → Prescription auto-saved in same submit (Rx number shown, Print Rx button activates)
If no medicines → only consultation saved (Write Rx button stays available for later)
      ↓
[ Optional ] If pharmacy module is ON: pharmacist dispenses Rx from Pharmacy → Dispense Queue → stock deducted
      ↓
Receptionist clicks "Bill" → Invoice auto-created (doctor fee + prescribed medicines)
      ↓
Add extra services if needed → Record payment (Cash / Card / Online / Insurance)
      ↓
End-of-Day closing — cash count vs system totals, lock the day
      ↓
[ Phase 2.6 ] Reports and analytics
```

---

## Role-by-Role Workflows

---

### Receptionist

**Sidebar access:** Dashboard · Patients · Appointments · Prescriptions · Billing · Pharmacy *(if flag ON)* · Lab *(if flag ON)*

#### Dashboard
- Stat cards: Total appointments today, Waiting, Collected Today, Outstanding payments
- Live queue table for all doctors (token, patient, doctor, time, status)
- Quick-action buttons: Search Patient → Patients page, Manage Queue → Appointments page

#### Patient Registration
- Search by phone on the Patients page — "Returning Patient" quick lookup bar
- If no match → Register Patient modal (full form with personal, contact, emergency, insurance sections)
- System checks for duplicates automatically (same phone / name+DOB / national ID) → shows warning modal with matches
- Can choose "Use Existing Patient" or "Register Anyway" from the duplicate modal
- Can also register a new patient inline inside the Add to Queue modal — no need to leave the queue
- **Phone number format:** All phone fields format as `xxx xxx xxxx` while typing (e.g. `076 294 6381`). Must be exactly 10 digits. Stored as digits-only (`0762946381`) in the database — displayed formatted in the UI.

#### Queue Management
- Opens Appointments page each morning — today's date loaded by default
- Date navigation (prev/next arrows, date picker, back-to-today button)
- **Doctor filter tabs** appear automatically when multiple doctors have appointments. Tabs always stay visible regardless of which tab is selected — all appointment data loads once, filtering is done client-side. No extra API call per tab click.
- **Add to Queue** — opens AppointmentModal with three modes:
  - **Walk-in** — token number auto-assigned, time slot optional *(tab hidden if Allow Walk-ins is OFF in Settings → Appointments)*
  - **Book** — date + doctor + time slot grid (blocked on holidays / no schedule)
  - **Emergency** — bypasses slot, jumps to top of queue with red badge *(always available regardless of walk-in setting)*
- Inside the modal: "Search Existing" tab (phone lookup) or "New Patient" tab (inline mini registration)
- **Phone search auto-suggest** — results appear live as the receptionist types (350ms debounce, triggers after 5 digits). No need to click Search manually.
- After successful submit — **confirmation screen appears inside the same drawer** showing the token number (large, walk-in) or BK-XXXXXX reference (booked). Drawer footer changes to **Done** + **Print Slip** buttons.
- **Print Slip** → opens 80mm thermal-printer window and auto-prints a token slip with clinic name, type badge, token/reference, patient name, doctor, date, time.
- Status action buttons per queue row:
  - `Pending / Confirmed` → **Arrived**, **Cancel**
  - `Arrived` → **Complete**, **Cancel**
  - `Completed / Cancelled` → no actions

#### Prescriptions
- Views all prescriptions written on any date via the Prescriptions page (`/prescriptions`)
- Date navigation (prev/next arrows + DatePicker + back-to-today)
- **Doctor filter tabs** — appear when multiple doctors wrote prescriptions on that day; filter is client-side
- **Search bar** — filter by patient name, patient code, Rx number, or doctor name; X clear button
- Count display: "X of Y prescriptions" shown when doctor filter or search active
- **Card design** — left-panel token column (`w-20 py-4`, blue `bg-[var(--color-primary)]` when token exists, `text-5xl font-black` number, "Token" label). Fallback shows "Rx" label in muted style. Phone number shown in card.
- Click any Rx card → **detail modal opens** showing: patient info (name, code, allergy warning), doctor info (name, specialization, reg no), date/time, medicines table (medicine, dosage, frequency, duration, instructions, qty)
- **Lab Tests section in modal** — shows lab tests ordered in the same consultation. Per test: test name, code, category, Done/Pending badge, result value + unit + reference range + result notes (when result available).
- Modal footer: **View Patient** button + **PDF download** + **Print** button
- No navigation away from the page — everything happens in-modal

#### Patient Profile
- Full profile view — personal details, contact, emergency contact, insurance
- **Edit** patient details (receptionist + admin)
- Visits tab — read-only consultation history
- Prescriptions tab — read-only Rx history
- Billing tab — full invoice history with summary totals ✅

#### Billing (`/billing`)
- Date navigation (prev/next arrows + DatePicker + back-to-today)
- Summary strip — Total Billed, Collected, Outstanding for the selected day
- **Status filter tabs** — All / Unpaid / Partial / Paid (server-side filtering)
- **Search bar** — client-side filter by patient name, patient code, or invoice number; X clear button
- Count: "X of Y invoices" when search active; context-aware empty state

- **Bill button** appears on completed appointment rows (receptionist + admin, when consultation exists)
- Clicking Bill → checks if invoice already exists for that consultation
  - If yes → opens the existing invoice
  - If no → creates new invoice (auto-pulls doctor fee from `doctor_fees` + prescribed medicines with prices)
- **InvoiceModal** — view and manage the invoice:
  - Line items table (consultation fee, medicines, custom services)
  - **+ Add Item** → opens a dedicated `AddItemModal` (3-tab overlay):
    - **Service tab** — clickable cards for configured custom services; select one → qty + price auto-fill
    - **Medicine tab** — live search bar; shows stock + price; click to select → fills description + price
    - **Custom tab** — free-text description + qty + price; live line-total preview
  - **Remove Item** — trash icon per row (blocked on paid invoices)
  - **Auto-pull from Prescription** — pulls all prescribed medicines including those with price=0 (price editable after)
  - **Dispense Rx** quick action — appears when invoice has a linked prescription that hasn't been dispensed yet; opens `DispenseModal` (allergy warning + medicines + stock levels); dispenses and deducts stock without leaving the invoice
  - Totals: subtotal → discount → tax → total → paid → balance
  - **Record Payment** — select method (Cash / Card / Online / Insurance), enter amount, optional reference field
  - Multiple payment calls allowed — each adds a split record (partial payment support)
  - Payment history shown below totals
- **BillingPage** (`/billing`) — daily invoice list:
  - Date navigation, status filter tabs (All / Unpaid / Partial / Paid)
  - Summary strip — total billed, collected, outstanding for the day
  - Click any row → opens InvoiceModal

#### End of Day
- **End of Day** button on BillingPage header → `/billing/end-of-day`
- Date picker (defaults to today, can go back)
- Left panel: system totals — patients, invoices, total billed, collected, outstanding
- Right panel: per-method breakdown + cash count input
- Live discrepancy indicator — green (matched), amber (surplus), red (short)
- Notes field for explanation
- **Close Day & Lock** button → submits, locks the day, cannot re-submit
- Past closed days show read-only summary with who closed it and when

#### Pharmacy *(if pharmacy flag ON)* (`/pharmacy`)
- **Dispense Queue tab** — prescriptions written today (date navigation)
  - **Filter pills**: All · Pending · Dispensed
  - **Search bar**: filter by patient name, Rx number, or doctor
  - Section headers show count: "Pending Dispense (X)" and "Dispensed (X)"
  - Click card to expand medicines list; "Dispense" button opens **DispenseModal** → shows allergy warning banner (red, if allergies on record), medicines table with stock qty (red + LOW label when ≤5), confirm button → deducts stock on confirm
- **Purchase Orders tab** — full PO history
  - **Status filter pills**: All · Draft · Ordered · Received · Cancelled
  - **Search bar**: filter by PO number or supplier name
- **Suppliers tab** — supplier directory
  - **Search bar**: filter by name, contact, phone, or email
- **Stock Adjustments tab** — log manual stock changes (add, remove, damaged, expired)
- Can dispense prescriptions (deducts stock automatically)
- Can create and receive purchase orders; can log stock adjustments
- **Cannot** add/edit/delete suppliers (admin only on backend)

#### Lab *(if lab flag ON)*
- Full access to Lab Queue and Test Catalog
- Can enter results (type value + upload PDF/image)
- Can view completed results
- Can add/edit/delete tests in catalog (same as admin)
- Can create lab requests for patients

**Cannot do:** Write consultations · Write prescriptions · Access Medicine Store · Delete patients

---

### Doctor

**Sidebar access:** Dashboard · Patients · Appointments · Consultations · Prescriptions · Lab *(if flag ON)*

#### Dashboard
- Greeting with doctor's name (morning/afternoon/evening)
- Stat cards: Total Today, Waiting, Completed, **Online Booked** — filtered to this doctor
- **Now Seeing card** — highlights the current patient (status = arrived) with name, code, booking reference (if online), allergies warning, last complaint
- **Next Up card** — shows the next patient waiting with token, time, online badge if applicable
- Remaining queue list below (all waiting patients after Next Up) — click row → Appointments page
- Online bookings shown with Globe icon badge + BK-XXXXXX reference number

#### Queue View
- **Sees only their own appointments** — the backend filters by `doctor_id = req.user.id` for doctor-role users regardless of any query parameters. Doctor filter tabs are hidden on the Appointments page when logged in as a doctor.
- Cannot add to queue or change appointment status
- **Consult button** appears only on rows where status = `arrived` AND the appointment belongs to this doctor. Clicking Consult on another doctor's patient is blocked both in the UI and at the backend (403).
- **Write Rx button** appears only on rows where status = `completed`, a consultation has been saved (`consultation_id` exists), AND the appointment belongs to this doctor. Standalone Rx without a consultation is not possible.
- Writing a consultation auto-flips the appointment to `completed`

#### Writing a Consultation + Prescription (One Step)
- Click **Consult** on an arrived appointment → **ConsultationModal** opens (one combined modal)
- Patient info bar at top: name, code, doctor, reason for visit
- Allergies alert (red banner) if allergies on record
- **Form sections (top to bottom):**
  1. **Chief Complaint** (required) — first field, immediately visible on open
  2. **Vitals** — BP systolic/diastolic, pulse (bpm), temperature (°C), weight (kg). If a nurse recorded vitals before consultation, a **blue banner** appears at the top of the Vitals section showing all nurse values, and BP/pulse/temp/weight fields are pre-populated.
  3. **Clinical Notes** — symptoms, diagnosis, ICD-10 code, doctor's notes
  4. **Follow-up** — optional follow-up date picker
  5. **Medicines** (optional) — embedded prescription section
- **Medicines section:**
  - Type in search box → live suggestions from medicine store (300ms debounce)
  - Select from dropdown → fills name, strength, unit (shows **✓ from store** label)
  - Type and don't select → saved as custom medicine name (shows **✎ custom name** label) — for medicines not yet in the store
  - Per row: **Dosage** preset chips (1 tablet / 2 tablets / ½ tablet / 1 capsule / 5 ml / 10 ml / 1 teaspoon) + free text
  - Per row: **Frequency** preset chips (Once daily / Twice daily / Three times daily / Four times daily / Every 8 hours / Every 12 hours) + free text
  - Per row: **Duration** preset chips (3 days / 5 days / 7 days / 10 days / 14 days / 1 month) + free text
  - Per row: **Qty to Dispense (auto)** — auto-calculated: `Math.ceil(units_per_dose × doses_per_day × duration_days)`. Editable override allowed.
  - Per row: **Instructions** text input + **food chips**: Before food · After food · With food · At bedtime (click to set, click again to clear)
  - Add more rows / remove rows
  - Rows with no medicine entered are ignored — prescription only saved if at least one medicine row is filled
- Click **Save & Complete** → consultation saved → if medicines entered, prescription auto-saved in same action
- Success: appointment flips to `completed`, Rx number shown in banner, **Print Rx** button activates

#### Write Rx Separately (Standalone — Optional)
- If the doctor saved the consultation without medicines, a **Write Rx** button appears on the completed appointment row
- Opens `PrescriptionModal` — same medicine search + dosage + food chips + custom medicines
- Once a prescription is saved, the Write Rx button disappears (hidden when `appt.prescription_id` is set)

#### Stock Deduction (Pharmacy Module)
- Saving a prescription does **not** reduce stock automatically
- Stock deducts only when the pharmacist goes to **Pharmacy → Dispense Queue** and marks the prescription as dispensed
- Dispense checks for sufficient stock — blocks if any item has insufficient quantity and shows which medicine is short
- If clinic has no pharmacist and pharmacy module is OFF, stock is never deducted (manual stock management)

#### Consultations Page (`/consultations`)
- Browse all consultations by date (date navigation)
- **Doctor filter tabs** — appear when multiple doctors have consultations that day; client-side filtering
- **Search bar** — filter by patient name, code, phone, chief complaint, diagnosis, doctor; X clear button
- **Follow-up filter pill** — toggle to show only consultations with a follow-up date set
- **Card design** — left-panel token column (`w-20 py-4`, blue `bg-[var(--color-primary)]` when token exists, `text-5xl font-black` number, "Token" label). Fallback shows first letter of patient name in muted style. Phone number shown in patient info row.
- Click any card → **detail modal opens** showing: patient info (name, code, allergies), doctor (name, spec, reg no), date/time, vitals grid (BP, pulse, temp, weight), clinical notes grid (chief complaint, symptoms, diagnosis, ICD-10, notes), follow-up date
- **Lab Tests section in modal** — shows lab tests ordered during this consultation. Per test: test name, code, category, Done/Pending badge, result value + unit + reference range + result notes (when result available).
- Modal footer: **View Patient** button
- No navigation away from the page — all data shown in-modal

#### Patient Profile
- Full read access to all tabs
- Cannot edit patient details (read-only for doctor)
- Cannot delete patients

#### Lab *(if lab flag ON)*
- Views Lab Queue — can see all pending and completed requests
- Can enter results for any pending request
- **Can create lab requests** for patients (doctor + admin + receptionist only — not nurse)
- Cannot add/edit/delete tests from catalog

**Cannot do:** Add to queue · Change appointment status · Access Medicine Store · Edit/register patients

---

### Nurse

**Sidebar access:** Dashboard · Patients · Appointments · Prescriptions · Lab *(if flag ON)* · Help & Guide

#### Dashboard
- Stat cards: With Doctor (arrived), Waiting, Completed
- Full list of all patients in clinic today (all statuses) with token, name, doctor, time, status
- Click patient row → navigates to patient profile

#### Appointments & Vitals Recording (`/appointments`)
- Nurse can view the full appointment queue (same page as receptionist/doctor)
- **Vitals button** appears on every `arrived` appointment row
- Click **Vitals** → **VitalsModal** opens:
  - Fetches any existing vitals for the appointment (shows "Recorded" badge if found)
  - Fields: BP systolic/diastolic (mmHg), Pulse (bpm), SpO2 (%), Temperature (°C), Weight (kg), Height (cm), Notes
  - If vitals already exist → pre-populates all fields for editing
  - Save → upserts `patient_vitals` record linked to the appointment
  - Toast: "Vitals recorded" or "Vitals updated"
- Nurse **cannot** change appointment status (no Arrived/Cancel/Complete buttons)
- Nurse **cannot** write consultations or prescriptions

#### What Nurses Can Also Do
- Browse patient list and open patient profiles (read-only)
- View all tabs on patient profile — overview, visits, prescriptions, billing
- View prescriptions by date on the Prescriptions page
- Print prescriptions from the Prescriptions page
- View Help & Guide page

#### Lab *(if lab flag ON)*
- Can view Lab Queue and enter results (same as other roles)
- **Cannot** create lab requests or add/edit/delete tests from catalog

**Cannot do:** Register or edit patients · Add to queue / change appointment status · Write consultations · Write prescriptions · Access Medicine Store

---

### Admin

**Sidebar access:** Dashboard · Patients · Appointments · Consultations · Prescriptions · Medicine Store · Billing · Pharmacy *(if flag ON)* · Lab *(if flag ON)* · **Staff** · Reports · Settings

#### Dashboard
- Stat cards: Total Billed, Collected, Patients Today, EOD Status — all from today's report
- Monthly revenue bar chart (billed vs collected per day)
- Doctor performance table (consultations, patients, revenue per doctor) for today
- Appointment summary strip (Total / Waiting / Arrived / Completed / Cancelled)
- Quick link → Full Reports page

**Admin has all receptionist + doctor capabilities, plus:**

#### Medicine Store (`/medicines`)
- **Filter tabs** (full-width border-b row): All Medicines · Low Stock · Near Expiry
- **Search bar** (below tabs, only shown on "All" tab) — filters by name, generic name, brand, or category; X clear button; server-side search with 400ms debounce
- **Count display** — shows total medicines in current tab/filter
- **All Medicines tab** — full inventory list
  - Each row: name + generic name + strength, category, stock qty (red if low), selling price, expiry date, status badge
  - Status badges: In Stock · Low Stock · Expiring · Expired · Inactive
  - Edit (pencil) → modal with all fields pre-filled; Remove (trash) → soft delete
- **Low Stock tab** — medicines at or below reorder level, highlighted red
- **Near Expiry tab** — medicines expiring within 60 days, highlighted amber
- **Add Medicine** — name (required), generic name, brand, unit (required), strength, category, selling price, stock qty, reorder level, expiry date

#### Appointment Management (admin-only features)
- **Working Hours** button → ManageScheduleModal
  - Set each doctor's schedule per day of week (Mon–Sun)
  - Start time, end time, slot duration per day
  - Upsert — saves or updates existing schedule
- **Holidays** button → HolidaysModal
  - Add clinic-wide holidays by date — blocks all bookings on that date
  - List all upcoming holidays with delete option
- **Make Emergency** — red lightning bolt button per queue row
  - Moves patient to top of queue with emergency badge
  - Confirm dialog before action

#### Reports (admin-only)
- **Reports page** (`/reports`) — 7 tabs, all admin-only:
  - **Daily** — date picker; appointments breakdown, revenue summary, payment method totals, top diagnoses; CSV export
  - **Monthly** — month/year selector; daily bar chart (billed vs collected + appointments vs completed); monthly totals
  - **Doctors** — date range; per-doctor consultations, patients seen, revenue billed/collected; CSV export
  - **Medicines** — instant load; overview stats (active/low/near-expiry/expired); sub-tabs: Low Stock, Near Expiry, Top Prescribed; CSV export
  - **Patients** — date range; total registered, new in period, gender split, age group breakdown, top diagnoses
  - **Appointments** — date range; status + type breakdown; busiest day-of-week bar chart
  - **EOD History** — date range; table of all closing records with cash discrepancy highlighted (green/amber/red); CSV export

#### Patient Management (admin-only)
- **Delete patient** — soft delete, confirm dialog, redirects to patient list after

#### Clinic Settings (admin-only)
- **Settings page** (`/settings`) — 8 tabs:
  - **Clinic** — clinic name, address, phone, email; logo upload (JPG/PNG ≤2MB) with live preview and remove button
  - **Documents** — receipt header, receipt footer, prescription footer text
  - **Billing** — currency code, tax label, tax rate (%)
  - **Appointments** — slot duration (10/15/20/30/45/60 min), max patients/day, walk-in toggle *(enforced: hides Walk-in tab + backend blocks creation)*
  - **Notifications** — reminder toggle, hours before, message template (Phase 5 sends SMS)
  - **Security** — session timeout duration; **Patient Portal toggle** (enable/disable online booking + shows shareable /book URL)
  - **Doctor Fees** — inline edit fee label + amount per doctor; auto-applied to new invoices; signature upload per doctor (JPG/PNG ≤2MB) — appears on prescription PDFs
  - **Custom Services** — add/edit/remove services (name, category, price); appear in InvoiceModal item picker

#### Pharmacy *(if pharmacy flag ON)*
- Full access to all 4 tabs (same as receptionist)
- **Only admin** can add/edit/delete suppliers (backend enforced)

#### Lab *(if lab flag ON)*
- Full access to all lab features
- Can add/edit/delete tests from catalog
- Can create requests, enter results, view history

#### Staff Management (`/staff`, admin-only)
- **Search bar** — filter by name, email, specialization, registration number, phone
- **Role filter pills** — All · Doctors · Nurses · Receptionists · Admins
- **Status filter pills** — All · Active · Inactive
- Count display: "X of Y staff members" when any filter is active
- Staff list grouped by role (only groups matching current filter shown)
- **Add Staff** — create doctor, nurse, receptionist, or another admin with email + password
- **Edit** — update name, email, phone, specialization, registration number, role
- **Reset Password** — set a new password for any staff member
- **Deactivate / Activate** — toggle `is_active`; deactivated staff cannot log in
- Multiple doctors per clinic supported — no limit
- Cannot deactivate your own account (blocked by backend)

**Cannot do:** Nothing is blocked for admin within current phases

---

## Data Connections

```
Patient (PT-XXXXX)
 ├── Appointments
 │    ├── status: pending → confirmed → arrived → completed → cancelled
 │    ├── Patient Vitals (one per appointment — recorded by nurse before consultation)
 │    │    └── bp_systolic, bp_diastolic, pulse, spo2, temperature, weight, height
 │    └── Consultation (one per appointment)
 │         ├── vitals: BP, pulse, temp, weight (pre-populated from nurse entry)
 │         ├── diagnosis + ICD-10 code
 │         └── Prescription (one per consultation)
 │              ├── Prescription Items (many)
 │              │    └── each item → Medicine (in Medicine Store)
 │              └── Dispense (pharmacy module) — deducts stock on dispense
 ├── Lab Requests (many — via Lab module)
 │    ├── test: from lab_tests catalog
 │    ├── requested_by: staff (doctor, receptionist, admin)
 │    └── Lab Result (one per request)
 │         ├── result_value (text)
 │         └── result_file_url (PDF / image)
 └── Patient Profile
      ├── Overview tab    — personal / contact / emergency / insurance
      ├── Visits tab      — all consultations with vitals + diagnosis
      ├── Prescriptions tab — all Rx with every medicine item listed
      ├── Billing tab     — invoice history, summary totals, view invoice modal
      └── Lab tab         — all lab test history with results and file links ✅
```

---

## Access Control Summary

| Action | Receptionist | Doctor | Nurse | Admin |
|--------|:-----------:|:------:|:-----:|:-----:|
| **Create / edit / deactivate staff** | ✗ | ✗ | ✗ | ✅ |
| **Reset staff password** | ✗ | ✗ | ✗ | ✅ |
| Register patient | ✅ | ✗ | ✗ | ✅ |
| Edit patient | ✅ | ✗ | ✗ | ✅ |
| Delete patient | ✗ | ✗ | ✗ | ✅ |
| View patient profile | ✅ | ✅ | ✅ | ✅ |
| Add to queue | ✅ | ✗ | ✗ | ✅ |
| Mark arrived / cancel | ✅ | ✗ | ✗ | ✅ |
| Make emergency | ✗ | ✗ | ✗ | ✅ |
| Set working hours | ✗ | ✗ | ✗ | ✅ |
| Manage holidays | ✗ | ✗ | ✗ | ✅ |
| **Record / update vitals** | ✗ | ✅ | ✅ | ✅ |
| Write consultation | ✗ | ✅ | ✗ | ✅ |
| Write prescription | ✗ | ✅ | ✗ | ✅ |
| View / print prescriptions | ✅ | ✅ | ✅ | ✅ |
| Medicine Store (manage) | ✗ | ✗ | ✗ | ✅ |
| Generate / view invoice | ✅ | ✗ | ✗ | ✅ |
| Record payment | ✅ | ✗ | ✗ | ✅ |
| End of Day closing | ✅ | ✗ | ✗ | ✅ |
| View reports | ✗ | ✗ | ✗ | ✅ |
| **Pharmacy — view queue / dispense** | ✅ | ✗ | ✗ | ✅ |
| **Pharmacy — purchase orders** | ✅ | ✗ | ✗ | ✅ |
| **Pharmacy — add/edit/delete suppliers** | ✗ | ✗ | ✗ | ✅ |
| **Pharmacy — stock adjustments** | ✅ | ✗ | ✗ | ✅ |
| **Lab — view queue / enter results** | ✅ | ✅ | ✅ | ✅ |
| **Lab — create test requests** | ✅ | ✅ | ✗ | ✅ |
| **Lab — add/edit/delete test catalog** | ✅ | ✗ | ✗ | ✅ |
| **Insurance — view claims** | ✅ | ✅ | ✗ | ✅ |
| **Insurance — create / update claims** | ✅ | ✗ | ✗ | ✅ |
| **Insurance — manage providers** | ✅ | ✗ | ✗ | ✅ |
| **Insurance — corporate accounts** | ✅ | ✗ | ✗ | ✅ |
| **Insurance — corporate monthly summary** | ✅ | ✅ | ✗ | ✅ |
| **Online booking — patient portal** | Public (no login) | Public | Public | ✅ |
| **Online bookings — view badge + reference** | ✅ | ✅ | ✅ | ✅ |

---

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| 2.0 Role dashboards | ✅ Complete | Live data — uses existing report + appointment APIs |
| 2.1 Patient registration | ✅ Complete | |
| 2.2 Appointments & queue | ✅ Complete | |
| 2.3 Consultations | ✅ Complete | Combined with prescription in one modal (2026-04-17) |
| 2.4 Prescriptions & Medicine Store | ✅ Complete | Browser print + server-side PDF; food chips; custom medicines; qty auto-calc (2026-04-17) |
| 2.5 Billing & payments | ✅ Complete | Invoice PDF done in Phase 3 |
| 2.6 Reports | ✅ Complete | 7 tabs, CSV export; PDF export deferred to Phase 5 |
| 2.7 Clinic settings | ✅ Complete | Logo/signature upload; 8-tab settings page; doctor fees; custom services; syncs public.tenants on name change |
| 3 PDF generation | ✅ Complete | Invoice PDF + Prescription PDF via pdfkit; Download buttons in UI |
| 4 Super Admin Panel | ✅ Complete (core) | Login, clinic list/create/edit/suspend/activate, feature flag toggles, impersonation; health/audit deferred to Phase 5 |
| 4 Super Admin UI Rebuild | ✅ Complete | Full DESIGN.md-compliant UI — CSS variables, dark mode, Radix Dialog modals, matching sidebar/TopBar layout, Inter font, ConfirmDialog, EmptyState (2026-04-18) |
| Subscription Billing | ✅ Complete | Plans CRUD (PlansPage), all-clinics subscription view (SubscriptionsPage), assign/renew from ClinicDetailPage, clinic admin view (SubscriptionPage), auto-suspend on expiry (2026-04-20) |
| **Mobile / Tablet Responsive** | ✅ Complete | PageLayout: useIsMobile hook, sidebar overlay on mobile (z-50), backdrop, sidebarWidth=0. Sidebar: transform-based slide-in drawer. AppointmentsPage QueueRow: actions stack below on mobile. All data tables: overflow-x-auto. (2026-04-22) |
| **Help & User Guide** | ✅ Complete | `/help` page accessible to all roles. Tabs: Overview, Receptionist, Doctor, Nurse, Admin guides. User's own role tab highlighted with "You" badge. Step-by-step numbered steps with connecting lines, tips, role badges, next-step arrows. Also `/guide.html` on landing page with identical navbar. (2026-04-22) |
| **Nurse Vitals Workflow** | ✅ Complete | `patient_vitals` table (BP, pulse, SpO2, temp, weight, height). `POST/GET /api/v1/vitals`. VitalsModal in AppointmentsPage — nurses see "Vitals" button on arrived patients. ConsultationModal fetches nurse vitals on open, shows blue summary banner, pre-populates BP/pulse/temp/weight. (2026-04-22) |
| **Auto-Polling** | ✅ Complete | All 4 role dashboards + AppointmentsPage: 30s silent background poll. DisplayPage: 10s. `useCallback(load, silent)` pattern — background polls skip loading spinner. (2026-04-22) |
| **Landing Page** | ✅ Complete | `landing-frontend` — React + Vite SPA. Animated hero with queue mockup, role tabs with permission checklists, 12 features grid, 4-step How It Works, dynamic pricing, testimonials, CTA. Contact/footer from `/api/v1/public/platform-info`. Full light theme (all sections converted 2026-04-24). Navbar: left-side slide drawer on mobile (translate-x transition, backdrop overlay, body scroll lock, pinned CTA) (2026-04-25). |
| **Booking QR Code Card** | ✅ Complete | Settings → Security tab (clinic-frontend). When Patient Portal is ON: live QR preview shown + "Download QR Card (PNG)" button. Generates branded 600×720px canvas card (gradient bars, clinic name, QR, URL, instruction). `qrcode.react` v4. Clinic prints and places at front desk — patients scan to book. (2026-04-25) |
| **Platform Settings** | ✅ Complete | 4-tab super admin page: Company Info, Contact Details, Payment Details, System controls. `public.platform_settings` key-value table (17 keys). `GET/PUT /api/v1/admin/platform` + `PUT /api/v1/admin/platform/batch` endpoints. `GET /api/v1/public/platform-info` public endpoint. Data shows on: landing page contact section + footer, clinic admin Subscription page (Contact & Support card + Payment Details card). `migrate_platform_info.js` seeds defaults. (2026-04-22) |
| UI Polish | ✅ Complete | Dark mode, DatePicker, Inter font, improved Select, bg-white audit |
| 5.1 Pharmacy | ✅ Complete | Suppliers, Purchase Orders, Dispense Queue, Stock Adjustments; receptionist + admin |
| 5.2 Lab | ✅ Complete | Test Catalog (12 seeded), Lab Queue, result entry + file upload, Patient Lab tab; all roles |
| 5.3 Insurance | ✅ Complete | Claims (CLM-XXXXX auto-number), Insurance Providers, Corporate Accounts + monthly billing summary; admin + receptionist full, doctor view-only |
| 5.4 Patient Portal | ✅ Complete | Public `/book` page (no login), BK-XXXXXX booking reference, Settings toggle + URL share, Online badge in queue, enhanced Doctor dashboard (Now Seeing + Next Up); UI redesigned full-width dark/light CSS-variable themed with clinic logo (2026-04-17) |
| 5.5 Queue Display | ✅ Complete | Public `/display` TV screen (no login), per-doctor grid (auto-adjusting columns), now_seeing + next_up + token chips, real-time clock, **10s auto-refresh** (changed from 30s), fullscreen API, online/offline indicator, emergency badges; Settings toggle + shareable URL (2026-04-18, refresh interval updated 2026-04-22) |
| Dispense Confirmation Modal | ✅ Complete | Reusable `DispenseModal` used in PharmacyPage, PrescriptionsPage, InvoiceModal; shows allergy warning, medicines table with stock levels, LOW stock highlighted red (2026-04-18) |
| Staff Management | ✅ Complete | Admin creates/edits/deactivates staff (all roles). Reset-password. Grouped by role. `/api/v1/staff` backend. `/staff` page in clinic-frontend. |
| SaaS Onboarding | ✅ Complete | Clinic creation auto-creates first admin staff. Credentials copy screen. No trial/plan system. Super admin manually activates/suspends. |
| Token Slip Printing | ✅ Complete | After Add to Queue → confirmation screen in same drawer with token/ref. Print Slip button → 80mm thermal printer window. `printTokenSlip.js` utility. |
| Phone Formatting | ✅ Complete | All phone inputs format as `xxx xxx xxxx`, validate 10 digits. Stored as raw digits. Backend normalizes on store + search. Auto-suggest search in AppointmentModal after 5 digits. |

---

## Phase 5.4 — Patient Portal / Online Booking

### Overview
A public multi-step booking page at `/book` — no login required. Patients pick a doctor, choose a date and time slot, enter their details, and receive a **BK-XXXXXX** booking reference. Staff see online bookings in the queue with a Globe badge and the reference number.

### How it works end-to-end

```
Patient opens /book (any device, no login)
      ↓
Step 1 — Select Doctor (active doctors from clinic)
      ↓
Step 2 — Pick Date (14-day strip) + available time slot (doctor's schedule, holidays blocked)
      ↓
Step 3 — Patient details: Full Name, Phone, DOB (optional), Reason
      ↓
Submit → backend checks: portal enabled? holiday? slot still free?
      ↓
Existing patient matched by phone — OR — new patient record auto-created
      ↓
Appointment inserted: type='booked', booked_online=TRUE, booking_source='online'
      ↓
Step 4 — Confirmation card shown: BK-000001 (large reference), doctor, date, time, patient details
      ↓
Print / Save PDF button (browser print)
```

### Booking Reference
- Format: `BK-XXXXXX` (e.g. `BK-000001`) — 6-digit zero-padded
- Stored in `appointments.booking_reference`
- Each reference is unique per clinic — sequential, never reused

### Slot Conflict Protection
- **Portal booking:** server checks slot is free before inserting — returns 409 if taken (race condition safe)
- **Admin/staff booking:** conflict check runs for **any appointment type** (walk-in, booked, emergency) that has an `appointment_time`. Previously only ran for `type='booked'` — allowed walk-in double-booking.
- The `/doctors/:id/slots` endpoint (used by both portal and admin UI) marks a slot unavailable if **any** non-cancelled appointment (any type) holds that time — not just `type='booked'`. Completed appointments also block the slot.
- **Frontend:** taken slots render as a non-interactive `<div>` (line-through, muted) — cannot be clicked at all. Available / Taken legend shown above the grid.

### Patient Auto-Registration
- Lookup by phone number — if patient exists, use their ID
- If no patient found → new patient record created automatically with the provided name + phone + optional DOB
- Patient code auto-generated using shared `utils/patientCode.js` — standard `PT-XXXXX` format (5-digit zero-padded), same as staff-registered patients

### Doctor Dashboard Enhancements (Phase 5.4)
- **Now Seeing card** — live highlight of current patient (arrived status): name, code, token, time, online badge, allergies, booking reference
- **Next Up card** — first patient waiting: same info as Now Seeing
- **Online Booked stat card** — count of online-booked appointments today
- Remaining queue list below for all other waiting patients
- All online bookings show Globe icon + BK-XXXXXX reference

### Settings Toggle (admin only)
- **Settings → Security tab → Patient Portal section**
- Toggle: Enable Online Booking (ON/OFF)
- When ON: shows the shareable `/book` URL with a Copy button
- When OFF: `/book` page shows "Online Booking Unavailable" message (not an error page)
- Backend enforces: all portal routes check `patient_portal_enabled = TRUE` in clinic_settings

### Backend Routes (`/api/v1/portal/*`)
All routes are **public** (no JWT). Tenant identified via `X-Tenant-Subdomain` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portal/info` | Clinic name, phone, address, portal enabled flag |
| GET | `/portal/doctors` | Active doctors for this clinic |
| GET | `/portal/doctors/:id/slots?date=` | Available time slots for a doctor on a date |
| POST | `/portal/book` | Submit a booking → returns BK-XXXXXX |
| GET | `/portal/booking/:reference` | Look up a booking by reference |

### New Files (Phase 5.4)
| File | Type | Purpose |
|------|------|---------|
| `backend-api/src/db/migrate_portal.js` | Migration | Adds `booking_reference`, `booking_source` columns + index |
| `backend-api/src/routes/portal.routes.js` | Route | All public portal endpoints |
| `backend-api/src/utils/patientCode.js` | Utility | Shared `nextPatientCode()` — single source of truth for PT-XXXXX generation |
| `backend-api/src/utils/bookingReference.js` | Utility | Shared `nextBookingReference()` — single source of truth for BK-XXXXXX generation |
| `clinic-frontend/src/api/portal.js` | API client | Public Axios instance for booking page |
| `clinic-frontend/src/pages/booking/BookingPage.jsx` | Page | Multi-step public booking UI |
| `clinic-frontend/src/components/ui/Drawer.jsx` | Component | Right-side slide-in drawer (540px wide, body scroll lock, sticky footer) |

### Modified Files (Phase 5.4)
| File | Change |
|------|--------|
| `appointment.routes.js` | Conflict check runs for ALL types; `booking_reference` + `booking_source` in SELECT + INSERT; `pr.id AS prescription_id` + `LEFT JOIN prescriptions` added; `nextToken()` now runs for ALL types (walk-in, booked, emergency — not just walk-in) |
| `doctor.routes.js` | Slot availability: `AND appointment_time IS NOT NULL AND status != 'cancelled'`; removed `AND type = 'booked'` |
| `portal.routes.js` | `clinic_logo_url AS logo_url` in GET /info; `nextToken()` added; `token_number` in INSERT + response |
| `patient.routes.js` | Removed local `nextPatientCode` function — now uses shared `utils/patientCode.js` |
| `invoice.routes.js` | Auto-pull: removed `AND m.selling_price IS NOT NULL AND m.selling_price > 0`; added `COALESCE(m.selling_price, 0)`; `|| 0` fallback in JS |
| `index.js` | Registered `/api/v1/portal` routes |
| `SettingsPage.jsx` | Security tab: Patient Portal toggle + shareable URL + Copy button |
| `AppointmentsPage.jsx` | Globe badge + BK-XXXXXX in queue rows; Online badge → CSS variables; `canWriteRx` includes `!appt.prescription_id` guard |
| `DoctorDashboard.jsx` | Now Seeing + Next Up cards + Online Booked stat card + Globe badge |
| `App.jsx` | `/book` route (public, no ProtectedRoute) |
| `AppointmentModal.jsx` | **Complete rewrite**: Modal → Drawer (540px); time slot grid for walk-in (optional) + booked (required); BK-XXXXXX toast |
| `ConsultationModal.jsx` | **Full rewrite**: combined consultation + prescription in one modal; `MedicineRow` sub-component; `FOOD_PRESETS`; custom medicine detection; `getFilledRxItems()` + `validateRx()`; Chief Complaint moved to top of form |
| `InvoiceModal.jsx` | Add Item replaced with `AddItemModal` (3-tab overlay: Service / Medicine / Custom); auto-pull fixed; LEFT JOIN + COALESCE for custom medicines |
| `PrescriptionModal.jsx` | `calcQuantity()` auto-calc; `quantity_given` field; `FOOD_PRESETS` chips; custom medicine support (`custom_medicine_name`); validation updated |
| `prescription.routes.js` | Validation: `medicine_id \|\| custom_medicine_name?.trim()`; INSERT includes `custom_medicine_name`; all GET queries: LEFT JOIN + COALESCE |
| `createTenantSchema.js` | `prescription_items`: `medicine_id` nullable; `custom_medicine_name VARCHAR(255)` added |
| `migrate_custom_medicine.js` (NEW) | One-time migration: drops NOT NULL from `medicine_id`, adds `custom_medicine_name` to all tenant schemas |
| `BookingPage.jsx` | **Full rewrite**: CSS variables, `useTheme`, `mediaUrl` logo, sticky header, dark mode toggle, mobile slot grid, taken slots as `<div>`, Available/Taken legend |

---

---

## Phase 5.5 — Queue Display / Waiting Room TV Screen

### Overview
A public full-screen TV display at `/display` — no login required. Shows each active doctor's current patient and queue in a dark-themed, auto-adjusting grid. Designed to be opened on a waiting room monitor or TV. Auto-refreshes every 30 seconds. Gated by `queue_display_enabled` in clinic_settings.

### How it works

```
Admin enables "Queue Display" toggle in Settings → Security
      ↓
Copy the /display URL and open it on a waiting room TV (any browser, no login)
      ↓
TV shows: Clinic logo + name + live clock in header
          Per-doctor cards (auto-grid based on doctor count)
          Each card: doctor name, specialization, status badge
          Now Seeing: large token number (red=emergency) + patient first name
          Next Up: up to 5 token chips
          Footer: online/offline + 30s countdown + manual refresh + fullscreen toggle
      ↓
Page auto-refreshes every 30 seconds (no interaction needed)
```

### Grid Layout
| # Doctors | Layout |
|-----------|--------|
| 1 | Full-width single column |
| 2 | 2 columns side by side |
| 3 | 3 columns |
| 4 | 2×2 grid |
| 5+ | 3-column wrap |

### Privacy
- Patients shown by **first name only** — suitable for a public display
- No patient codes, phone numbers, or full names shown

### Feature Toggle
- **Settings → Security tab → Waiting Room Display section**
- Toggle: Enable Queue Display Screen (ON/OFF)
- When ON: shows shareable `/display` URL + Copy button + Open button
- When OFF: `/display` returns 403 ("Queue display is not enabled for this clinic")

### Backend Route (`GET /api/v1/portal/queue-display`)
Public route (no JWT). Returns:
```json
{
  "clinic": { "name": "...", "logo_url": "...", "phone": "..." },
  "doctors": [
    {
      "id": "...",
      "name": "Dr. Saman Perera",
      "specialization": "General Practice",
      "now_seeing": { "token": 3, "first_name": "Kasun", "type": "normal", "time": "09:30" },
      "next_up": [{ "token": 4, "type": "normal" }, ...],
      "waiting_count": 5,
      "completed_today": 2
    }
  ],
  "generated_at": "2026-04-18T09:45:00.000Z"
}
```

### New Files (Phase 5.5)
| File | Type | Purpose |
|------|------|---------|
| `backend-api/src/db/migrate_queue_display.js` | Migration | Adds `queue_display_enabled BOOLEAN DEFAULT FALSE` to all tenant `clinic_settings` |
| `clinic-frontend/src/pages/display/DisplayPage.jsx` | Page | TV waiting room display — dark theme, auto-adjusting grid, real-time clock |

### Modified Files (Phase 5.5)
| File | Change |
|------|--------|
| `portal.routes.js` | Added `GET /portal/queue-display` public route |
| `settings.routes.js` | Added `queue_display_enabled` to `PUT /settings` — destructuring + UPDATE query |
| `SettingsPage.jsx` | Security tab: Queue Display toggle + shareable URL + Copy + Open buttons |
| `App.jsx` | `/display` route (public, no ProtectedRoute) |

---

## Phase 4 — Super Admin Panel

**App:** `admin-frontend` (runs on port 5174) + `backend-api`

### UI Design System (matches clinic-frontend exactly)
- All components use **CSS variables** (`var(--color-primary)` etc.) — never raw Tailwind colors
- **Dark / light mode** — `ThemeContext` toggles `.dark` on `<html>`, CSS vars overridden under `.dark {}` in `variables.css`, persisted to `localStorage('admin-theme')`
- **Sidebar** — `bg-[var(--color-surface)]` (white/dark), `border-r`, collapsible (240px ↔ 64px), active nav: `bg-[var(--color-primary-light)] text-[var(--color-primary)]`, state persisted in `localStorage('admin-sidebar-collapsed')`
- **TopBar** — fixed, live clock (seconds), dark/light `<Sun>/<Moon>` toggle, logout — all with `border-l` separators, identical to clinic-frontend TopBar
- **Modals** — use **Radix Dialog** (`@radix-ui/react-dialog`) with `Dialog.Overlay` — correct dark backdrop overlay, same as clinic-frontend
- **Typography** — Inter font via `@fontsource/inter`, same as clinic-frontend
- `clsx` used for all conditional class merging

### Super Admin Login
- Separate login page at `http://localhost:5174/login`
- Credentials stored in `backend-api/.env`: `ADMIN_EMAIL` + `ADMIN_PASSWORD`
- Issues JWT with `role: 'superadmin'`, verified by `adminAuth.js` middleware
- Separate `ADMIN_JWT_SECRET` (falls back to `JWT_SECRET` if not set)

### Dashboard
- Stat cards: Total Clinics, Active, Suspended (clickable → filtered clinic list)
- Recent clinics list (last 8) → click to open clinic detail
- **Platform Settings card** — landing page enable/disable toggle switch (saves instantly)
- **No trial/plan system** — access managed entirely via feature flags
- Refresh button with loading state

### Platform Settings (`/platform-settings`)
- **Company Info tab** — company name, tagline, registration/business number
- **Contact Details tab** — support email, sales email, primary phone, WhatsApp number, address (line 1, line 2, city, country). Live Preview card shows how it renders on website and subscription page.
- **Payment Details tab** — bank name, account holder name, account number, branch, SWIFT/branch code, payment instructions textarea. Live Preview card shows bank transfer block.
- **System tab** — landing page enable/disable toggle
- **Save Changes** button saves **all tabs at once** in one batch request — no need to switch tabs before saving
- Data from Contact + Payment tabs appears automatically on:
  - `healthcenter.lk` landing page — contact strip (phone, email, address) + footer brand name
  - Clinic admin **Subscription page** — "Contact & Support" card + "Payment Details" card
- Backend: `PUT /api/v1/admin/platform/batch` (bulk upsert), `GET /api/v1/admin/platform` (load all), `GET /api/v1/public/platform-info` (public, used by landing + subscription page)

### Clinic List (`/clinics`)
- Search by name, subdomain, or email (debounced 300ms, X clear button)
- Filter tabs: All / Active / Suspended
- Columns: clinic name, subdomain, owner email, status badge, created date, active flags count
- `EmptyState` component shown when no results, with context-aware actions
- Click row → Clinic Detail

### Create New Clinic
- Form: clinic name (auto-generates subdomain slug), subdomain, owner email, owner phone, **initial admin password**
- On save: inserts `public.tenants` (status = 'active') + default feature flags (all OFF) + creates full tenant schema + inserts `clinic_settings` + **creates first admin staff account** using `owner_email` + hashed password
- After save: modal shows a **Credentials screen** — Login URL, Email, Password — each with a Copy button
- Warning shown: "password is not stored in plain text — save or send now"

### Clinic Detail (`/clinics/:id`)
- Stats: staff count, patient count (queried live from tenant schema), modules enabled count
- Edit modal: name, email, phone (no plan/trial fields); uses `footer` prop on Modal for button placement
- Suspended banner shown when clinic is suspended
- **Suspend** button → `ConfirmDialog` → locks all staff out immediately (tenant middleware blocks `status = 'suspended'`)
- **Activate** button → `ConfirmDialog` → restores access
- **Login as Clinic** — generates a 2h clinic-scoped JWT, opens `VITE_CLINIC_URL/impersonate?token=...` in new tab; disabled when clinic is suspended; URL controlled by `VITE_CLINIC_URL` env var

### Feature Flags
- Live toggle switches per module: pharmacy, lab, insurance, online_booking, multi_branch, custom_domain
- Toggle uses CSS variable `bg-[var(--color-primary)]` (active) / `bg-[var(--color-border)]` (off) — works in dark mode
- Toggle saves instantly via `PUT /api/v1/admin/feature-flags/:tenantId`
- Changes take effect on next clinic staff request (no restart needed)
- Count shows "X of 6 modules enabled" in card subtitle

### Subscription Management

**Plans Page (`/plans`)**
- Create / edit / soft-deactivate subscription plans
- Each plan has: name, billing_cycle (monthly | yearly), price (stored in monthly_price or yearly_price column)
- Soft-delete sets `is_active = FALSE` — plan is hidden from pickers but existing subscriptions retain the reference
- Default plans: Basic (monthly, LKR 10,000) and Standard (yearly, LKR 50,000)

**Subscriptions Page (`/subscriptions`)**
- Overview table of all clinics with their current plan, billing cycle, start/end dates, and days remaining
- Days remaining colour-coded: green (> 7d), amber (0–7d / expiring today), red (expired)
- "Set Plan" modal: choose plan + start date → backend calculates end date based on billing_cycle
- "Renew" button: extends subscription from the current end date (or today if expired)

**Clinic Detail — Subscription card**
- Shows current plan name, cycle, start/end dates, days remaining badge
- "Set Plan" button to assign or change plan
- "Renew" button to extend

**Auto-suspend (tenant middleware)**
- On every clinic API request, `tenant.js` middleware checks: if `status = 'active'` AND `subscription_end < today`, it runs `UPDATE public.tenants SET status = 'suspended'` and returns 403 with "Your subscription has expired. Please contact your administrator to renew."
- Suspension is immediate — no grace period

**Clinic Admin Subscription Page (`/subscription`)**
- Admin role only (hidden from other roles in Sidebar)
- Shows: plan name, billing cycle, start date, end date, days remaining
- Status widget: green banner (active, > 7d), amber banner (expiring soon ≤ 7d / today), red banner (expired)
- Read-only — clinic admin cannot change their own plan

---

## Deferred Items

| Item | Status |
|------|--------|
| Dashboard stat cards wired to real API data | ✅ Done (Phase 2.0) |
| Server-side PDF generation (invoice + prescription) | ✅ Done (Phase 3) |
| Doctor signature upload | ✅ Done (Phase 2.7) |
| Clinic logo on print / PDF | ✅ Done (Phase 3) |
| Super admin feature flag toggles | ✅ Done (Phase 4) |
| Low stock / near-expiry alert badges on dashboard | ✅ Done — Low Stock stat card on Admin + Receptionist dashboards; alert border when count > 0; click navigates to /medicines (2026-04-18) |
| Stock auto-deduct on dispensing | ✅ Done — pharmacy dispense endpoint deducts stock |
| Expiry alert notifications | Phase 6 (remaining) |
| Online patient booking | ✅ Done (Phase 5.4) |
| Nurse vitals workflow | ✅ Done (2026-04-22) — patient_vitals table, VitalsModal, nurse sees Appointments page, doctor ConsultationModal pre-populated |
| Mobile/tablet responsive | ✅ Done (2026-04-22) — useIsMobile, sidebar overlay, all tables overflow-x-auto, QueueRow responsive actions |
| Help & User Guide page | ✅ Done (2026-04-22) — /help page all roles + /guide.html on landing page |
| Appointment SMS/WhatsApp reminders | Phase 6 (remaining) |
| Scheduled monthly email report | Phase 6 (remaining) |
| Reports PDF export | Phase 6 (remaining) |
| Super admin system health (CPU/memory/uptime) | Phase 6 (remaining) |
| Super admin audit log viewer | Phase 6 (remaining) |
| Super admin trial management UI | ✅ Replaced with subscription plan management (PlansPage + SubscriptionsPage + ClinicDetailPage subscription card) — 2026-04-20 |
| Subscription billing management | ✅ Done (2026-04-20) — subscription_plans table, plan CRUD, assign/renew per clinic, auto-suspend, clinic admin view |
| Live data without manual refresh (polling) | ✅ Done (2026-04-22) — 30s polling on all dashboards + appointments; 10s on display TV |
| Landing page for healthcenter.lk | ✅ Done (2026-04-22) — `landing-frontend/index.html`, public API endpoint, super admin toggle |
| healthcenter.lk root domain redirect | ✅ Done (2026-04-22) — dedicated nginx block for apex domain → landing page |
| New clinic schema completeness | ✅ Done (2026-04-22) — `createTenantSchema.js` now includes all addon tables; `migrate_fix_new_clinics.js` patched existing schemas |
| Basic plan auto-suspension (Date bug) | ✅ Done (2026-04-22) — `new Date(val).toISOString()` used everywhere for date comparisons |
| Logo not displaying in production | ✅ Done (2026-04-22) — `mediaUrl.js` now uses `window.location.origin` |
| Logo update not visible across browsers (caching) | ✅ Done (2026-04-24) — `settings.routes.js` now generates `logo_${Date.now()}.ext` (unique URL per upload) and deletes old file after DB update. See Bug #14. |
| Currency resets to LKR on session restore | ✅ Done (2026-04-24) — `AuthContext.jsx` background refresh used wrong field `currency_code`; fixed to `currency`. See Bug #15. |
| Nginx "conflicting server_name" warning | ✅ Done (2026-04-24) — Removed `healthcenter.lk` from port-80 wildcard block in `clinicpos-clinic` nginx config (root domain handled by dedicated block). |
| PM2 auto-start on server reboot | ✅ Done (2026-04-24) — `pm2 startup` registered `pm2-deploy.service` in systemd; `pm2 save` persists the process list. API now survives server reboots without manual intervention. |
| Landing navbar mobile menu (slide drawer) | ✅ Done (2026-04-25) — `Navbar.jsx` rewritten. Left-side `w-72` drawer with `translate-x` CSS transition. Backdrop overlay. Body scroll locked while open. Hamburger always visible (primary-colored icon). |
| Booking QR Code Card — print-ready download | ✅ Done (2026-04-25) — `qrcode.react` installed in `clinic-frontend`. `SettingsPage.jsx` Security tab shows live QR + Download button. Canvas draws branded card. Solves patient discoverability of online booking URL. |
| Session timeout enforcement (backend) | Phase 6 — UI setting exists but JWT expiry not yet driven by it |
| `patient_portal_enabled` setting UI | ✅ Done (Phase 5.4) — toggle in Settings → Security tab |
| Invoice auto-pull missing medicines | ✅ Fixed (2026-04-17) — `COALESCE(m.selling_price, 0)` includes all medicines |
| Prescription qty auto-calculation | ✅ Done (2026-04-17) — `quantity_given` auto-fills from dosage × frequency × duration |
| Double-booking same slot (any type) | ✅ Fixed (2026-04-17) — conflict check runs for all appointment types with a time |
| Taken slots visually disabled in grid | ✅ Fixed (2026-04-17) — `doctor.routes.js` now blocks all types; frontend renders as non-interactive div |
| Booking portal dark/light mode + UI | ✅ Done (2026-04-17) — `BookingPage.jsx` full rewrite with CSS variables + `useTheme` |
| Consult + Rx in one step | ✅ Done (2026-04-17) — `ConsultationModal.jsx` combined; medicines optional in same form |
| Custom medicine names (not in store) | ✅ Done (2026-04-17) — `custom_medicine_name` column; nullable `medicine_id`; migration run |
| Food instruction quick-chips | ✅ Done (2026-04-17) — Before food / After food / With food / At bedtime chips in both modals |
| Token for all booking types | ✅ Fixed (2026-04-17) — `nextToken()` runs for walk-in, booked, and emergency alike |
| Write Rx button hidden after Rx saved | ✅ Fixed (2026-04-17) — `prescription_id` in appointment list query; `canWriteRx` guards it |
| Online badge hardcoded colors | ✅ Fixed (2026-04-17) — CSS variables used; works in dark mode |
| Stock auto-deduct on Rx save | Deferred — not implemented; stock only deducts via Pharmacy dispense flow |
| `duplicate_check_enabled` setting | Phase 6 — DB column exists; backend does not read/write it; no UI |
| Calendar view (day/week) for appointments | Deferred — queue view covers the need |
| Lab result notification to patient (SMS) | Phase 6 (remaining) — results saved but no notification sent yet |
| Insurance / corporate billing (5.3) | ✅ Done (Phase 5.3) |

---

*workflow.md — Doctor POS*
*Update at the end of every phase. Keep in sync with ongoingworking.md.*
