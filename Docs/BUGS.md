# BUGS.md — Automated Test Results

> Generated: 2026-04-18  
> Test suite: `backend-api/tests/automation.js`  
> Total tests: 135 · Passed: 105 · Failed: 30  
> After filtering test-side issues (wrong URLs, missing body fields): **8 real backend bugs confirmed**

---

## Bug #1 — Nurse can create consultations (Role Enforcement)

**File:** `backend-api/src/routes/consultation.routes.js` line 11  
**Severity:** High  
**Found by:** Test `nurse cannot create consultation → got 400` (nurse passed role check, hit body validation instead of 403)

**Problem:**  
`POST /consultations` uses `requireRole('doctor', 'nurse', 'admin')`. Nurses should only view vitals and read records — they cannot write clinical consultation notes.

**Fix:** Remove `'nurse'` from the allowed roles.

---

## Bug #2 — Doctor can create appointments via API (Role Enforcement)

**File:** `backend-api/src/routes/appointment.routes.js` line 74  
**Severity:** High  
**Found by:** Test `doctor cannot create appointment → got 201`

**Problem:**  
`POST /appointments` uses `requireRole('receptionist', 'admin', 'doctor')`. The frontend correctly hides the "Add to Queue" button from doctors, but the backend does not enforce this — a doctor can call the API directly and create any appointment for any patient.

**Fix:** Remove `'doctor'` from the allowed roles.

---

## Bug #3 — Nurse can read all invoices (Missing Role Check)

**File:** `backend-api/src/routes/invoice.routes.js` line 168  
**Severity:** Medium  
**Found by:** Test `Nurse cannot access invoices → got 200`

**Problem:**  
`GET /invoices` has no `requireRole` guard. The POST/PUT/pay routes correctly restrict to admin/receptionist, but the list endpoint is open to all authenticated users, so nurses can browse all billing data.

**Fix:** Add `requireRole('admin', 'receptionist', 'doctor')` to the GET / handler.

---

## Bug #4 — Nurse can access insurance data (Missing Role Check)

**File:** `backend-api/src/routes/insurance.routes.js`  
**Severity:** Medium  
**Found by:** Test `Nurse cannot access insurance → got 200`

**Problem:**  
`GET /insurance/claims`, `GET /insurance/providers`, `GET /insurance/corporate-accounts`, and `GET /insurance/corporate-accounts/:id/summary` have no role guard. Nurses should have no access to insurance data at all.

**Fix:** Add `requireRole('admin', 'receptionist', 'doctor')` to the claims GET and `requireRole('admin', 'receptionist')` to the provider/corporate account GETs (doctor can view claims in the design doc, but not provider/corporate management tabs).

---

## Bug #5 — Only admin can manage pharmacy suppliers (Wrong Role Restriction)

**File:** `backend-api/src/routes/pharmacy.routes.js` lines 39, 60, 87  
**Severity:** Medium  
**Found by:** Test `Receptionist can create supplier → got 403`

**Problem:**  
`POST /pharmacy/suppliers`, `PUT /pharmacy/suppliers/:id`, and `DELETE /pharmacy/suppliers/:id` use `requireRole('admin')` only. Per the design spec, receptionist has full pharmacy access (same as admin for pharmacy).

**Fix:** Change to `requireRole('admin', 'receptionist')` on all three supplier mutation routes.

---

## Bug #6 — Receptionist cannot access any reports (Over-Restricted Role Check)

**File:** `backend-api/src/routes/report.routes.js` line 6  
**Severity:** Medium  
**Found by:** Tests `Receptionist can access /reports/daily → got 403` and `Receptionist can access /reports/appointments → got 403`

**Problem:**  
`router.use(..., requireRole('admin'))` applies to ALL report routes at the router level. The design doc states: "Receptionist: View daily appointment and billing summary only." Receptionists need `/reports/daily` and `/reports/appointments` for their end-of-day workflow.

**Fix:** Remove the router-level `requireRole('admin')` and add individual guards per route — `requireRole('admin')` on financial/doctor/medicine/patient reports, and `requireRole('admin', 'receptionist')` on daily and appointments reports.

