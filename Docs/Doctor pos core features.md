# Doctor POS — Core Features

> **Stack:** React · Node.js · PostgreSQL  
> **Projects:** `clinic-frontend/` · `backend-api/` · `admin-frontend/`

---

## — Staff Management 👥 *(Admin Only)*

### Purpose
The clinic admin (owner) creates and manages all staff accounts from within the clinic panel. No outside help needed.

### Supported Roles
| Role | Access |
|------|--------|
| `admin` | Full access to everything including staff management |
| `doctor` | Consultations, prescriptions, lab, own queue |
| `nurse` | View patients, lab results, prescriptions |
| `receptionist` | Queue, billing, pharmacy, patient registration |

### What the Admin Can Do
- **Add Staff** — create any role with full name, email, password, phone, specialization, registration number
- **Multiple doctors** — no limit on how many doctors a clinic can have
- **Edit** — update name, email, phone, specialization, registration number, or role
- **Reset Password** — set a new password for any staff member
- **Deactivate / Activate** — deactivated staff cannot log in; record is preserved
- **Data isolation** — all staff belong to this clinic's schema only; other clinics are invisible
- **Search & filter** — search by name/email/phone; filter by role (Doctor/Nurse/Receptionist) using pill tabs; filter by status (Active/Inactive) using pill tabs; count shows "X of Y staff members" when filtered

### How Clinic Gets Set Up (SaaS Onboarding)
1. Super admin creates the clinic from `admin.clinicpos.com`
2. System auto-creates the first `admin` staff account with the email + password entered
3. Super admin copies the credentials (URL, email, password) and sends to the clinic owner
4. Clinic owner logs in → goes to **Staff** → creates their doctors, nurses, and receptionists
5. Each staff member logs in with their own email + password

---

## 0. Role-Based Dashboards 🖥️

### Purpose
The first screen after login is different for every role. Each staff member sees only what is relevant to them — no clutter, no confusion.

### Doctor Dashboard
- Today's patient queue — token number, patient name, status, time
- One-click to open next patient's consultation
- Glance at patient's last visit complaint and allergies before entering the room
- Own appointment count for today vs completed
- Quick link to prescription pad

### Receptionist Dashboard
- Live queue across all doctors — who is waiting, who arrived, who is being seen
- Today's totals — patients registered, appointments booked, amount collected, amount pending
- Quick register button (new patient) and quick search (returning patient)
- Low stock and near-expiry medicine alerts (badge)
- Unpaid invoices count

### Admin / Owner Dashboard
- Today's revenue — collected vs pending vs total billed
- Patient count today (walk-in vs booked, new vs returning)
- Doctor-wise patient count for today
- Outstanding payments list
- Medicine stock alerts
- End of day closing status (done / not done)

### Who Sees What
| Role | Home Screen Shows |
|------|------------------|
| Doctor | Own queue, next patient, quick Rx access |
| Receptionist | Live queue all doctors, billing summary, alerts |
| Nurse | Today's patients needing vitals, pending vitals |
| Admin / Owner | Revenue, patient count, alerts, EOD status |

---

## 1. Patient Registration 👤

### Purpose
Every patient is registered once. All future visits, prescriptions, bills, and records link back to this single profile automatically.

### Key Data Captured

| Field | Details |
|-------|---------|
| Full name | First + last name |
| Date of birth | Auto-calculates age |
| Gender | Male / Female / Other |
| Contact number | Primary phone |
| Address | City, street |
| Blood group | A+ / B+ / O+ etc. |
| Allergies | Free text, flags on all screens |
| Emergency contact | Name + phone |
| National ID | For identity verification |
| Insurance info | Provider + policy number (optional) |

### Features
- Auto-generate unique **Patient ID** (e.g. `PT-00234`) on registration
- Search patients by name, phone, or patient ID
- Mark patients as **walk-in** or **pre-registered**
- Patient profile shows full history — visits, prescriptions, bills, records all in one place
- **Data privacy protected** — staff only see what their role allows

### Returning vs New Patient Flow
Every visit starts with one question — has this patient been here before?

**Returning patient (most common):**
- Receptionist types phone number or name → system finds them instantly
- One click → patient added to queue
- No re-entering of details ever

**New patient:**
- Receptionist fills registration form
- System auto-checks for **duplicate patients** before saving — warns if same phone, name, or national ID already exists
- Patient registered → immediately added to queue

### Duplicate Patient Prevention
When registering a new patient, the system checks:
- Same phone number
- Same full name + date of birth
- Same national ID

If a match is found — system shows a warning with the existing patient's details and asks "Is this the same person?" Receptionist can confirm existing or proceed with new registration.

### Who Can Access
| Role | Can Do |
|------|--------|
| Receptionist | Register, edit, search patients |
| Doctor | View patient profile, cannot delete |
| Nurse | View and update basic info |
| Admin | Full access including delete |

