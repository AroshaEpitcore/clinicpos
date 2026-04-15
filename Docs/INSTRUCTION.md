# INSTRUCTION.md — Master Development Rules

> ⚠️ **READ THIS FILE BEFORE TOUCHING ANY CODE, ANY FILE, OR ANY DATABASE.**  
> This is a solo developer project. These rules exist to prevent mistakes, lost work, and confusion.  
> No exceptions. No shortcuts.

---

## Who This File Is For

This file is for **you** — the sole developer of the Doctor POS system.  
Read it at the start of every coding session. Read it before every feature. Read it before every change.

---

## The Three Projects

```
clinicpos/
├── clinic-frontend/      React app — what clinic staff use
├── backend-api/          Node.js — all business logic and API
└── admin-frontend/       React app — your super admin panel
```

Every change you make belongs to one of these three projects.  
Never mix logic between them. Never put backend logic in the frontend.

---

## This Is a Customizable Product — Understand This First

This is NOT a fixed application. It is a **customizable SaaS product** that you sell to clinics.  
Every clinic that buys it gets their own version — with their own modules, their own branding, and their own settings.

There are **two levels of customization** in this system:

### Level 1 — You control per clinic (Super Admin)
You decide what each clinic can access by toggling feature flags.  
There are no subscription plans or tiers — access is managed manually from `admin.clinicpos.com`.

| Module | Who controls it | Where |
|--------|----------------|-------|
| Pharmacy / inventory | You (super admin) | Feature flag toggle |
| Lab & diagnostics | You (super admin) | Feature flag toggle |
| Insurance & claims | You (super admin) | Feature flag toggle |
| Online patient booking | You (super admin) | Feature flag toggle |
| Multi-branch support | You (super admin) | Feature flag toggle |
| Custom domain | You (super admin) | Feature flag toggle |

### Level 2 — Clinic owner controls (Clinic Settings)
Each clinic can customize their own workspace inside the app.  
This does NOT affect other clinics.

| Setting | Who controls it | Where |
|---------|----------------|-------|
| Clinic name & logo | Clinic owner/admin | Clinic settings screen |
| Receipt / invoice header | Clinic owner/admin | Clinic settings screen |
| Doctor profiles & specializations | Clinic admin | Staff management screen |
| Working hours & time slots | Clinic admin | Schedule settings screen |
| Consultation fee per doctor | Clinic admin | Doctor settings screen |
| Tax rate on invoices | Clinic admin | Billing settings screen |
| Currency display | Clinic admin | Billing settings screen |
| Patient portal on/off | Clinic admin | Clinic settings screen |

### The Golden Rule of Customization

**Every module you build must check the feature flag before loading.**  
If the flag is off for a clinic — the module must not appear in their UI and the API must reject requests to it.

```javascript
// Backend — check feature flag before processing
if (!tenantFlags.pharmacy) {
  return res.status(403).json({ status: 'error', message: 'Module not enabled for your plan' });
}

// Frontend — check feature flag before showing menu item
{tenantFlags.pharmacy && <NavItem label="Pharmacy" href="/pharmacy" />}
```

Never assume a module is enabled. Always check the flag. Always enforce in both frontend AND backend.

---

## Rule 1 — Always Pull Before You Start

Before writing a single line of code, pull the latest changes from GitHub.

```bash
git pull origin main
```

Do this for every project folder you are about to work in.  
If you skip this, you risk overwriting your own previous work.

---

## Rule 2 — One Feature at a Time

Never start a new feature while another is incomplete.  
Finish, test, commit, and document the current feature — then move to the next.

If you stop in the middle of a feature:
- Leave a `// TODO:` comment exactly where you stopped
- Write a note in `Docs/ongoingworking.md` describing what is left
- Commit what you have with a clear message like `WIP: patient registration form — stopped at validation`

---

## Rule 3 — Commit Often, Commit Clearly

Commit after every meaningful piece of work. Never commit everything at once at the end of the day.

### Commit message format

```
[feature] short description of what you did
[fix]     short description of what you fixed
[update]  short description of what you updated
[docs]    short description of what doc you updated
```

### Examples

```
[feature] patient registration form — frontend complete
[fix] appointment booking — time slot overlap bug fixed
[update] billing module — added partial payment support
[docs] ongoingworking.md — marked prescriptions as complete
```

Never commit with messages like "update", "fix", "done", or "changes". These are useless later.

---

## Rule 4 — Never Work Directly on Main Branch

Always create a branch for each feature.