---

## Bug #7 — Invalid patient ID causes 500 (Unhandled DB Error)

**File:** `backend-api/src/routes/patient.routes.js` GET `/:id` handler  
**Severity:** Low  
**Found by:** Test `Non-existent patient returns 404 → got 500`

**Problem:**  
When an integer like `99999999` is passed as the patient ID (instead of a valid UUID), PostgreSQL throws an "invalid input syntax for type uuid" error. The catch block returns 500 instead of a meaningful 404/400 response.

**Fix:** Add a UUID format check before the DB query and return 400 if the ID is not a valid UUID.

---

## Bug #8 — Invalid date query causes 500 (Unhandled DB Error)

**File:** `backend-api/src/routes/appointment.routes.js` GET `/` handler  
**Severity:** Low  
**Found by:** Test `Invalid date query handled gracefully → got 500`

**Problem:**  
When `?date=not-a-date` is passed, PostgreSQL receives an invalid date string and throws a cast error. The catch block returns 500 instead of a graceful 400 response.

**Fix:** Validate the date param before querying. If it doesn't match `YYYY-MM-DD`, return 400 with a clear error message.

---

## Test Issues (Not Real Bugs)

These tests failed due to wrong assumptions in the test script, not actual backend bugs:

| Test | Reason |
|------|--------|
| Patient edit → 400 | Test sent `{ first_name }` only — backend correctly requires `phone` too |
| Appointment status → 404 | Test used `/appointments/:id/status` — actual route is `PUT /appointments/:id` |
| Consultation create → 400 | Dependent appointment was never set to `arrived` status (chained test failure) |
| Prescription create → 400 | Same dependency chain issue |
| Pharmacy stock → 404 | No `/pharmacy/stock` endpoint — stock is read via `/medicines` |
| Lab queue → 404 | Wrong URL — correct endpoint is `GET /lab/requests` |
| Staff deactivate → 404 | Wrong URL — correct endpoint is `DELETE /staff/:id` |
| Doctor lab request → 400 | Test body had `lab_test_id` but backend expects `test_id` |

---

---

## Bug #9 — Settings page "Server error" on new clinics

**File:** `backend-api/src/db/createTenantSchema.js`  
**Severity:** High  
**Found:** 2026-04-22 — familycare.healthcenter.lk could not toggle Patient Portal or Waiting Room Display

**Problem:**  
`createTenantSchema.js` did not include `queue_display_enabled` in the `clinic_settings` INSERT. The `PUT /settings` route references this column unconditionally, so new clinics always got a 500. Demo clinic worked because `migrate_queue_display.js` had already patched its schema.

**Root cause (wider):** All addon module tables (pharmacy, lab, insurance) were added via standalone one-shot migration scripts that only ran on existing schemas. These were never backported to `createTenantSchema.js`, meaning every clinic created after those migrations was missing ~10 tables and 3 columns.

**Fix:**
- Added `queue_display_enabled BOOLEAN DEFAULT FALSE` to `clinic_settings` in `createTenantSchema.js`
- Added dispensing columns (`is_dispensed`, `dispensed_at`, `dispensed_by`) to `prescriptions`
- Added full pharmacy tables: `suppliers`, `purchase_orders`, `purchase_order_items`, `stock_adjustments`
- Added full lab tables: `lab_tests`, `lab_requests`, `lab_results` with 12 seeded tests
- Added full insurance tables: `insurance_providers`, `corporate_accounts`, `insurance_claims` with 4 seeded providers
- Added `ALTER TABLE patients ADD COLUMN IF NOT EXISTS corporate_account_id` after `corporate_accounts`
- Created `migrate_fix_new_clinics.js` — iterates all `tenant_*` schemas and patches them using `IF NOT EXISTS` guards (safe to re-run). Ran on server: fixed `tenant_demo` and `tenant_familycare`.

---

## Bug #10 — Basic plan auto-suspends immediately after assignment

**File:** `backend-api/src/middleware/tenant.js` and `backend-api/src/routes/admin.routes.js`  
**Severity:** High  
**Found:** 2026-04-22 — assigning the Basic plan to any clinic instantly suspended it; renewing also triggered suspension