---

## 2. Doctor Appointments 📅

### Purpose
Manage both walk-in and pre-booked appointments. Patients can also book online themselves through a patient portal.

### Features

#### Clinic-side (staff)
- View appointments in **calendar view** (day / week / month)
- Assign appointments to specific doctors
- Set each doctor's **available time slots** and working hours
- Mark appointment status — Pending, Confirmed, Arrived, Completed, Cancelled
- Live **queue display** — shows waiting patients with token numbers
- Walk-in patients added directly to the queue
- **Emergency patient** — insert into queue immediately regardless of token order, flagged as emergency
- **Clinic holidays** — admin sets off-days, booking is blocked on those dates automatically
- **Appointment reminders** — system automatically sends SMS or WhatsApp to patient 24 hours before (configurable). Reduces no-shows significantly

#### Patient-side (online booking)
- Patients visit your clinic's booking page
- Select a **doctor** from the list
- View **available time slots** in real time
- Book an appointment and receive SMS / email confirmation
- View and cancel their own upcoming appointments
- View **previous visit history** and dates

#### Doctor management
- **Multiple doctors** can exist in one clinic system
- Each doctor has their own schedule, appointments, and patient list
- Admin can add or remove doctors and set their specializations
- Reports show performance per doctor (patient count, revenue)

### Who Can Access
| Role | Can Do |
|------|--------|
| Receptionist | Create, edit, cancel appointments |
| Doctor | View own appointments only |
| Patient (online) | Book, view, cancel own appointments |
| Admin | Full access across all doctors |

---

## 3. Medical Records 🩺

### Purpose
Every clinic visit creates a digital record. Doctors write notes, record diagnoses, and attach lab results. All linked to the patient profile permanently.

### What Each Visit Record Contains

| Field | Details |
|-------|---------|
| Visit date & time | Auto-recorded |
| Attending doctor | Linked to doctor profile |
| Chief complaint | Why the patient came in |
| Symptoms | Free text or checklist |
| Diagnosis | With ICD-10 code support |
| Clinical notes | Doctor's observations |
| Vital signs | Blood pressure, temperature, weight, pulse |
| Lab results | Uploaded files or typed results |
| Follow-up date | Next appointment reminder |

### Features
- Full **visit history** — all past records viewable in one timeline
- Doctor can see **previous visits** before starting a new consultation
- Attach files — lab reports, X-rays, scans (PDF, JPG)
- Records are **read-only** after 24 hours (audit protection)
- **Patient data is private** — only the treating doctor and admin can view full records
- Receptionist sees only appointment info, not clinical notes
- **ConsultationsPage — detail modal**: click any row → modal opens with full vitals, diagnosis, clinical notes, follow-up date — no page navigation away from the list
- **Doctor filter tabs** (border-b underline style) — only shown when multiple doctors in the day's list; click to filter by doctor
- **Follow-up filter pill** — toggle to show only consultations that have a follow-up date set
- **Search bar** — filters by patient name, chief complaint, or diagnosis; count shows "X of Y consultations" when filtered

### Data Privacy Rules
- Medical records are encrypted in the database
- Access logged with timestamp and staff ID (audit trail)
- No record can be permanently deleted — only archived
- Complies with patient data privacy standards (HIPAA-like approach)

### Who Can Access
| Role | Can Do |
|------|--------|
| Doctor | Create, view, edit (within 24hr) |
| Nurse | View and add vitals only |
| Receptionist | View appointment info only — no clinical notes |
| Admin | View all records, manage access |
| Patient (online) | View their own records only |

---

## 4. Prescriptions 💊

### Purpose
Doctors write digital prescriptions linked to each visit. Prescriptions can be printed, downloaded as PDF, or sent to the patient digitally.

### Features

#### Writing a prescription (combined with consultation — one step)
- Prescription is written in the **same modal** as the consultation — doctor fills clinical notes + medicines in one step and saves once
- Doctor types a medicine name → searches the **medicine database** live (dropdown with stock + price shown)
- If a medicine is not in the database, doctor can type the name freely — saved as a **custom medicine** (not linked to inventory)
- Set dosage, frequency, duration, and instructions per medicine
- **Quick-select chips** for common dosage (1 tablet, 2 tablets, 5 ml...), frequency (Once daily, Twice daily...), duration (3 days, 7 days, 1 month...)
- **Food instruction chips**: Before food · After food · With food · At bedtime — one click sets the instructions field
- **Quantity auto-calculated**: `doses_per_day × units_per_dose × duration_days` — shown in a "Qty to Dispense (auto)" field. Editable override allowed. Used for invoice qty and pharmacy dispense.
- Multiple medicine rows per prescription — add / remove rows as needed
- Medicines section is **optional** — if no medicines added, only the consultation is saved
- Prescription auto-links to the patient's visit record via `consultation_id`

