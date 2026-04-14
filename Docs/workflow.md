# workflow.md — Role-Based Workflow Reference

> **Rule:** Update this file at the end of every phase.
> Describes what each role can do, the full patient journey, and how all modules connect.
> Keep this in sync with `ongoingworking.md` and `Plan.md`.

---

## Last updated: 2026-04-14
## Covers: Phases 1 through 3 (all modules complete, dashboards live)

---

## The Core Patient Journey

```
Patient registered
      ↓
Appointment booked (walk-in or booked slot)
      ↓
Patient marked as Arrived
      ↓
Doctor writes Consultation (vitals + diagnosis + notes)
      ↓         ← appointment auto-flips to "completed"
Doctor writes Prescription (medicine search + dosage + print)
      ↓
Receptionist clicks "Bill" → Invoice auto-created (doctor fee + medicines)
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

**Sidebar access:** Dashboard · Patients · Appointments · Prescriptions

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

#### Queue Management
- Opens Appointments page each morning — today's date loaded by default
- Date navigation (prev/next arrows, date picker, back-to-today button)
- Doctor filter tabs appear automatically when multiple doctors are in the queue
- **Add to Queue** — opens AppointmentModal with three modes:
  - **Walk-in** — token number auto-assigned, time slot optional
  - **Book** — date + doctor + time slot grid (blocked on holidays / no schedule)
  - **Emergency** — bypasses slot, jumps to top of queue with red badge
- Inside the modal: "Search Existing" tab (phone lookup) or "New Patient" tab (inline mini registration)
- Status action buttons per queue row:
  - `Pending / Confirmed` → **Arrived**, **Cancel**
  - `Arrived` → **Complete**, **Cancel**
  - `Completed / Cancelled` → no actions

#### Prescriptions
- Views all prescriptions written on any date via the Prescriptions page
- Date navigation to browse past days
- Print button per row — opens browser print window with clinic header, patient info, medicines table

#### Patient Profile
- Full profile view — personal details, contact, emergency contact, insurance
- **Edit** patient details (receptionist + admin)
- Visits tab — read-only consultation history
- Prescriptions tab — read-only Rx history
- Billing tab — full invoice history with summary totals ✅

#### Billing
- **Bill button** appears on completed appointment rows (receptionist + admin, when consultation exists)
- Clicking Bill → checks if invoice already exists for that consultation
  - If yes → opens the existing invoice
  - If no → creates new invoice (auto-pulls doctor fee from `doctor_fees` + prescribed medicines with prices)
- **InvoiceModal** — view and manage the invoice:
  - Line items table (consultation fee, medicines, custom services)
  - **Add Item** — free-text or pick from custom services dropdown, set qty + price
  - **Remove Item** — trash icon per row (blocked on paid invoices)
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

**Cannot do:** Write consultations · Write prescriptions · Access Medicine Store · Delete patients

---

### Doctor

**Sidebar access:** Dashboard · Patients · Appointments · Consultations · Prescriptions

#### Dashboard
- Greeting with doctor's name (morning/afternoon/evening)
- Stat cards: Total Today, Waiting, Arrived, Completed — filtered to this doctor
- Today's queue list (token, patient name+code, time, status) — click row → Appointments page

#### Queue View
- Sees today's appointments, can filter to own name via doctor tab
- Cannot add to queue or change appointment status
- **Consult button** appears on a row when status = `arrived` (doctor + admin only)
- **Write Rx button** appears on a row when status = `completed` (doctor + admin only)

#### Writing a Consultation
- Click **Consult** on an arrived appointment → ConsultationModal opens
- Top bar shows patient name, code, age, allergies alert (red banner if allergies on record)
- **Vitals** — BP systolic/diastolic, pulse (bpm), temperature (°C), weight (kg)
- **Clinical** — chief complaint (required), symptoms, diagnosis, ICD-10 code, doctor notes
- **Follow-up** date picker
- Save → appointment auto-flips to `completed` · consultation stored in patient record

#### Writing a Prescription
- Click **Write Rx** on a completed appointment → PrescriptionModal opens
- Patient info + allergies shown at top
- Search medicines by typing 3+ letters → live dropdown suggestions (debounced 300ms)
- Select a medicine → name, strength, unit auto-filled into the row
- Per row: **dosage** (preset chips: 250mg / 500mg / 1g / 5ml / 10ml + free text)
- Per row: **frequency** (preset chips: Once daily / Twice daily / Three times daily / Four times daily / As needed + free text)
- Per row: **duration** (preset chips: 3 days / 5 days / 7 days / 10 days / 14 days / 1 month + free text)
- Per row: instructions (free text — "After meals", "At night", etc.)
- Add more rows / remove rows as needed
- Save → Rx number auto-generated (RX-00001 format) · success banner shown · Print button activates
- **Print** → browser print window: clinic header, patient info, allergies, medicines table, doctor signature block

#### Consultations Page
- Browse all consultations by date (date navigation)
- Shows patient name, code, chief complaint, diagnosis per row
- Click any row → navigates to that patient's full profile

#### Patient Profile
- Full read access to all tabs
- Cannot edit patient details (read-only for doctor)
- Cannot delete patients

**Cannot do:** Add to queue · Change appointment status · Access Medicine Store · Edit/register patients

---

### Nurse

**Sidebar access:** Dashboard · Patients · Appointments · Prescriptions

#### Dashboard
- Stat cards: With Doctor (arrived), Waiting, Completed
- Full list of all patients in clinic today (all statuses) with token, name, doctor, time, status
- Click patient row → navigates to patient profile

#### What Nurses Can Do
- Browse patient list and open patient profiles (read-only)
- View all tabs on patient profile — overview, visits, prescriptions, billing
- View prescriptions by date on the Prescriptions page
- Print prescriptions from the Prescriptions page

**Cannot do:** Register or edit patients · Add to queue · Write consultations · Write prescriptions · Access Medicine Store

---

### Admin

**Sidebar access:** Dashboard · Patients · Appointments · Consultations · Prescriptions · Medicine Store · Billing · Reports · Settings

#### Dashboard
- Stat cards: Total Billed, Collected, Patients Today, EOD Status — all from today's report
- Monthly revenue bar chart (billed vs collected per day)
- Doctor performance table (consultations, patients, revenue per doctor) for today
- Appointment summary strip (Total / Waiting / Arrived / Completed / Cancelled)
- Quick link → Full Reports page

**Admin has all receptionist + doctor capabilities, plus:**

#### Medicine Store
- **All Medicines tab** — full inventory list with search bar
  - Each row: name, generic name, strength, unit, category, stock quantity (red if low), selling price, expiry date, status badge
  - Status badges: In Stock · Low Stock · Expiring · Expired · Inactive
  - Edit (pencil) → opens edit modal with all fields pre-filled
  - Remove (trash) → soft delete — medicine deactivated, removed from prescription search, stays in historical records
- **Low Stock tab** — medicines at or below their reorder level, highlighted in red
- **Near Expiry tab** — medicines expiring within 60 days, highlighted in amber
- **Add Medicine** — name (required), generic name, brand, unit (required), strength, category, selling price, stock quantity, reorder level, expiry date

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
  - **Appointments** — slot duration (10/15/20/30/45/60 min), max patients/day, walk-in toggle
  - **Notifications** — reminder toggle, hours before, message template (Phase 5 sends SMS)
  - **Security** — session timeout duration
  - **Doctor Fees** — inline edit fee label + amount per doctor; auto-applied to new invoices
  - **Custom Services** — add/edit/remove services (name, category, price); appear in InvoiceModal item picker

**Cannot do:** Nothing is blocked for admin within current phases

---

## Data Connections

```
Patient (PT-XXXXX)
 ├── Appointments
 │    ├── status: pending → confirmed → arrived → completed → cancelled
 │    └── Consultation (one per appointment)
 │         ├── vitals: BP, pulse, temp, weight
 │         ├── diagnosis + ICD-10 code
 │         └── Prescription (one per consultation)
 │              └── Prescription Items (many)
 │                   └── each item → Medicine (in Medicine Store)
 └── Patient Profile
      ├── Overview tab    — personal / contact / emergency / insurance
      ├── Visits tab      — all consultations with vitals + diagnosis
      ├── Prescriptions tab — all Rx with every medicine item listed
      └── Billing tab     — invoice history, summary totals, view invoice modal ✅