**Problem:**  
The PostgreSQL `pg` library returns `DATE` columns as JavaScript `Date` objects, not strings. The auto-suspend check was:
```javascript
const endStr = String(tenant.subscription_end).split('T')[0];
if (endStr < today) { /* suspend */ }
```
`String(new Date('2026-05-21'))` → `'Thu May 21 2026 00:00:00 GMT+0000 (UTC)'`  
`.split('T')[0]` → `''` (empty string — there is no `T` in that format)  
`'' < '2026-04-22'` → always `true` → every active clinic with any plan auto-suspended.

Standard plan appeared to work only because it had already been tested with a direct DB fix.

Same bug existed in the renew route when calculating the base date for extension.

**Fix:**
```javascript
// tenant.js
const endStr = new Date(tenant.subscription_end).toISOString().split('T')[0];

// admin.routes.js renew route
const current = tenant.subscription_end
  ? new Date(tenant.subscription_end).toISOString().split('T')[0]
  : null;
```
`new Date(dateValue).toISOString()` handles both string and Date object returns from `pg`, always producing `'2026-05-21T00:00:00.000Z'` — `.split('T')[0]` = `'2026-05-21'` — comparison works correctly.

---

## Bug #11 — Logo not displaying in production after upload

**File:** `clinic-frontend/src/utils/mediaUrl.js`  
**Severity:** Medium  
**Found:** 2026-04-22 — logos uploaded fine, appeared on the upload preview, but never rendered anywhere else in the app on production

**Problem:**  
`mediaUrl.js` built URLs using `VITE_API_URL`:
```javascript
return (import.meta.env.VITE_API_URL || 'http://localhost:4000') + path;
```
In production `VITE_API_URL` is intentionally left empty (frontend proxies `/api` via Nginx). The empty string triggered the `|| 'http://localhost:4000'` fallback — so all logo URLs pointed to `http://localhost:4000/uploads/...` which is unreachable from the browser.

**Fix:**
```javascript
export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return window.location.origin + path;
}
```
Uses `window.location.origin` (e.g. `https://familycare.healthcenter.lk`) so the path resolves correctly in both production and local dev. Added `/uploads` proxy entry to `vite.config.js` for local dev.

---

---

## Bug #12 — Platform Settings save only sent current tab's fields

**File:** `admin-frontend/src/pages/PlatformSettingsPage.jsx`  
**Severity:** High  
**Found:** 2026-04-22

**Problem:**  
The Save button on the Platform Settings page only saved the keys belonging to the currently active tab. So if the user filled in phone/address/bank details on Contact or Payment tabs but clicked Save while on the Company Info tab, only `company_name`, `company_tagline`, `company_reg_no` were sent. All other fields were silently discarded. Toast showed "Settings saved" regardless — misleading the user.

**Fix:**  
Changed `save(keys)` to `save()` — the function now sends the entire `settings` state object to `PUT /api/v1/admin/platform/batch` regardless of which tab is active. All fields across all tabs are saved in one request.

---

## Bug #13 — Platform Settings empty fields overwrote existing DB values

**File:** `admin-frontend/src/pages/PlatformSettingsPage.jsx`  
**Severity:** Medium  
**Found:** 2026-04-22

**Problem:**  
The original save function built the subset as `keys.forEach(k => { subset[k] = settings[k] ?? '' })`. If a field was empty (not yet filled), an empty string was sent and saved to DB — overwriting any previously stored value. Saving the Contact tab with only the email filled in would blank out city, country, phone, and address.

**Fix (interim):** Skip empty-string values when building the batch payload. Superseded by Bug #12 fix — saving all settings at once means the user fills everything in before saving, so empty fields are intentional clears.

---

---

## Bug #14 — Logo update not visible in other browsers / after re-login (Browser Caching)

**File:** `backend-api/src/routes/settings.routes.js`  
**Severity:** Medium  
**Found:** 2026-04-24 — demo clinic logo updated correctly, but other clinics showed the old logo after upload; login screen didn't show new logo after logout