#### Medicine database (built-in store)
- Admin can add medicines like a **medicine store inventory**
- Each medicine has: name, generic name, brand, unit (tablet/syrup/capsule), strength
- Medicines available in the prescription writer come from this database
- Stock quantity tracked — alerts when a medicine is running low
- Medicines dispensed through pharmacy are auto-deducted from stock
- Can set selling price per medicine for billing integration

#### Prescription output
- Generate a **printable Rx** with clinic header, doctor name, registration number, and **doctor's digital signature**
- Download as **PDF**
- Send to patient via **SMS or WhatsApp** (medicine name, dose, instructions)
- Prescription has a unique **Rx number** for reference
- **Patient visit summary printout** — separate from the prescription, one page showing: diagnosis, medicines prescribed, vitals, follow-up date. Patient takes this home as a summary of their visit

#### PrescriptionsPage list view
- Date navigation bar to browse any day's prescriptions
- **Doctor filter tabs** (border-b underline style) — only shown when multiple doctors in the loaded list; click filters the list to that doctor
- **Search bar** — filters by patient name or Rx number; count shows "X of Y prescriptions" when filtered
- Context-aware empty state with "Clear filters" action

#### Medicine Store (admin)
- Filter tabs on top row (All / Low Stock / Near Expiry / Inactive) — full-width border-b style
- **Search + count** on a separate row below the tabs — search by name, generic name, brand, or category
- X clear button to reset search instantly

#### Patient view
- Patient can see their **full medicines history** across all visits
- Shows current medications and past prescriptions in one timeline

### Who Can Access
| Role | Can Do |
|------|--------|
| Doctor | Write, edit (within visit), print prescriptions |
| Nurse | View prescriptions, assist with dispensing |
| Receptionist | Print prescription on request |
| Admin | Manage medicine database and stock |
| Patient (online) | View own prescription history |

---

## 5. Billing & Payments 💳

### Purpose
Every service the clinic provides generates an itemized invoice. The receptionist handles billing at the front desk. Billing links directly to the clinical record for that visit.

### Invoice Contents

| Item | Example |
|------|---------|
| Consultation fee | Dr. Silva — General Consultation |
| Procedure charges | Blood test, dressing, injection |
| Medicine charges | Auto-pulled from prescription |
| Lab fees | X-ray, scan, urine test |
| Discount | Manual or percentage-based |
| Tax | Configurable per clinic |
| Total due | Grand total |

### Features

#### Receptionist workflow
- Receptionist opens the patient's visit after doctor completes consultation
- Invoice is **auto-generated** from the consultation — medicines and procedures already listed
- Receptionist reviews, adjusts if needed, and confirms
- Accepts payment and prints or sends receipt

#### Payment methods supported
- Cash
- Card (manual entry or integrated terminal)
- Online / QR payment
- Insurance (mark as pending claim)
- Partial payment (record balance due)
- **Split payment** — patient can pay using more than one method in a single invoice. e.g. LKR 2000 cash + LKR 3000 insurance. Each split is recorded separately with reference numbers

#### Custom services
- Admin pre-creates a list of clinic services with prices (blood test, X-ray, dressing, ECG etc.)
- Receptionist picks from this list when building the invoice — no manual typing of amounts
- Prices auto-fill but can be overridden if needed

#### End of day closing
- At end of clinic hours, receptionist or admin runs **end of day closing**
- System shows: total billed, total collected, breakdown by payment method (cash / card / online / insurance)
- Staff enters physical cash counted from the drawer
- System highlights any **discrepancy** between counted cash and system cash total
- Closing is locked for that date once confirmed — cannot be re-opened without admin
- Owner sees closing summary the next morning in reports

#### Invoice management
- Unique invoice number per bill
- View all invoices — paid, unpaid, partial
- **Search bar** with X clear button on BillingPage — filters invoices client-side by patient name, patient code, or invoice number; count shown when filtered
- **+ Add Item** — 3-tab modal inside InvoiceModal: Service (pre-configured clinic services), Medicine (live stock search), Custom (free-text)
- **Dispense Rx** quick action inside InvoiceModal — appears when a linked prescription hasn't been dispensed yet; opens `DispenseModal` to confirm dispense (allergy warning + stock levels) without leaving the invoice
- Send invoice to patient via email or WhatsApp
- Reprint receipt at any time
- Apply discounts with reason (audit logged)

#### Billing links clinical records
- Every invoice is linked to a specific visit record
- From the invoice you can see the consultation notes and prescription
- From the patient profile you can see all invoices across all visits

