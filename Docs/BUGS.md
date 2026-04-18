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