```bash
git checkout -b feature/patient-registration
# work, commit, test
git checkout main
git merge feature/patient-registration
git push origin main
```

If something breaks on a feature branch, main is still safe.

---

## Rule 5 — Update Docs After Every Feature

After completing and testing any feature, you must update the relevant doc files:

| File | What to update |
|------|---------------|
| `Docs/ongoingworking.md` | Mark feature as done, add date, add session log entry |
| `Docs/databasequeries.md` | Add any new table definitions, queries, or ALTER statements |
| `Docs/INSTRUCTION.md` | Update if any new rules, patterns, or file structures changed |
| `Docs/Plan.md` | Mark phase tasks as complete (✅), update status and notes |
| `Docs/workflow.md` | Update role access sections, data flow diagrams, module status table |
| `Docs/RUNNING.md` | Update if new migration scripts, env vars, or folder structure changed |
| `Docs/DESIGN.md` | Update if new NPM packages were installed or new UI patterns introduced |
| `Docs/Doctor pos core features.md` | Add new module descriptions when a new module is built |

**Do not skip this step.** This is a solo project — these docs are your only external memory.  
Future-you will thank present-you.

---

## Rule 6 — Never Change the Database Without Documenting It

Before you run any `CREATE TABLE`, `ALTER TABLE`, or `DROP` command:

1. Write the query in `Docs/databasequeries.md` first
2. Describe what it does and which tables it connects to
3. Run the query
4. Verify it worked
5. Update `databasequeries.md` with the result (success / changes made)

If you change a table and don't document it, you will forget it. You will break things later.

---

## Rule 7 — Test Before You Mark as Done

A feature is NOT done until you have tested:

- [ ] Happy path — does it work when everything is correct?
- [ ] Error path — does it show proper errors when input is wrong?
- [ ] Role access — does it block the wrong roles from accessing it?
- [ ] Empty state — what happens when there is no data?
- [ ] Mobile view — does the UI work on a smaller screen?

Only after all five checks pass, mark the feature as complete in `ongoingworking.md`.

---

## Rule 8 — Environment Variables — Never Hardcode Secrets

Never write passwords, API keys, or database URLs directly in code.  
Always use `.env` files.

```
# .env (never commit this file)
DATABASE_URL=postgresql://user:password@localhost:5432/clinicpos
JWT_SECRET=your_secret_key_here
REDIS_URL=redis://localhost:6379
```

Add `.env` to `.gitignore` in every project. Always.  
If you accidentally commit a secret key — change it immediately.

---

## Rule 9 — Role-Based Access — Enforce in Both Places

Every protected feature must be enforced in TWO places:

1. **Frontend** — hide or disable the UI element for unauthorized roles
2. **Backend** — reject the API request if the role is not allowed

Never rely on just the frontend to protect data. The backend must always verify the role.

---

## Rule 10 — Backup Before Risky Changes

Before doing anything risky (dropping a table, major refactor, schema change):

```bash
# Backup the database
pg_dump clinicpos_db > backup_$(date +%Y%m%d_%H%M).sql
```

Store backups in a `/backups` folder. Never delete backups.

---

## File & Folder Naming Rules

| Type | Convention | Example |
|------|-----------|---------|
| React components | PascalCase | `PatientForm.jsx` |
| Utility files | camelCase | `formatDate.js` |
| API route files | kebab-case | `patient-routes.js` |
| Database files | snake_case | `patient_records` |
| Doc files | UPPERCASE.md | `INSTRUCTION.md` |
| Branch names | kebab-case with prefix | `feature/appointment-booking` |

---

## API Design Rules

- All API routes start with `/api/v1/`
- Use plural nouns for resources: `/patients`, `/appointments`, `/invoices`
- Use HTTP methods correctly:
  - `GET` — fetch data
  - `POST` — create new record
  - `PUT` — update full record
  - `PATCH` — update partial record
  - `DELETE` — soft delete only (never hard delete medical data)
- Every response must include a status and message:

```json
{
  "status": "success",
  "message": "Patient created successfully",
  "data": { }
}
```

---

## Multi-Tenant Rule — Most Important Backend Rule

Every single database query in the backend MUST include the `tenant_id`.  
No exceptions. This prevents one clinic from seeing another clinic's data.

```javascript
// WRONG — missing tenant_id
const patients = await db.query('SELECT * FROM patients');

// CORRECT — always filter by tenant
const patients = await db.query(
  'SELECT * FROM patients WHERE tenant_id = $1',
  [tenantId]
);
```