```

---

## Access Control Summary

| Action | Receptionist | Doctor | Nurse | Admin |
|--------|:-----------:|:------:|:-----:|:-----:|
| Register patient | ✅ | ✗ | ✗ | ✅ |
| Edit patient | ✅ | ✗ | ✗ | ✅ |
| Delete patient | ✗ | ✗ | ✗ | ✅ |
| View patient profile | ✅ | ✅ | ✅ | ✅ |
| Add to queue | ✅ | ✗ | ✗ | ✅ |
| Mark arrived / cancel | ✅ | ✗ | ✗ | ✅ |
| Make emergency | ✗ | ✗ | ✗ | ✅ |
| Set working hours | ✗ | ✗ | ✗ | ✅ |
| Manage holidays | ✗ | ✗ | ✗ | ✅ |
| Write consultation | ✗ | ✅ | ✗ | ✅ |
| Write prescription | ✗ | ✅ | ✗ | ✅ |
| View / print prescriptions | ✅ | ✅ | ✅ | ✅ |
| Medicine Store (manage) | ✗ | ✗ | ✗ | ✅ |
| Generate / view invoice | ✅ | ✗ | ✗ | ✅ |
| Record payment | ✅ | ✗ | ✗ | ✅ |
| End of Day closing | ✅ | ✗ | ✗ | ✅ |
| View reports | ✗ | ✗ | ✗ | ✅ |

---

## Module Status

| Module | Status | Notes |
|--------|--------|-------|
| 2.0 Role dashboards | ✅ Complete | Live data — uses existing report + appointment APIs |
| 2.1 Patient registration | ✅ Complete | |
| 2.2 Appointments & queue | ✅ Complete | |
| 2.3 Consultations | ✅ Complete | |
| 2.4 Prescriptions & Medicine Store | ✅ Complete | Browser print used; server-side PDF deferred |
| 2.5 Billing & payments | ✅ Complete | Invoice PDF deferred to Phase 3 |
| 2.6 Reports | ✅ Complete | PDF export deferred to Phase 3; CSV available now |
| 2.7 Clinic settings | ✅ Complete | Logo/signature upload; 8-tab settings page; doctor fees; custom services |
| 3 PDF generation | ✅ Complete | Invoice PDF (`/invoices/:id/pdf`) + Prescription PDF (`/prescriptions/:id/pdf`) via pdfkit; Download buttons in UI |

---

## Deferred Items (not yet built)

| Item | Deferred to |
|------|------------|
| Dashboard stat cards wired to real API data | ✅ Done (Phase 2.0 — 2026-04-14) |
| Server-side PDF generation | ✅ Done (Phase 3) |
| Stock auto-deduct on dispensing | Phase 5 (pharmacy module) |
| Expiry alert notifications | Phase 4 |
| Doctor signature upload | ✅ Done (Phase 2.7 + 3) |
| Clinic logo on print / PDF | ✅ Done (Phase 3) |
| Online patient booking | Phase 5 |
| Appointment SMS/WhatsApp reminders | Phase 5 |
| Scheduled monthly email report | Phase 5 |
| Reports PDF export | Phase 3 (with clinic branding) |

---

*workflow.md — Doctor POS*
*Update at the end of every phase. Keep in sync with ongoingworking.md.*