### Who Can Access
| Role | Can Do |
|------|--------|
| Receptionist | Generate bills, accept payments, print receipts |
| Doctor | View billing for own patients only |
| Admin | Full billing access, refunds, adjustments |
| Patient (online) | View own invoices and payment history |

---

## 6. Reports & History 📊

### Purpose
Give clinic owners and admins a real-time view of how the clinic is performing — financially and operationally.

### Analytics Dashboard

| Metric | Details |
|--------|---------|
| Total patients today | Walk-in + booked |
| Total income today | Collected + pending |
| Appointments completed | vs cancelled vs no-show |
| New patients this month | vs returning patients |
| Top doctor by patients | Ranking by visit count |
| Top doctor by revenue | Ranking by billing amount |
| Medicine stock alerts | Low stock or near-expiry |
| Outstanding payments | Unpaid invoices total |

### Report Types

#### Financial reports
- Daily / weekly / monthly income summary
- Income breakdown by doctor, by service, by payment method
- Pending and overdue payment list
- Tax summary report
- **End of day closing report** — daily cash reconciliation, discrepancy between counted cash and system total is flagged clearly

#### Patient reports
- Total patient count (new vs returning)
- Patient demographics (age group, gender)
- Visit frequency — most frequent patients
- Patient-wise visit and billing history

#### Doctor reports
- Appointments per doctor per day/month
- Revenue generated per doctor
- Average consultation time

#### Appointment reports
- Daily appointment count
- Cancellation and no-show rate
- Peak hours analysis (busiest times of day)

#### Medicine / pharmacy reports
- Stock levels and low-stock alerts
- Medicines dispensed this month
- **Near-expiry medicines** — proactive alert badge on dashboard, not buried in a report. Shows medicines expiring within 60 days
- Most prescribed medicines

### Export options
- Download reports as **PDF** or **Excel**
- Filter by date range, doctor, or department
- Schedule automatic monthly email reports to clinic owner

### Who Can Access
| Role | Can Do |
|------|--------|
| Doctor | View own patient and appointment reports |
| Admin / Owner | Full access to all reports |
| Receptionist | View daily appointment and billing summary only |

---

## Role Summary (All Features)

| Role | Patients | Appointments | Records | Prescriptions | Billing | Reports | Pharmacy | Lab | Insurance | Portal |
|------|----------|-------------|---------|--------------|---------|---------|----------|-----|-----------|--------|
| Receptionist | Register, search | Manage all | View appt only | Print only | Generate & collect | Daily summary | Full access | Full access | Full access | View online badge |
| Doctor | View profile | Own only | Full access | Write & view | View own | Own reports | View queue only | Request & view | View claims only | Now Seeing + Next Up |
| Nurse | View & update | View only | Vitals only | View only | No access | No access | View queue only | View queue only | No access | View online badge |
| Admin / Owner | Full access | Full access | Full access | Full access | Full access | Full access | Full access | Full access | Full access | Enable/disable + view |
| Patient (public) | — | Book online (no login) | — | — | — | — | — | — | — | Full booking flow |

> **Note:** Pharmacy, Lab, and Insurance modules are only available if the clinic's respective feature flags are enabled.  
> The Patient Portal requires both `online_booking` feature flag AND `patient_portal_enabled = true` in clinic settings.  
> Even if a role is listed as having access — if the flag is off, the module is completely hidden.

---

## 7. Pharmacy Module 💊 *(Phase 5.1 — Feature Flag: `pharmacy`)*

### Purpose
Full in-clinic pharmacy management. Tracks supplier purchases, stock levels, and dispensing of medicines directly from patient prescriptions. Only available to clinics on plans with the `pharmacy` feature flag enabled.

### Who Can Access
| Role | Can Do |
|------|--------|
| Admin | Full access — all 4 tabs, purchase orders, suppliers, stock adjustments, dispense queue |
| Receptionist | Full access — same as admin for pharmacy |
| Doctor | View dispense queue only (read-only) |
| Nurse | View dispense queue only (read-only) |

### 4-Tab Layout

#### Tab 1 — Dispense Queue
- Lists all prescriptions that have medicines not yet dispensed
- Each card shows: patient name, doctor, date, list of prescribed medicines with quantity
- "Dispense" button opens **DispenseModal** — a two-step confirmation flow:
  - Red allergy warning banner (if patient has allergies on record)
  - Medicines table showing each item's stock quantity (red highlight + "LOW" label when stock ≤ 5)
  - Confirm button → deducts stock and marks prescription as dispensed
- Dispensed prescriptions move to a separate "Dispensed" section below the Pending section
- **Filter pills** (All / Pending / Dispensed) — instantly show all, only pending, or only dispensed prescriptions
- **Search bar** — filters by patient name, Rx number, or doctor; section headers show current count ("Pending Dispense (X)", "Dispensed (X)")
- Context-aware empty state with "Clear filters" action