If you forget `tenant_id` in a query, data leaks between clinics.  
This is the most critical security rule in the entire system.

---

## Rule 11 — Every Module Must Respect Feature Flags

Before building any module feature (pharmacy, lab, insurance, online booking):

1. Confirm the feature flag exists in `public.feature_flags` table
2. Load flags from the database when the clinic session starts
3. Check the flag in the **backend** before processing any request for that module
4. Check the flag in the **frontend** before rendering any UI for that module
5. If the flag is off — backend returns `403`, frontend hides the menu item completely

A clinic on the Basic plan must never see or access Premium features.  
This is how you enforce plan limits without shipping separate builds.

---

## Rule 12 — Clinic Settings Are Per-Tenant, Not Global

When a clinic changes their logo, fee structure, or working hours — it only affects their tenant.  
Never store clinic-specific settings in a shared/global config.  
Always store them in the `clinic_settings` table inside the tenant's own schema.

If you find yourself writing a setting that applies to all clinics — stop.  
Ask: is this a system setting (goes in backend `.env`) or a clinic setting (goes in tenant `clinic_settings` table)?

---

## Rule 13 — Logo and File Uploads — Always Validate and Isolate

Every file a clinic uploads (logo, doctor signature) must follow these rules:

1. **Validate file type** — only accept JPG and PNG. Reject everything else with a clear error
2. **Validate file size** — reject files over 2MB with a clear error message
3. **Save to tenant-isolated path** — always save to `/uploads/tenants/{tenant_id}/filename`  
   Never save to a shared folder — clinic A must never be able to see clinic B's files
4. **Save the URL** — after successful upload, save the file path to the correct DB column (`clinic_settings.clinic_logo_url` or `staff.signature_url`)
5. **Serve securely** — file URLs must go through the backend, not be publicly guessable

```javascript
// WRONG — shared uploads folder
const path = `/uploads/${filename}`;

// CORRECT — tenant isolated
const path = `/uploads/tenants/${tenantId}/${filename}`;
```

---

## Rule 14 — Duplicate Patient Check Is Mandatory

Before saving a new patient registration, the backend must always run a duplicate check.  
Check against: phone number, full name + date of birth, national ID.

If a match is found:
- Return the matched patient(s) to the frontend
- Frontend shows a warning modal with the existing patient details
- Receptionist decides — confirm it is the same person (use existing) or proceed with new

Never silently create a duplicate patient. This causes data split across two profiles and is very hard to fix later.

---

## Rule 18 — Quick Patient Registration Inside Queue Modal

The "Add to Queue" modal supports two patient modes:

1. **Search Existing** — phone number search against registered patients
2. **New Patient** — inline mini form (first name, last name, phone, gender, DOB)

When "New Patient" is submitted:
- The patient is created via `POST /api/v1/patients` first
- If patient creation succeeds, the appointment is created using the returned patient ID
- If patient creation fails, the appointment is NOT created — the error is shown and the user can fix it
- The patient gets a full record in the system (PT-XXXXX code auto-assigned) just like a normal registration

**Why this exists:** Receptionists should not need to leave the queue screen to register a walk-in patient. The full patient registration form (with all optional fields) is still available from the Patients page for detailed records.

**Required fields for quick registration:** first_name, last_name, phone, gender, date_of_birth  
**Optional fields** (can be filled in later via patient profile edit): email, address, blood_group, allergies, national_id, insurance, emergency contact

---

## Rule 15 — Offline Awareness — Never Let the App Silently Fail

The frontend must detect internet connectivity loss and show a clear warning banner immediately.  
The clinic must know the system is offline before they try to save a patient or take a payment.

```javascript
window.addEventListener('offline', () => {
  showBanner('No internet connection. Changes may not be saved.');
});
window.addEventListener('online', () => {
  hideBanner();
  showToast('Connection restored.');
});
```

Never let a form submit silently fail because of no internet. Always show a clear state to the user.

---

## Rule 16 — End of Day Closing Must Be Done Once Per Day Only

The `end_of_day` table has a `UNIQUE` constraint on `closing_date`.  
Only one closing record per day is allowed.

Before showing the EOD closing screen, check if today's closing already exists.  
If it does — show a read-only summary. Do not allow re-submission.  
Only an admin can unlock and re-open a day's closing if there was a genuine error.

---

## Rule 17 — Notifications Are Proactive, Not Reactive