**Problem:**  
The logo upload handler in `makeStorage()` always generated the same filename: `logo.ext` (e.g. `logo.png`). Every clinic's logo was saved at the same URL path each time. Because the URL never changed, browsers served the previously cached version indefinitely — even after a new file was uploaded to disk.

Additionally, `AuthContext.jsx` performed a background refresh on session restore to keep clinic data in sync across browsers. That refresh fetched the plain URL from `/api/v1/settings` (which had no cache-busting query string), so even after the Settings page temporarily added `?v=timestamp` to the URL locally, the background refresh overwrote it with the bare URL — browsers then served the cached version again on the next load.

The old logo file was also never deleted from disk, so stale files accumulated in `uploads/tenants/{schema}/`.

**Fix:**

1. **Timestamp-based filename on every upload** — `makeStorage()` now generates `logo_${Date.now()}.ext` so each upload produces a unique URL. Browsers treat the new URL as a new resource and fetch it fresh.

2. **Delete old file after successful DB update** — the `POST /settings/logo` handler fetches `clinic_logo_filename` before the update, then deletes the old file from disk once the DB has been updated successfully.

```javascript
// settings.routes.js — makeStorage filename (before → after)
// Before: 'logo'  (always the same)
// After:
const base = subdir === 'signatures'
  ? (req.params.staffId || Date.now())
  : `logo_${Date.now()}`;  // unique per upload

// POST /logo handler — delete old file after DB update
const old = await queryTenant(tenantId, `SELECT clinic_logo_filename FROM clinic_settings LIMIT 1`);
const oldFilename = old.rows[0]?.clinic_logo_filename;
// ... update DB ...
if (oldFilename && oldFilename !== req.file.filename) {
  const oldPath = path.join('uploads', 'tenants', tenantId, oldFilename);
  try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch {}
}
```

---

## Bug #15 — Currency always resets to 'LKR' after session restore

**File:** `clinic-frontend/src/store/AuthContext.jsx`  
**Severity:** Low  
**Found:** 2026-04-24 — clinics that set a non-LKR currency saw it reset to LKR after every page reload

**Problem:**  
`AuthContext.jsx` performs a background refresh on session restore to keep clinic name and logo in sync across browsers. The refresh mapped the DB response incorrectly:

```javascript
// Before — wrong field name
currency: s.currency_code || 'LKR',
```

The `clinic_settings` table column is `currency`, not `currency_code`. Since `s.currency_code` was always `undefined`, the `|| 'LKR'` fallback always triggered, silently resetting any other currency to LKR on every page load.

**Fix:**

```javascript
// After — correct field name
currency: s.currency || 'LKR',
```

---

## Fix Status

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Nurse can create consultations | High | ✅ Fixed |
| 2 | Doctor can create appointments via API | High | ✅ Fixed |
| 3 | Nurse can read all invoices | Medium | ✅ Fixed |
| 4 | Nurse can access insurance data | Medium | ✅ Fixed |
| 5 | Receptionist cannot manage suppliers | Medium | ✅ Fixed |
| 6 | Receptionist cannot access reports | Medium | ✅ Fixed |
| 7 | Invalid patient ID causes 500 | Low | ✅ Fixed |
| 8 | Invalid date causes 500 in appointments | Low | ✅ Fixed |
| 9 | Settings server error on new clinics (missing schema columns/tables) | High | ✅ Fixed |
| 10 | Basic plan auto-suspends — Date object `.split('T')` returns empty string | High | ✅ Fixed |
| 11 | Logo not displaying in production — `mediaUrl.js` localhost fallback | Medium | ✅ Fixed |
| 12 | Platform Settings save only sent current tab's keys — other tabs lost | High | ✅ Fixed |
| 13 | Platform Settings empty fields overwrote existing DB values | Medium | ✅ Fixed |
| 14 | Logo update not visible in other browsers — fixed filename caused browser caching | Medium | ✅ Fixed |
| 15 | Currency always resets to 'LKR' after session restore — wrong field name `currency_code` | Low | ✅ Fixed |