#### Tab 2 — Stock
- Full inventory view of all medicines in the clinic pharmacy
- Shows: medicine name, category, unit, stock quantity, reorder level, selling price, expiry date
- Color-coded alerts: red = out of stock, amber = below reorder level, green = normal
- Admin/Receptionist can add new medicines to the stock list
- Stock quantities update automatically when prescriptions are dispensed or stock adjustments are made

#### Tab 3 — Purchase Orders
- Create purchase orders (POs) to record stock received from suppliers
- Each PO: supplier name, order date, status (Draft/Ordered/Received/Cancelled), line items (medicine + quantity + unit cost)
- "Mark as Received" updates stock quantities for all medicines in the PO
- View PO history with full item breakdown
- Each PO shows which staff member created it
- **Status filter pills** (All / Draft / Ordered / Received / Cancelled) + **search bar** — filter and search the PO list client-side

#### Tab 4 — Suppliers
- Manage a list of medicine suppliers/distributors
- Each supplier: name, contact person, phone, email, address, notes
- Suppliers appear in the Purchase Order creation form as a dropdown
- Add, edit, delete suppliers
- **Search bar** — filters suppliers list by name, contact person, phone, or email

### Key Backend Rules
- All pharmacy routes require `requireFeature('pharmacy')` middleware — if flag is off, API returns 403
- Stock deduction happens automatically when a prescription is dispensed (via database transaction)
- `staff.full_name` is used throughout — the staff table does NOT have `first_name`/`last_name` columns
- All data is tenant-scoped — one clinic cannot see another's pharmacy records

### Feature Flag
The `pharmacy` flag in `public.feature_flags` must be `true` for this tenant.  
Toggle via Admin Panel → Clinic Settings → Feature Flags.

---

## 8. Lab Module 🧪 *(Phase 5.2 — Feature Flag: `lab`)*

### Purpose
Manage in-clinic laboratory requests and results. Doctors order lab tests, staff enter results, and all results link back to the patient's profile permanently. Only available to clinics with the `lab` feature flag enabled.

### Who Can Access
| Role | Can Do |
|------|--------|
| Admin | Full access — request tests, enter results, manage test catalog |
| Receptionist | Full access — same as admin for lab |
| Doctor | Request tests, view results |
| Nurse | View queue and results |

### 2-Tab Layout

#### Tab 1 — Lab Queue
- Date navigation bar (previous day / today / next day) to browse any day's queue
- **Pending section**: all lab requests for the selected date that do not yet have results entered
- **Completed section**: all lab requests for the selected date that have results
- Each request card shows: patient name, test name, requested by (doctor), requested time, status badge
- **Enter Result** (staff): opens a modal to type the result value and optionally upload a result file (PDF, JPG, PNG — max 5MB)
- **View Result** (all roles): opens a modal showing the result value, reference range, and a link/preview of the uploaded file

#### Tab 2 — Test Catalog
- Full list of lab tests the clinic offers, grouped by category
- Each test: name, category, reference range, unit, price
- Admin/Receptionist can add, edit, or soft-delete tests from the catalog
- **12 common tests pre-seeded** on migration:
  - FBC (Haematology), FBS, RBS, HbA1c (Biochemistry)
  - Lipid Profile, Creatinine, LFT, TFT (Biochemistry)
  - UFR, Widal, ESR, CRP (Microbiology/Other)

### Patient Profile — Lab History Tab
- The Patient Profile page has a dedicated **"Lab"** tab (5th tab after Overview, Visits, Prescriptions, Billing)
- Shows full lab history for that patient across all visits
- Each row: test name, date, result value, reference range, file link
- PDF results open in a new browser tab
- Image results (JPG/PNG) are shown inline as a thumbnail

### File Upload Rules
- Lab result files are stored at `/uploads/tenants/{schema}/lab/{filename}`
- Max 5MB per file (larger than the general 2MB limit — lab PDFs can be bigger)
- Accepted types: PDF, JPG, PNG
- File path is saved in `lab_results.result_file_url`
- Files are served via the backend static file server

### Key Backend Rules
- All lab routes require `requireFeature('lab')` middleware — if flag is off, API returns 403
- Result upload uses `multer` with a 5MB limit and type filter
- `PUT /lab/requests/:id/result` uses upsert — entering a result a second time updates, does not duplicate
- All data is tenant-scoped

### Feature Flag
The `lab` flag in `public.feature_flags` must be `true` for this tenant.  
Toggle via Admin Panel → Clinic Settings → Feature Flags.

---

## 9. Insurance Module 🛡️ *(Phase 5.3 — Feature Flag: `insurance`)*

### Purpose
Manage insurance claims, track approval status, and handle corporate account billing. Only available to clinics with the `insurance` feature flag enabled.