Do not wait for a clinic to open a report to discover a problem.  
The system must create notification records automatically when:

- A medicine's stock drops to or below its reorder level → `LOW_STOCK` notification
- A medicine's expiry is within 60 days → `EXPIRY_ALERT` notification
- An invoice is unpaid for more than 7 days → `PAYMENT_PENDING` notification
- A patient has an appointment tomorrow → `APPOINTMENT_REMINDER` notification (if enabled)

These notifications appear as badge counts on the dashboard when staff log in.  
Write a background job (cron) that runs these checks daily and creates the notification records.

---

## Rule 20 — New Clinic Creation Always Creates First Admin Staff

When `POST /api/v1/admin/tenants` creates a new clinic, it MUST also create the first admin staff account in the same transaction. Without this, the clinic has no way to log in.

**Required fields for clinic creation:**
- `clinic_name`, `subdomain`, `owner_email` — standard
- `initial_password` — used to create the first admin staff account (hashed with bcrypt before storing)

**What the backend does in one transaction:**
1. Insert `public.tenants`
2. Insert default `public.feature_flags` (all OFF)
3. Run `createTenantSchema()` — creates all tables
4. Insert default `clinic_settings`
5. **Insert first admin staff** — `email = owner_email`, `role = 'admin'`, `password_hash = bcrypt(initial_password)`

**Response must include** a `login` object so the super admin can copy credentials:
```json
{
  "data": {
    "tenant": { ... },
    "login": {
      "url": "https://subdomain.clinicpos.com",
      "email": "owner@clinic.com",
      "password": "the_plain_text_password"
    }
  }
}
```

The plain text password is returned once and shown in the admin UI credentials screen. It is NOT stored in the database (only the bcrypt hash is). The super admin must copy and send it to the clinic immediately.

Never create a clinic without the initial admin staff account — impersonation and login both fail without it.

---

## Rule 19 — Public (Unauthenticated) Routes — Portal Pattern

When building routes that must be accessible without JWT (e.g. the patient booking portal):

1. Do NOT apply `authMiddleware` to these routes — they are public by design
2. DO apply `tenantMiddleware` — the tenant is still required for DB isolation
3. Check `patient_portal_enabled` in `clinic_settings` at the start of each handler
4. Use a **separate public API client** in the frontend (`api/portal.js`) — do NOT reuse the authenticated Axios instance
5. The public client MUST still send the `X-Tenant-Subdomain` header (via `VITE_TENANT_SUBDOMAIN` env var)
6. The `/book` route in `App.jsx` must be outside any `<ProtectedRoute>` wrapper
7. Never expose `staff` table data, patient medical history, or consultation data through portal routes
8. Slot conflict protection: **always** do a server-side check before inserting a booked appointment — never trust only the frontend slot display

---

## Before Starting Every Coding Session — Checklist

```
[ ] Pulled latest code from GitHub
[ ] Read what was last worked on in ongoingworking.md
[ ] Know exactly which feature I am working on today
[ ] Created or switched to the correct branch
[ ] .env files are in place and not committed
[ ] No incomplete feature from the last session left hanging
```

---

## Before Ending Every Coding Session — Checklist

```
[ ] All changes committed with a clear message
[ ] ongoingworking.md updated with today's progress and session log entry
[ ] databasequeries.md updated if any DB changes were made
[ ] Plan.md updated — mark completed tasks ✅
[ ] workflow.md updated if any role access or data flow changed
[ ] RUNNING.md updated if new migration scripts or env vars were added
[ ] DESIGN.md updated if new packages were installed or new UI patterns used
[ ] Doctor pos core features.md updated if a new module was built
[ ] Any incomplete work has a TODO comment
[ ] Pushed to GitHub
[ ] No .env files committed accidentally
```

---

## Docs Folder Structure

```
Docs/
├── INSTRUCTION.md              ← This file — read before everything
├── Plan.md                     ← Build order, phases, task checklists
├── RUNNING.md                  ← How to run and deploy all three projects
├── DESIGN.md                   ← UI design rules, components, NPM packages
├── workflow.md                 ← Role-by-role access, data flow, module status
├── databasequeries.md          ← Every table definition, query, and relationship
├── ongoingworking.md           ← Feature progress tracker, session log, bug list
└── Doctor pos core features.md ← Full product feature descriptions per module
```

All eight files must always be up to date.  
They are your memory. Treat them as seriously as the code itself.

---

*Doctor POS — Instruction Manual v1.0*  
*Solo developer project — discipline is your only safety net*