### Who Can Access
| Role | Can Do |
|------|--------|
| Admin | Full access — all 3 tabs, create/update claims, manage providers, manage corporate accounts |
| Receptionist | Full access — same as admin for insurance |
| Doctor | View Claims tab only (read-only) |
| Nurse | No access |

### 3-Tab Layout

#### Tab 1 — Claims
- Stats strip: Total Claims, Pending, Submitted, Approved, Total Claimed amount
- Filter bar: status dropdown, date from, date to — updates table in real time
- Claims table: Claim #, Patient, Invoice #, Provider, Amount Claimed, Amount Approved, Status badge, Date, Update button
- **New Claim** button → New Claim Modal:
  - Type invoice number → click Lookup → system auto-resolves patient name and invoice total
  - Select insurance provider (dropdown of active providers)
  - Enter amount claimed (auto-fills from invoice total — can be adjusted)
  - Set claim date, add notes (policy number, authorization code)
  - Creates claim with auto-generated CLM-XXXXX number
- **Update Status** button per claim → Update Status Modal:
  - Change status: pending / submitted / approved / partial / rejected
  - Enter amount approved (shown when status is approved or partial)
  - Add notes (approval reference, rejection reason)
  - `submitted_at` timestamp recorded when status set to submitted
  - `resolved_at` timestamp recorded when status set to approved/partial/rejected

#### Tab 2 — Insurance Providers
- Table of all insurance companies the clinic works with
- Columns: Name, Contact Person, Phone, Email, Notes, Status (Active/Inactive)
- Admin/Receptionist: Add, Edit, soft-delete providers
- **4 providers pre-seeded** on migration: Ceylinco Life, AIA Insurance, Union Assurance, Softlogic Life

#### Tab 3 — Corporate Accounts
- Companies that have agreements with the clinic for employee healthcare
- Columns: Company, Contact, Phone, Billing Cycle (monthly/quarterly), Credit Limit, Patient Count, Status
- **Summary button** per account → opens monthly billing summary modal:
  - Month picker (defaults to current month)
  - Stats: invoice count, total billed, total unpaid
  - Table of all invoices from patients linked to that company this month
- Admin/Receptionist: Add, Edit, soft-delete accounts
- Patient profile can be linked to a corporate account via `corporate_account_id` column

### Claim Lifecycle
```
New Claim created (status: pending)
    ↓
Staff submits to insurer (status: submitted) → submitted_at recorded
    ↓
Insurer responds:
  → approved (amount_approved = full amount) → resolved_at recorded
  → partial  (amount_approved < amount claimed) → resolved_at recorded
  → rejected (no payment) → resolved_at recorded
```

### Feature Flag
The `insurance` flag in `public.feature_flags` must be `true` for this tenant.  
Toggle via Admin Panel → Clinic Settings → Feature Flags.

---

## 10. Patient Portal / Online Booking 🌐 *(Phase 5.4 — Feature Flag: `online_booking` + Settings Toggle)*

### Purpose
Allow patients to book appointments online from any device, without calling the clinic. Patients receive a unique **BK-XXXXXX** booking reference they can print or save. Staff see all online bookings in the queue with a visible "Online" badge.

### How it Works for the Patient
1. Patient opens `/book` — no login, no app download required
2. **Step 1:** Selects a doctor from the list
3. **Step 2:** Picks a date (14-day strip) → available time slots shown (already-booked slots shown as crossed out)
4. **Step 3:** Fills in name, phone number, optional date of birth and reason for visit
5. **Step 4:** Booking confirmed — large **BK-XXXXXX** reference number shown + Print/Save PDF button

### How it Works for the Clinic

#### Queue Management (all roles)
- Online booked appointments appear in the queue like any other appointment
- **Online badge** (Globe icon + "Online" label) shown on each row
- **BK-XXXXXX reference** shown in blue monospace below patient name
- All status actions work the same — Arrived, Consult, Bill

#### Doctor Dashboard (enhanced)
- **Now Seeing card** — shows current patient (arrived) with name, reference, allergies, last complaint
- **Next Up card** — shows next patient in queue with same details
- **Online Booked stat** — count of online appointments today
- Globe icon on any patient with `booked_online = true`

#### Admin — Enable/Disable
- **Settings → Security tab → Patient Portal section**
- Toggle ON → shows the shareable `/book` URL with a Copy button
- Toggle OFF → portal shows a "booking unavailable" message (no ugly error)
- URL format: `https://yourclinic.clinicpos.com/book` (or `/book` in local dev)

### Patient Auto-Registration
- System looks up patient by **phone number**
- If found → appointment linked to existing patient record (no duplicate)
- If not found → new patient record auto-created with provided name, phone, optional DOB
- Patient code auto-generated using shared utility — standard `PT-XXXXX` format (same as staff-registered patients)

### Slot Conflict Protection
- Slots already booked are shown as **crossed out** on the booking page — cannot be selected
- Server-side conflict check on submission — prevents race conditions (two patients book same slot simultaneously)
- Admin bookings also go through the same conflict check

### Booking Reference
- Format: `BK-000001` → `BK-000002` → ... (sequential, 6-digit zero-padded)
- Stored in `appointments.booking_reference`
- Globally unique per clinic — patients can look up their booking using this number
- Also stored: `booking_source = 'online'` for analytics

### Backend Endpoints
All portal routes are public (no JWT). Tenant identified via `X-Tenant-Subdomain` header.

| Endpoint | Description |
|----------|-------------|
| `GET /portal/info` | Clinic name, phone, address, portal enabled flag |
| `GET /portal/doctors` | Active doctors |
| `GET /portal/doctors/:id/slots?date=` | Available slots for a doctor on a date |
| `POST /portal/book` | Submit booking → returns BK-XXXXXX |
| `GET /portal/booking/:reference` | Look up booking by reference |

### Who Can Access
| Who | What |
|-----|------|
| Anyone (public, no login) | Use `/book` page to book appointments |
| All clinic staff | See Online badge + reference in appointment queue |
| Doctor | Enhanced dashboard with Now Seeing + Next Up |
| Admin | Enable/disable portal in Settings → Security |

### Database Changes
```
appointments table:
  + booking_reference VARCHAR(20)     — BK-000001 format
  + booking_source    VARCHAR(20)     — 'admin' (default) | 'online'
```

### Migration
```bash
cd backend-api
node src/db/migrate_portal.js
```

---

## 11. Queue Display / Waiting Room TV Screen 📺 *(Phase 5.5 — Settings Toggle: `queue_display_enabled`)*

### Purpose
Display the current patient queue on a TV or monitor in the waiting room. Patients can see their token number and whose turn it is without asking reception. No login required — just open the URL on any display.

### What Patients See
- A **dark-themed, full-screen grid** showing each active doctor's section
- **Now Seeing:** Large token number (red for emergency) + patient first name
- **Next Up:** Up to 5 token chips showing who's waiting next
- **Status badges:** In Consultation, Available, No Patients
- **Count:** How many waiting + how many completed today per doctor
- **Header:** Clinic logo + name + real-time clock (live seconds)
- **Footer:** Online/offline status + next refresh countdown

### Auto-Adjusting Grid
The screen adapts to however many doctors are active:

| # Active Doctors | Layout |
|-----------------|--------|
| 1 | Full-width single column |
| 2 | Side-by-side (2 columns) |
| 3 | 3 columns |
| 4 | 2×2 grid |
| 5 or more | 3-column wrap |

### How to Set Up
1. Admin opens **Settings → Security tab → Waiting Room Display**
2. Enable the "Queue Display Screen" toggle
3. Copy the shareable URL (or click Open to preview)
4. Open the URL on the waiting room TV / any browser
5. Press the fullscreen button (bottom-right corner) for true kiosk mode

### Features
- **Auto-refresh:** page refreshes queue data every 30 seconds automatically
- **Manual refresh:** button in footer for instant update
- **Fullscreen:** button to enter/exit browser fullscreen (no toolbar shown)
- **Online/offline:** footer shows connection status — display keeps working on cached data if internet drops briefly
- **Emergency highlighting:** emergency patients shown with red token + lightning bolt icon
- **Privacy-first:** only patient first names shown — never full name, phone, or patient code

### Admin — Enable/Disable
- **Settings → Security tab → Waiting Room Display section**
- Toggle ON → shows the shareable `/display` URL with Copy + Open buttons
- Toggle OFF → the `/display` page shows "Queue display is not enabled for this clinic" (clean message, not a crash)
- When disabled: API returns 403 — the frontend shows a retry screen with the reason

### Backend Endpoint
```
GET /api/v1/portal/queue-display   (public — no JWT required)
```
Returns:
```json
{
  "clinic": { "name": "...", "logo_url": "...", "phone": "..." },
  "doctors": [
    {
      "id": "...",
      "name": "Dr. Saman Perera",
      "specialization": "General Practice",
      "now_seeing": { "token": 3, "first_name": "Kasun", "type": "normal", "time": "09:30" },
      "next_up": [{ "token": 4, "type": "normal" }, { "token": 5, "type": "emergency" }],
      "waiting_count": 4,
      "completed_today": 7
    }
  ]
}
```

### Who Can Access
| Who | What |
|-----|------|
| Anyone (public, no login) | View the `/display` TV screen |
| Admin | Enable/disable in Settings → Security |
| Patients in waiting room | See their token number and queue position |

### Database Changes
```
clinic_settings table:
  + queue_display_enabled  BOOLEAN DEFAULT FALSE   — display on/off toggle
```

### Migration
```bash
cd backend-api
node src/db/migrate_queue_display.js
```

---

## 12. Clinic Self-Customization ⚙️

### Purpose
Each clinic that buys the software can make it look and behave like their own system — without needing you to do anything for them.

### What the Clinic Can Customize

#### Branding
- Upload their own **clinic logo** — appears on dashboard, invoices, prescriptions, patient portal
- Set clinic name, address, phone, email
- Custom **receipt header and footer** text
- Custom **prescription footer** (e.g. clinic registration number, tagline)

#### Doctors & Staff
- Add doctor profiles with **specialization**
- Upload each **doctor's digital signature** (printed on prescriptions)
- Set each **doctor's consultation fee** (auto-fills in invoices)
- Set each **doctor's working days and hours**

#### Appointments
- Set **appointment slot duration** (10 / 15 / 30 minutes)
- Set **maximum patients per day** per doctor
- Enable or disable **walk-in queue**
- Add **clinic holidays** — booking blocked on those dates
- Set **how far ahead** patients can book online

#### Billing
- Set **currency** (LKR, USD, INR etc.)
- Set **tax rate and tax label** (VAT / GST / none)
- Create **custom service list** with prices (blood test, X-ray, ECG etc.)
- Set **discount rules** (max discount %, who can apply)

#### Patient Portal
- Enable or disable **online booking**
- Set custom **booking page welcome message**
- Choose which doctors are **visible for online booking**

#### Notifications & Alerts
- Enable or disable **appointment reminders**
- Set **reminder timing** (hours before appointment)
- Customize **reminder message text**
- Set **session timeout** duration

### How Logo Upload Works
1. Clinic admin goes to Settings → Branding
2. Clicks Upload Logo → selects image (JPG/PNG, max 2MB)
3. System validates file type and size
4. File saved to `/uploads/tenants/{tenant_id}/logo.png`
5. URL saved to `clinic_settings.clinic_logo_url`
6. Logo appears on all screens, invoices, prescriptions, and patient portal immediately

Logo is stored per tenant — completely isolated from other clinics.

---

## 12. Super Admin Panel 🛠️ *(admin.clinicpos.com — your control room)*

### Purpose
You manage all clinics from one place. Clinics cannot see each other. You can create accounts, toggle features, suspend clinics, and log in as any clinic to help with support.

### Creating a New Clinic (Onboarding Flow)

1. You log into `admin.clinicpos.com`
2. Click **New Clinic** → fill in:
   - Clinic name (subdomain auto-generated from name)
   - Subdomain (e.g. `drsilva` → `drsilva.clinicpos.com`)
   - Owner email + phone
   - Plan (basic / standard / premium)
   - Trial days
   - **Initial admin password** (you set this — minimum 6 characters)
3. Click **Create Clinic** → system automatically:
   - Creates isolated database schema for the clinic
   - Creates all their tables (patients, appointments, billing, etc.)
   - Inserts default clinic settings
   - Creates the first admin staff account using the owner email + password you set
   - Sets all feature flags to OFF (you enable per plan)
4. A **Credentials screen** appears — copy and send to the clinic:
   ```
   Login URL : https://drsilva.clinicpos.com
   Email     : owner@drsilva.com
   Password  : (what you set)
   ```
   ⚠️ Password shown once — not stored in plain text after this screen.

5. Enable the modules they paid for (pharmacy, lab, insurance, etc.) via Feature Flag toggles
6. Clinic owner logs in, adds their doctors and settings, starts using it

### Other Admin Capabilities
- **Suspend** clinic — blocks all staff login immediately
- **Activate** — restores access
- **Login as clinic** — impersonate any clinic's admin account for support (shows amber "Impersonating" badge in the clinic's TopBar)
- **Feature flag toggles** — enable/disable each module per clinic plan
- **Dashboard** — total clinics, MRR, active/trial/suspended counts

---

## Key System Rules

- **Secure login** — every staff member has their own login with username and password
- **Role-based access** — staff only see what their role allows, enforced at both frontend and backend
- **Audit trail** — every action (create, edit, delete) is logged with staff ID and timestamp
- **Data isolation** — each clinic's data is completely separate from other clinics on the system
- **No permanent deletion** — records are archived, never deleted (data protection)
- **Encrypted storage** — sensitive medical and payment data is encrypted in the database
- **Session timeout** — auto logout after inactivity (configurable per clinic)
- **Offline awareness** — if internet drops, system shows a clear warning banner. No silent data loss
- **Duplicate patient check** — system warns before creating a patient that may already exist
- **Feature flags** — every add-on module is controlled by you (the seller) per clinic plan

---

*Doctor POS — Core Features v1.0*  
*Stack: React · Node.js · PostgreSQL*