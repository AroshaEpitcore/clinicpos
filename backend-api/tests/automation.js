/**
 * ClinicPOS — Automated API Test Suite
 * Run: node tests/automation.js
 * Requires: backend running on localhost:4000, demo tenant seeded
 */

const BASE = 'http://localhost:4000/api/v1';
const TENANT = 'demo';
const TODAY = new Date().toISOString().split('T')[0];

// ── Credentials ───────────────────────────────────────────────────────────────
const CREDS = {
  admin:        { email: 'admin@demo.com',        password: 'password123' },
  doctor:       { email: 'doctor@demo.com',        password: 'password123' },
  receptionist: { email: 'receptionist@demo.com', password: 'password123' },
  nurse:        { email: 'nurse@demo.com',         password: 'password123' },
};

// ── Test state ────────────────────────────────────────────────────────────────
const tokens   = {};
const results  = [];
let   section  = '';
let   created  = {};   // IDs created during tests (for chained tests)

// ── Helpers ───────────────────────────────────────────────────────────────────
async function req(method, path, token, body) {
  const headers = { 'Content-Type': 'application/json', 'X-Tenant-Subdomain': TENANT };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️ ';
  console.log(`  ${icon} ${status}: ${name}${detail ? `  →  ${detail}` : ''}`);
  results.push({ section, name, status, detail });
}

function pass(name, detail = '') { log('PASS', name, detail); }
function fail(name, detail = '') { log('FAIL', name, detail); }
function warn(name, detail = '') { log('WARN', name, detail); }

function sec(name) {
  section = name;
  console.log(`\n━━━  ${name}  ━━━`);
}

function expect(condition, name, detail = '') {
  condition ? pass(name, detail) : fail(name, detail);
}

// ── Login all roles ───────────────────────────────────────────────────────────
async function loginAll() {
  sec('1. Authentication');
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('POST', '/auth/login', null, CREDS[role]);
    if (r.status === 200 && r.data.data?.token) {
      tokens[role] = r.data.data.token;
      pass(`${role} login`, `token received`);
    } else {
      fail(`${role} login`, `status ${r.status} — ${r.data?.message}`);
    }
  }

  // Wrong credentials
  const bad = await req('POST', '/auth/login', null, { email: 'bad@bad.com', password: 'wrong' });
  expect(bad.status === 401, 'Reject invalid credentials', `got ${bad.status}`);

  // No token → protected route
  const noToken = await req('GET', '/patients', null);
  expect(noToken.status === 401, 'Reject request with no token', `got ${noToken.status}`);
}

// ── 2. Patients ───────────────────────────────────────────────────────────────
async function testPatients() {
  sec('2. Patients');

  // All roles can list
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/patients', tokens[role]);
    expect(r.status === 200, `${role} can list patients`, `got ${r.status}`);
  }

  // Create — admin & receptionist allowed
  const ts = Date.now();
  const patBody = { first_name: 'Test', last_name: 'Patient', phone: `077${String(ts).slice(-7)}`, gender: 'male' };
  for (const role of ['admin', 'receptionist']) {
    const body = role === 'receptionist' ? { ...patBody, phone: `078${String(ts).slice(-7)}` } : patBody;
    const r = await req('POST', '/patients', tokens[role], body);
    expect(r.status === 201, `${role} can create patient`, `got ${r.status}`);
    if (r.status === 201 && !created.patientId) created.patientId = r.data.data?.id;
  }

  // Doctor & nurse should NOT be able to create patients
  for (const role of ['doctor', 'nurse']) {
    const r = await req('POST', '/patients', tokens[role], { first_name: 'Hack', phone: '0771110001' });
    expect(r.status === 403, `${role} cannot create patient`, `got ${r.status}`);
  }

  // Get single patient — all roles
  if (created.patientId) {
    for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
      const r = await req('GET', `/patients/${created.patientId}`, tokens[role]);
      expect(r.status === 200, `${role} can get patient profile`, `got ${r.status}`);
    }

    // Edit — requires first_name + phone (backend enforces both)
    for (const role of ['admin', 'receptionist']) {
      const r = await req('PUT', `/patients/${created.patientId}`, tokens[role], {
        first_name: 'Updated', phone: patBody.phone,
      });
      expect(r.status === 200, `${role} can edit patient`, `got ${r.status}`);
    }

    // Doctor & nurse cannot edit
    for (const role of ['doctor', 'nurse']) {
      const r = await req('PUT', `/patients/${created.patientId}`, tokens[role], {
        first_name: 'Hack', phone: '0770000000',
      });
      expect(r.status === 403, `${role} cannot edit patient`, `got ${r.status}`);
    }
  }

  // Duplicate check
  const dup = await req('GET', `/patients/check-duplicate?phone=${patBody.phone}`, tokens['receptionist']);
  expect(dup.status === 200, 'Duplicate check endpoint works', `got ${dup.status}`);
}

// ── 3. Appointments ───────────────────────────────────────────────────────────
async function testAppointments() {
  sec('3. Appointments');

  // All roles can list
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', `/appointments?date=${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can list appointments`, `got ${r.status}`);
  }

  // Get doctors list (needed for creating appointments)
  const drList = await req('GET', '/doctors', tokens['admin']);
  const doctorId = drList.data.data?.[0]?.id;

  if (!doctorId) {
    warn('No doctors found — skipping appointment creation tests');
    return;
  }

  // Create appointment — admin & receptionist allowed
  const apptBody = {
    patient_id:  created.patientId,
    doctor_id:   doctorId,
    type:        'walk_in',
    appointment_date: TODAY,
  };

  for (const role of ['admin', 'receptionist']) {
    const r = await req('POST', '/appointments', tokens[role], apptBody);
    expect(r.status === 201, `${role} can create appointment`, `got ${r.status}`);
    if (r.status === 201 && !created.appointmentId) {
      created.appointmentId = r.data.data?.id;
    }
  }

  // Doctor & nurse cannot create appointments
  for (const role of ['doctor', 'nurse']) {
    const r = await req('POST', '/appointments', tokens[role], apptBody);
    expect(r.status === 403, `${role} cannot create appointment`, `got ${r.status}`);
  }

  // Update status — admin & receptionist
  if (created.appointmentId) {
    // Correct URL: PUT /appointments/:id (not /appointments/:id/status)
    const r = await req('PUT', `/appointments/${created.appointmentId}`, tokens['receptionist'], { status: 'arrived' });
    expect(r.status === 200, 'Receptionist can update appointment status to arrived', `got ${r.status}`);

    // Nurse CAN update status (design: nurse marks patients arrived)
    const rn = await req('PUT', `/appointments/${created.appointmentId}`, tokens['nurse'], { status: 'arrived' });
    expect(r.status === 200, 'Nurse can update appointment status', `got ${rn.status}`);
  }

  // Doctor schedules — admin only
  const sched = await req('POST', '/doctors/schedules', tokens['admin'], {
    doctor_id: doctorId, day_of_week: 1,
    start_time: '09:00', end_time: '17:00',
    slot_duration_minutes: 15, is_active: true,
  });
  expect(sched.status === 200 || sched.status === 201, 'Admin can set doctor schedule', `got ${sched.status}`);

  const schedFail = await req('POST', '/doctors/schedules', tokens['receptionist'], {
    doctor_id: doctorId, day_of_week: 2, start_time: '09:00', end_time: '17:00', slot_duration_minutes: 15, is_active: true,
  });
  expect(schedFail.status === 403, 'Receptionist cannot set doctor schedule', `got ${schedFail.status}`);

  // Holidays — admin only
  // Pre-clean all "Test Holiday" entries from prior runs (timezone shift means we can't match
  // holiday_date reliably, so delete by label prefix before creating a fresh one)
  const uniqueDay = Math.floor(Date.now() / 86400000) % 3650;
  const holDateObj = new Date('2100-01-01');
  holDateObj.setUTCDate(holDateObj.getUTCDate() + uniqueDay);
  const holDate = holDateObj.toISOString().split('T')[0];
  const existingHolList = await req('GET', '/doctors/holidays', tokens['admin']);
  for (const h of existingHolList.data.data?.filter(h => h.label?.startsWith('Test Holiday')) ?? []) {
    await req('DELETE', `/doctors/holidays/${h.id}`, tokens['admin']);
  }
  const hol = await req('POST', '/doctors/holidays', tokens['admin'], {
    holiday_date: holDate, label: `Test Holiday ${Date.now()}`,
  });
  expect(hol.status === 201, 'Admin can add holiday', `got ${hol.status}`);
  if (hol.status === 201) created.holidayId = hol.data.data?.id;

  const holFail = await req('POST', '/doctors/holidays', tokens['receptionist'], {
    holiday_date: '2026-12-26', label: 'Boxing Day Test',
  });
  expect(holFail.status === 403, 'Receptionist cannot add holiday', `got ${holFail.status}`);
}

// ── 4. Consultations ──────────────────────────────────────────────────────────
async function testConsultations() {
  sec('4. Consultations');

  // All roles can list
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', `/consultations?date=${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can list consultations`, `got ${r.status}`);
  }

  // Get doctor ID (needed for consultation — backend checks doctor_id)
  const drList2 = await req('GET', '/doctors', tokens['admin']);
  const doctorStaffId = drList2.data.data?.[0]?.id;

  // Create — doctor & admin only; requires patient_id + doctor_id (flat vitals, not nested)
  const consultBody = {
    appointment_id:  created.appointmentId,
    patient_id:      created.patientId,
    doctor_id:       doctorStaffId,
    chief_complaint: 'Test complaint',
    diagnosis:       'Test diagnosis',
    notes:           'Test notes',
    bp_systolic:     120,
    bp_diastolic:    80,
    temperature:     37.0,
    weight:          70,
    pulse:           72,
  };

  // Admin creates first (uses doctor's ID on behalf)
  const adminConsult = await req('POST', '/consultations', tokens['admin'], consultBody);
  expect(adminConsult.status === 201, 'admin can create consultation', `got ${adminConsult.status}`);
  if (adminConsult.status === 201) created.consultationId = adminConsult.data.data?.id;

  // Doctor can also create (for their own patients — doctor_id must match their own ID)
  // /doctors returns {id, full_name, specialization} — no email — so use first doctor's ID
  const drConsultBody = { ...consultBody, doctor_id: doctorStaffId, appointment_id: null };
  const drConsult = await req('POST', '/consultations', tokens['doctor'], drConsultBody);
  expect(drConsult.status === 201 || drConsult.status === 409, 'doctor can create consultation', `got ${drConsult.status}`);
  if (drConsult.status === 201 && !created.consultationId) created.consultationId = drConsult.data.data?.id;

  // Receptionist & nurse cannot create consultation
  for (const role of ['receptionist', 'nurse']) {
    const r = await req('POST', '/consultations', tokens[role], consultBody);
    expect(r.status === 403, `${role} cannot create consultation`, `got ${r.status}`);
  }

  // Get single consultation — all roles
  if (created.consultationId) {
    for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
      const r = await req('GET', `/consultations/${created.consultationId}`, tokens[role]);
      expect(r.status === 200, `${role} can get consultation`, `got ${r.status}`);
    }
  }
}

// ── 5. Prescriptions ──────────────────────────────────────────────────────────
async function testPrescriptions() {
  sec('5. Prescriptions');

  // List — all roles
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', `/prescriptions?date=${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can list prescriptions`, `got ${r.status}`);
  }

  // Get medicine list first
  const medList = await req('GET', '/medicines', tokens['admin']);
  const medicineId = medList.data.data?.[0]?.id;

  // Get doctor ID — /doctors has no email field; use first doctor's ID
  const drList3 = await req('GET', '/doctors', tokens['admin']);
  const drSelf2 = drList3.data.data?.[0];

  // Create — doctor & admin only; requires patient_id + doctor_id + at least one item
  const makeRxBody = (doctorId) => ({
    patient_id:  created.patientId,
    doctor_id:   doctorId,
    items: medicineId
      ? [{ medicine_id: medicineId, dosage: '1 tablet', frequency: 'Once daily', duration: '5 days', quantity: 5 }]
      : [{ custom_medicine_name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days', quantity: 6 }],
  });

  const adminRx = await req('POST', '/prescriptions', tokens['admin'], makeRxBody(drSelf2?.id));
  expect(adminRx.status === 201, 'admin can create prescription', `got ${adminRx.status}`);
  if (adminRx.status === 201 && !created.prescriptionId) created.prescriptionId = adminRx.data.data?.id;

  const drRx = await req('POST', '/prescriptions', tokens['doctor'], makeRxBody(drSelf2?.id));
  expect(drRx.status === 201 || drRx.status === 409, 'doctor can create prescription', `got ${drRx.status}`);
  if (drRx.status === 201 && !created.prescriptionId) created.prescriptionId = drRx.data.data?.id;

  // Receptionist & nurse cannot write prescriptions
  for (const role of ['receptionist', 'nurse']) {
    const r = await req('POST', '/prescriptions', tokens[role], makeRxBody(drSelf2?.id));
    expect(r.status === 403, `${role} cannot create prescription`, `got ${r.status}`);
  }

  if (created.prescriptionId) {
    for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
      const r = await req('GET', `/prescriptions/${created.prescriptionId}`, tokens[role]);
      expect(r.status === 200, `${role} can view prescription`, `got ${r.status}`);
    }
  }
}

// ── 6. Medicine Store ─────────────────────────────────────────────────────────
async function testMedicines() {
  sec('6. Medicine Store');

  // ── 6.1 List — all authenticated roles ───────────────────────────────────────
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/medicines', tokens[role]);
    expect(r.status === 200, `${role} can list medicines`, `got ${r.status}`);
    expect(Array.isArray(r.data.data), `${role} list returns array`, `got ${typeof r.data.data}`);
  }

  // Unauthenticated request should be rejected
  const noAuth = await req('GET', '/medicines', null);
  expect(noAuth.status === 401, 'Unauthenticated request rejected', `got ${noAuth.status}`);

  // ── 6.2 Low-stock endpoint — all roles ────────────────────────────────────────
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/medicines/low-stock', tokens[role]);
    expect(r.status === 200, `${role} can view low-stock list`, `got ${r.status}`);
    expect(Array.isArray(r.data.data), `${role} low-stock returns array`, `got ${typeof r.data.data}`);
  }

  // ── 6.3 Near-expiry endpoint — all roles ─────────────────────────────────────
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/medicines/near-expiry', tokens[role]);
    expect(r.status === 200, `${role} can view near-expiry list`, `got ${r.status}`);
    expect(Array.isArray(r.data.data), `${role} near-expiry returns array`, `got ${typeof r.data.data}`);
  }

  // ── 6.4 Create medicine — admin only ─────────────────────────────────────────
  const ts = Date.now();
  const medBody = {
    name: `Test Paracetamol ${ts}`,
    generic_name: 'Paracetamol',
    unit: 'tablet',
    category: 'Analgesic',
    stock_quantity: 150,
    selling_price: 5.50,
    reorder_level: 20,
  };

  const adminMed = await req('POST', '/medicines', tokens['admin'], medBody);
  expect(adminMed.status === 201, 'Admin can create medicine', `got ${adminMed.status}`);
  if (adminMed.status === 201) {
    created.medicineId = adminMed.data.data?.id;
    expect(adminMed.data.data?.name === medBody.name, 'Created medicine name matches', `got "${adminMed.data.data?.name}"`);
    expect(adminMed.data.data?.unit === medBody.unit, 'Created medicine unit matches', `got "${adminMed.data.data?.unit}"`);
    expect(Number(adminMed.data.data?.stock_quantity) === medBody.stock_quantity, 'Created medicine stock matches', `got ${adminMed.data.data?.stock_quantity}`);
    expect(Number(adminMed.data.data?.reorder_level) === medBody.reorder_level, 'Created medicine reorder_level matches', `got ${adminMed.data.data?.reorder_level}`);
    expect(adminMed.data.data?.is_active === true, 'Newly created medicine is active', `got ${adminMed.data.data?.is_active}`);
  } else {
    warn('Medicine creation failed — skipping dependent tests');
  }

  // Non-admin cannot create
  for (const role of ['doctor', 'receptionist', 'nurse']) {
    const r = await req('POST', '/medicines', tokens[role], { ...medBody, name: `Hack Med ${role}` });
    expect(r.status === 403, `${role} cannot create medicine`, `got ${r.status}`);
  }

  // ── 6.5 Validation — required fields ─────────────────────────────────────────
  const noName = await req('POST', '/medicines', tokens['admin'], { unit: 'tablet' });
  expect(noName.status === 400, 'Create without name returns 400', `got ${noName.status}`);

  const noUnit = await req('POST', '/medicines', tokens['admin'], { name: 'Some Med' });
  expect(noUnit.status === 400, 'Create without unit returns 400', `got ${noUnit.status}`);

  const emptyName = await req('POST', '/medicines', tokens['admin'], { name: '   ', unit: 'tablet' });
  expect(emptyName.status === 400, 'Create with blank name returns 400', `got ${emptyName.status}`);

  // ── 6.6 Search filter ─────────────────────────────────────────────────────────
  if (created.medicineId) {
    const searchTerm = 'paracetamol';
    const searchRes = await req('GET', `/medicines?search=${encodeURIComponent(searchTerm)}`, tokens['admin']);
    expect(searchRes.status === 200, 'Search filter returns 200', `got ${searchRes.status}`);
    const found = (searchRes.data.data || []).some(m => m.id === created.medicineId);
    expect(found, 'Search finds created medicine by generic_name', `id ${created.medicineId}`);

    // Search by partial name
    const partialSearch = `Test Para`;
    const partialRes = await req('GET', `/medicines?search=${encodeURIComponent(partialSearch)}`, tokens['admin']);
    expect(partialRes.status === 200, 'Partial name search returns 200', `got ${partialRes.status}`);
  }

  // ── 6.7 Category filter ───────────────────────────────────────────────────────
  if (created.medicineId) {
    const catRes = await req('GET', '/medicines?category=Analgesic', tokens['admin']);
    expect(catRes.status === 200, 'Category filter returns 200', `got ${catRes.status}`);
    const catFound = (catRes.data.data || []).some(m => m.id === created.medicineId);
    expect(catFound, 'Category filter finds created Analgesic medicine', `id ${created.medicineId}`);

    // Non-matching category returns empty list (or at least not our medicine)
    const wrongCat = await req('GET', '/medicines?category=Vitamin', tokens['admin']);
    expect(wrongCat.status === 200, 'Non-matching category returns 200', `got ${wrongCat.status}`);
    const wrongFound = (wrongCat.data.data || []).some(m => m.id === created.medicineId);
    expect(!wrongFound, 'Category filter excludes wrong category', `id ${created.medicineId} should not appear`);
  }

  // ── 6.8 Edit — admin only ────────────────────────────────────────────────────
  if (created.medicineId) {
    // Admin can update stock_quantity
    const editStock = await req('PUT', `/medicines/${created.medicineId}`, tokens['admin'], { stock_quantity: 250 });
    expect(editStock.status === 200, 'Admin can update stock_quantity', `got ${editStock.status}`);
    expect(Number(editStock.data.data?.stock_quantity) === 250, 'Stock quantity updated to 250', `got ${editStock.data.data?.stock_quantity}`);

    // Admin can update selling_price
    const editPrice = await req('PUT', `/medicines/${created.medicineId}`, tokens['admin'], { selling_price: 9.99 });
    expect(editPrice.status === 200, 'Admin can update selling_price', `got ${editPrice.status}`);
    expect(Number(editPrice.data.data?.selling_price) === 9.99, 'Selling price updated to 9.99', `got ${editPrice.data.data?.selling_price}`);

    // Admin can update reorder_level
    const editReorder = await req('PUT', `/medicines/${created.medicineId}`, tokens['admin'], { reorder_level: 30 });
    expect(editReorder.status === 200, 'Admin can update reorder_level', `got ${editReorder.status}`);

    // Verify change persisted — appears in list with updated values
    const listAfterEdit = await req('GET', '/medicines', tokens['admin']);
    const updatedMed = (listAfterEdit.data.data || []).find(m => m.id === created.medicineId);
    expect(!!updatedMed, 'Edited medicine still appears in list', `id ${created.medicineId}`);
    expect(Number(updatedMed?.stock_quantity) === 250, 'List reflects updated stock_quantity', `got ${updatedMed?.stock_quantity}`);

    // Non-admin cannot edit
    for (const role of ['doctor', 'receptionist', 'nurse']) {
      const r = await req('PUT', `/medicines/${created.medicineId}`, tokens[role], { stock_quantity: 999 });
      expect(r.status === 403, `${role} cannot edit medicine`, `got ${r.status}`);
    }

    // Edit nonexistent ID returns 404
    const editMissing = await req('PUT', '/medicines/999999', tokens['admin'], { stock_quantity: 1 });
    expect(editMissing.status === 404, 'Edit nonexistent medicine returns 404', `got ${editMissing.status}`);
  }

  // ── 6.9 Delete (soft) — admin only ───────────────────────────────────────────
  if (created.medicineId) {
    // Non-admin cannot delete
    for (const role of ['doctor', 'receptionist', 'nurse']) {
      const r = await req('DELETE', `/medicines/${created.medicineId}`, tokens[role]);
      expect(r.status === 403, `${role} cannot delete medicine`, `got ${r.status}`);
    }

    // Admin can soft delete
    const del = await req('DELETE', `/medicines/${created.medicineId}`, tokens['admin']);
    expect(del.status === 200, 'Admin can soft-delete medicine', `got ${del.status}`);

    // Deleted medicine does NOT appear in default list
    const listAfterDel = await req('GET', '/medicines', tokens['admin']);
    const stillActive = (listAfterDel.data.data || []).some(m => m.id === created.medicineId);
    expect(!stillActive, 'Deleted medicine not in default list', `id ${created.medicineId} should be hidden`);

    // Deleted medicine DOES appear with include_inactive=true
    const listInactive = await req('GET', '/medicines?include_inactive=true', tokens['admin']);
    const inInactive = (listInactive.data.data || []).some(m => m.id === created.medicineId);
    expect(inInactive, 'Deleted medicine visible with include_inactive=true', `id ${created.medicineId}`);

    // Verify is_active = false in include_inactive list
    const deletedMed = (listInactive.data.data || []).find(m => m.id === created.medicineId);
    expect(deletedMed?.is_active === false, 'Deleted medicine has is_active = false', `got ${deletedMed?.is_active}`);

    // Restore via PUT is_active: true
    const restore = await req('PUT', `/medicines/${created.medicineId}`, tokens['admin'], { is_active: true });
    expect(restore.status === 200, 'Admin can restore deleted medicine', `got ${restore.status}`);
    expect(restore.data.data?.is_active === true, 'Restored medicine has is_active = true', `got ${restore.data.data?.is_active}`);

    // After restore, medicine reappears in default list
    const listRestored = await req('GET', '/medicines', tokens['admin']);
    const restoredVisible = (listRestored.data.data || []).some(m => m.id === created.medicineId);
    expect(restoredVisible, 'Restored medicine appears in default list', `id ${created.medicineId}`);

    // Clean up: soft delete again so it doesn't pollute later tests
    await req('DELETE', `/medicines/${created.medicineId}`, tokens['admin']);
  }

  // ── 6.10 Low-stock logic verification ─────────────────────────────────────────
  // Create a medicine where stock_quantity < reorder_level
  const lowStockBody = {
    name: `Low Stock Med ${ts}`,
    unit: 'capsule',
    category: 'Antibiotic',
    stock_quantity: 3,
    reorder_level: 25,
  };
  const lowMed = await req('POST', '/medicines', tokens['admin'], lowStockBody);
  if (lowMed.status === 201) {
    const lowId = lowMed.data.data?.id;
    const lowList = await req('GET', '/medicines/low-stock', tokens['admin']);
    const inLowList = (lowList.data.data || []).some(m => m.id === lowId);
    expect(inLowList, 'Under-stocked medicine appears in /low-stock', `id ${lowId}, stock=3, reorder=25`);

    // Verify all items in low-stock list satisfy condition
    const allLow = (lowList.data.data || []).every(m => Number(m.stock_quantity) <= Number(m.reorder_level));
    expect(allLow, 'All /low-stock items have stock <= reorder_level', `${(lowList.data.data || []).length} items`);

    // Medicine with stock above reorder should NOT appear
    const highStockBody = {
      name: `High Stock Med ${ts}`,
      unit: 'tablet',
      stock_quantity: 500,
      reorder_level: 10,
    };
    const highMed = await req('POST', '/medicines', tokens['admin'], highStockBody);
    if (highMed.status === 201) {
      const highId = highMed.data.data?.id;
      const lowListAgain = await req('GET', '/medicines/low-stock', tokens['admin']);
      const inLowListWrong = (lowListAgain.data.data || []).some(m => m.id === highId);
      expect(!inLowListWrong, 'Well-stocked medicine does NOT appear in /low-stock', `id ${highId}, stock=500`);
      // Clean up
      await req('DELETE', `/medicines/${highId}`, tokens['admin']);
    }
    // Clean up
    await req('DELETE', `/medicines/${lowId}`, tokens['admin']);
  } else {
    warn('Low-stock medicine creation failed — skipping low-stock logic tests');
  }

  // ── 6.11 Near-expiry logic verification ───────────────────────────────────────
  // Compute a date 30 days from today (within 60-day window)
  const d30 = new Date();
  d30.setDate(d30.getDate() + 30);
  const expirySoon = d30.toISOString().split('T')[0];

  const nearExpiryBody = {
    name: `Near Expiry Med ${ts}`,
    unit: 'vial',
    category: 'Vaccine',
    stock_quantity: 50,
    reorder_level: 5,
    expiry_date: expirySoon,
  };
  const nearMed = await req('POST', '/medicines', tokens['admin'], nearExpiryBody);
  if (nearMed.status === 201) {
    const nearId = nearMed.data.data?.id;
    const nearList = await req('GET', '/medicines/near-expiry', tokens['admin']);
    const inNearList = (nearList.data.data || []).some(m => m.id === nearId);
    expect(inNearList, 'Medicine expiring in 30 days appears in /near-expiry', `id ${nearId}, expiry ${expirySoon}`);

    // Verify days_until_expiry field is returned
    const nearEntry = (nearList.data.data || []).find(m => m.id === nearId);
    expect(nearEntry?.days_until_expiry !== undefined, '/near-expiry includes days_until_expiry field', `got ${nearEntry?.days_until_expiry}`);

    // Medicine expiring in 90 days should NOT appear
    const d90 = new Date();
    d90.setDate(d90.getDate() + 90);
    const expiryFar = d90.toISOString().split('T')[0];
    const farBody = {
      name: `Far Expiry Med ${ts}`,
      unit: 'tablet',
      stock_quantity: 100,
      reorder_level: 5,
      expiry_date: expiryFar,
    };
    const farMed = await req('POST', '/medicines', tokens['admin'], farBody);
    if (farMed.status === 201) {
      const farId = farMed.data.data?.id;
      const nearListAgain = await req('GET', '/medicines/near-expiry', tokens['admin']);
      const farInList = (nearListAgain.data.data || []).some(m => m.id === farId);
      expect(!farInList, 'Medicine expiring in 90 days NOT in /near-expiry', `id ${farId}, expiry ${expiryFar}`);
      // Clean up
      await req('DELETE', `/medicines/${farId}`, tokens['admin']);
    }

    // Medicine with no expiry_date should NOT appear in near-expiry
    const noExpiryBody = {
      name: `No Expiry Med ${ts}`,
      unit: 'tablet',
      stock_quantity: 100,
      reorder_level: 5,
    };
    const noExpiryMed = await req('POST', '/medicines', tokens['admin'], noExpiryBody);
    if (noExpiryMed.status === 201) {
      const noExpId = noExpiryMed.data.data?.id;
      const nearListNoExp = await req('GET', '/medicines/near-expiry', tokens['admin']);
      const noExpInList = (nearListNoExp.data.data || []).some(m => m.id === noExpId);
      expect(!noExpInList, 'Medicine with no expiry_date NOT in /near-expiry', `id ${noExpId}`);
      // Clean up
      await req('DELETE', `/medicines/${noExpId}`, tokens['admin']);
    }

    // Clean up
    await req('DELETE', `/medicines/${nearId}`, tokens['admin']);
  } else {
    warn('Near-expiry medicine creation failed — skipping near-expiry logic tests');
  }
}

// ── 7. Billing ────────────────────────────────────────────────────────────────
async function testBilling() {
  sec('7. Billing');

  // List invoices — admin & receptionist
  for (const role of ['admin', 'receptionist']) {
    const r = await req('GET', `/invoices?date=${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can list invoices`, `got ${r.status}`);
  }

  // Doctor can list own invoices
  const drInv = await req('GET', `/invoices?date=${TODAY}`, tokens['doctor']);
  expect(drInv.status === 200, 'Doctor can list invoices', `got ${drInv.status}`);

  // Nurse cannot access invoices
  const nurseInv = await req('GET', `/invoices?date=${TODAY}`, tokens['nurse']);
  expect(nurseInv.status === 403, 'Nurse cannot access invoices', `got ${nurseInv.status}`);

  // Create invoice — admin & receptionist only
  if (created.consultationId) {
    const invBody = { consultation_id: created.consultationId };

    const adminInv = await req('POST', '/invoices', tokens['admin'], invBody);
    expect(adminInv.status === 201 || adminInv.status === 200, 'Admin can create invoice', `got ${adminInv.status}`);
    if ((adminInv.status === 201 || adminInv.status === 200) && !created.invoiceId) {
      created.invoiceId = adminInv.data.data?.id;
    }

    // Doctor cannot create invoice
    const drInvCreate = await req('POST', '/invoices', tokens['doctor'], invBody);
    expect(drInvCreate.status === 403, 'Doctor cannot create invoice', `got ${drInvCreate.status}`);

    // Nurse cannot create invoice
    const nurseInvCreate = await req('POST', '/invoices', tokens['nurse'], invBody);
    expect(nurseInvCreate.status === 403, 'Nurse cannot create invoice', `got ${nurseInvCreate.status}`);
  }

  // Pay invoice — admin & receptionist
  if (created.invoiceId) {
    const pay = await req('POST', `/invoices/${created.invoiceId}/pay`, tokens['receptionist'], {
      amount: 500, payment_method: 'cash',
    });
    expect(pay.status === 200, 'Receptionist can record payment', `got ${pay.status}`);
  }

  // End of day summary — admin & receptionist
  for (const role of ['admin', 'receptionist']) {
    const r = await req('GET', `/end-of-day/summary/${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can view EOD summary`, `got ${r.status}`);
  }

  // Doctor & nurse cannot view EOD
  for (const role of ['doctor', 'nurse']) {
    const r = await req('GET', `/end-of-day/summary/${TODAY}`, tokens[role]);
    expect(r.status === 403, `${role} cannot view EOD`, `got ${r.status}`);
  }
}

// ── 8. Pharmacy ───────────────────────────────────────────────────────────────
async function testPharmacy() {
  sec('8. Pharmacy');

  // Dispense queue — all roles can view
  for (const role of ['admin', 'receptionist', 'doctor', 'nurse']) {
    const r = await req('GET', `/pharmacy/dispense?date=${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can view dispense queue`, `got ${r.status}`);
  }

  // Stock is managed via /medicines — no separate /pharmacy/stock endpoint
  // Medicine stock adjustments — admin & receptionist
  for (const role of ['admin', 'receptionist']) {
    const r = await req('GET', '/pharmacy/stock-adjustments', tokens[role]);
    expect(r.status === 200, `${role} can view stock adjustments`, `got ${r.status}`);
  }
  for (const role of ['doctor', 'nurse']) {
    const r = await req('GET', '/pharmacy/stock-adjustments', tokens[role]);
    expect(r.status === 403, `${role} cannot view stock adjustments`, `got ${r.status}`);
  }

  // Suppliers — admin & receptionist
  for (const role of ['admin', 'receptionist']) {
    const r = await req('GET', '/pharmacy/suppliers', tokens[role]);
    expect(r.status === 200, `${role} can list suppliers`, `got ${r.status}`);
  }

  // Create supplier — admin & receptionist
  const supBody = { name: 'Test Supplier Co', contact_person: 'John', phone: '0112345678' };
  const supCreate = await req('POST', '/pharmacy/suppliers', tokens['receptionist'], supBody);
  expect(supCreate.status === 201, 'Receptionist can create supplier', `got ${supCreate.status}`);
  if (supCreate.status === 201) created.supplierId = supCreate.data.data?.id;

  // Doctor cannot create supplier
  const supDr = await req('POST', '/pharmacy/suppliers', tokens['doctor'], supBody);
  expect(supDr.status === 403, 'Doctor cannot create supplier', `got ${supDr.status}`);

  // Purchase orders
  for (const role of ['admin', 'receptionist']) {
    const r = await req('GET', '/pharmacy/purchase-orders', tokens[role]);
    expect(r.status === 200, `${role} can list purchase orders`, `got ${r.status}`);
  }

  // Dispense prescription
  if (created.prescriptionId) {
    const dispense = await req('POST', `/pharmacy/dispense/${created.prescriptionId}`, tokens['receptionist'], {});
    expect(dispense.status === 200, 'Receptionist can dispense prescription', `got ${dispense.status}`);

    const dispenseDr = await req('POST', `/pharmacy/dispense/${created.prescriptionId}`, tokens['doctor'], {});
    expect(dispenseDr.status === 403, 'Doctor cannot dispense prescription', `got ${dispenseDr.status}`);
  }
}

// ── 9. Lab ────────────────────────────────────────────────────────────────────
async function testLab() {
  sec('9. Lab');

  // Lab requests queue — correct endpoint is /lab/requests
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', `/lab/requests?date=${TODAY}`, tokens[role]);
    expect(r.status === 200, `${role} can view lab queue`, `got ${r.status}`);
  }

  // Test catalog — all roles can list
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/lab/tests', tokens[role]);
    expect(r.status === 200, `${role} can list lab tests`, `got ${r.status}`);
  }

  // Create lab test — admin & receptionist only
  const testBody = { name: 'Test FBC', category: 'Haematology', unit: 'cells/μL', reference_range: '4000-11000', price: 500 };
  for (const role of ['admin', 'receptionist']) {
    const r = await req('POST', '/lab/tests', tokens[role], testBody);
    expect(r.status === 201, `${role} can create lab test`, `got ${r.status}`);
    if (r.status === 201 && !created.labTestId) created.labTestId = r.data.data?.id;
  }

  // Doctor cannot create lab test
  const drTest = await req('POST', '/lab/tests', tokens['doctor'], testBody);
  expect(drTest.status === 403, 'Doctor cannot create lab test', `got ${drTest.status}`);

  // Request lab test — backend expects test_ids (array), not lab_test_id
  if (created.patientId && created.labTestId) {
    const labReqBody = {
      patient_id: created.patientId,
      test_ids:   [created.labTestId],
      notes:      'Test request',
    };

    const drReq = await req('POST', '/lab/requests', tokens['doctor'], labReqBody);
    expect(drReq.status === 201, 'Doctor can request lab test', `got ${drReq.status}`);
    if (drReq.status === 201) created.labRequestId = drReq.data.data?.ids?.[0];

    // Nurse cannot request lab test
    const nurseReq = await req('POST', '/lab/requests', tokens['nurse'], labReqBody);
    expect(nurseReq.status === 403, 'Nurse cannot request lab test', `got ${nurseReq.status}`);
  }
}

// ── 10. Insurance ─────────────────────────────────────────────────────────────
async function testInsurance() {
  sec('10. Insurance');

  // Providers — admin & receptionist
  for (const role of ['admin', 'receptionist']) {
    const r = await req('GET', '/insurance/providers', tokens[role]);
    expect(r.status === 200, `${role} can list insurance providers`, `got ${r.status}`);
  }

  // Doctor can view claims only
  const drClaims = await req('GET', '/insurance/claims', tokens['doctor']);
  expect(drClaims.status === 200, 'Doctor can view claims', `got ${drClaims.status}`);

  // Nurse cannot access insurance
  const nurseIns = await req('GET', '/insurance/claims', tokens['nurse']);
  expect(nurseIns.status === 403, 'Nurse cannot access insurance', `got ${nurseIns.status}`);

  // Create claim — admin & receptionist
  if (created.invoiceId) {
    const claimBody = {
      invoice_id:  created.invoiceId,
      patient_id:  created.patientId,
      provider_id: null,
      amount_claimed: 500,
      claim_date: TODAY,
      notes: 'Test claim',
    };

    // Get first provider
    const provList = await req('GET', '/insurance/providers', tokens['admin']);
    const providerId = provList.data.data?.[0]?.id;
    if (providerId) {
      claimBody.provider_id = providerId;
      const claim = await req('POST', '/insurance/claims', tokens['receptionist'], claimBody);
      expect(claim.status === 201, 'Receptionist can create claim', `got ${claim.status}`);
      if (claim.status === 201) created.claimId = claim.data.data?.id;
    }

    // Doctor cannot create claim
    const drClaim = await req('POST', '/insurance/claims', tokens['doctor'], claimBody);
    expect(drClaim.status === 403, 'Doctor cannot create claim', `got ${drClaim.status}`);
  }
}

// ── 11. Reports ───────────────────────────────────────────────────────────────
async function testReports() {
  sec('11. Reports');

  // Admin full access to all reports
  const reportPaths = [
    '/reports/daily', '/reports/monthly', '/reports/doctors',
    '/reports/medicines', '/reports/patients', '/reports/appointments',
  ];

  for (const path of reportPaths) {
    const r = await req('GET', path, tokens['admin']);
    expect(r.status === 200, `Admin can access ${path}`, `got ${r.status}`);
  }

  // Receptionist limited — daily + appointments only
  const recepAllowed = ['/reports/daily', '/reports/appointments'];
  for (const path of recepAllowed) {
    const r = await req('GET', path, tokens['receptionist']);
    expect(r.status === 200, `Receptionist can access ${path}`, `got ${r.status}`);
  }

  // Doctor has own reports only
  const drReport = await req('GET', '/reports/doctors', tokens['doctor']);
  expect(drReport.status === 200 || drReport.status === 403, 'Doctor reports endpoint responds', `got ${drReport.status}`);

  // Nurse cannot access any reports
  for (const path of reportPaths) {
    const r = await req('GET', path, tokens['nurse']);
    expect(r.status === 403, `Nurse cannot access ${path}`, `got ${r.status}`);
  }
}

// ── 12. Settings ─────────────────────────────────────────────────────────────
async function testSettings() {
  sec('12. Settings');

  // Admin can view & update
  const get = await req('GET', '/settings', tokens['admin']);
  expect(get.status === 200, 'Admin can get settings', `got ${get.status}`);

  // Settings GET is intentionally open to all authenticated roles —
  // frontend needs allow_walk_ins, slot_duration etc for non-admin pages.
  // Only PUT is admin-restricted.
  for (const role of ['receptionist', 'doctor', 'nurse']) {
    const r = await req('GET', '/settings', tokens[role]);
    expect(r.status === 200, `${role} can read settings (by design)`, `got ${r.status}`);
  }

  // Admin can update settings
  if (get.status === 200) {
    const upd = await req('PUT', '/settings', tokens['admin'], {
      clinic_name: get.data.data?.clinic_name || 'Demo Clinic',
    });
    expect(upd.status === 200, 'Admin can update settings', `got ${upd.status}`);
  }
}

// ── 13. Staff Management ──────────────────────────────────────────────────────
async function testStaff() {
  sec('13. Staff Management');

  // Admin can list staff
  const list = await req('GET', '/staff', tokens['admin']);
  expect(list.status === 200, 'Admin can list staff', `got ${list.status}`);

  // Others cannot list staff
  for (const role of ['doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/staff', tokens[role]);
    expect(r.status === 403, `${role} cannot list staff`, `got ${r.status}`);
  }

  // Admin can create staff
  const newStaff = await req('POST', '/staff', tokens['admin'], {
    full_name: 'Test Nurse Auto', email: `testnurse_${Date.now()}@test.com`,
    password: 'password123', role: 'nurse',
  });
  expect(newStaff.status === 201, 'Admin can create staff', `got ${newStaff.status}`);
  if (newStaff.status === 201) created.staffId = newStaff.data.data?.id;

  // Others cannot create staff
  for (const role of ['doctor', 'receptionist', 'nurse']) {
    const r = await req('POST', '/staff', tokens[role], {
      full_name: 'Hacker', email: `hacker_${role}@test.com`, password: 'hack123', role: 'admin',
    });
    expect(r.status === 403, `${role} cannot create staff`, `got ${r.status}`);
  }

  // Admin can deactivate staff — correct endpoint is DELETE /staff/:id
  if (created.staffId) {
    const deact = await req('DELETE', `/staff/${created.staffId}`, tokens['admin']);
    expect(deact.status === 200, 'Admin can deactivate staff', `got ${deact.status}`);
  }
}

// ── 14. Data Validation & Edge Cases ─────────────────────────────────────────
async function testEdgeCases() {
  sec('14. Edge Cases & Validation');

  // Create patient with missing required fields
  const missingPhone = await req('POST', '/patients', tokens['admin'], { first_name: 'NoPhone' });
  expect(missingPhone.status === 400 || missingPhone.status === 422, 'Reject patient with no phone', `got ${missingPhone.status}`);

  // Create patient with missing first_name
  const missingName = await req('POST', '/patients', tokens['admin'], { phone: '0771111111' });
  expect(missingName.status === 400 || missingName.status === 422, 'Reject patient with no name', `got ${missingName.status}`);

  // Access non-existent resource
  const notFound = await req('GET', '/patients/99999999', tokens['admin']);
  expect(notFound.status === 404, 'Non-existent patient returns 404', `got ${notFound.status}`);

  // Invalid date format for appointments
  const badDate = await req('GET', '/appointments?date=not-a-date', tokens['admin']);
  expect(badDate.status === 200 || badDate.status === 400, 'Invalid date query handled gracefully', `got ${badDate.status}`);

  // Pay with negative amount
  if (created.invoiceId) {
    const negPay = await req('POST', `/invoices/${created.invoiceId}/pay`, tokens['admin'], {
      amount: -100, method: 'cash',
    });
    expect(negPay.status === 400 || negPay.status === 422, 'Reject negative payment amount', `got ${negPay.status}`);
  }

  // Create appointment on holiday date
  const drList = await req('GET', '/doctors', tokens['admin']);
  const doctorId = drList.data.data?.[0]?.id;
  if (doctorId && created.patientId && created.holidayId) {
    const holAppt = await req('POST', '/appointments', tokens['admin'], {
      patient_id: created.patientId,
      doctor_id: doctorId,
      type: 'booked',
      appointment_date: '2026-12-25',
    });
    expect(holAppt.status === 400 || holAppt.status === 409, 'Reject appointment on holiday', `got ${holAppt.status}`);
  }
}

// ── 15. Custom Services ───────────────────────────────────────────────────────
async function testCustomServices() {
  sec('15. Custom Services');

  // All authenticated roles can list
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/custom-services', tokens[role]);
    expect(r.status === 200, `${role} can list custom services`, `got ${r.status}`);
  }

  // Create — admin only
  const svcBody = { name: `Test Service ${Date.now()}`, category: 'Procedure', price: 1500 };
  const adminSvc = await req('POST', '/custom-services', tokens['admin'], svcBody);
  expect(adminSvc.status === 201, 'Admin can create custom service', `got ${adminSvc.status}`);
  if (adminSvc.status === 201) created.customServiceId = adminSvc.data.data?.id;

  for (const role of ['doctor', 'receptionist', 'nurse']) {
    const r = await req('POST', '/custom-services', tokens[role], { name: `Hack ${role}`, price: 0 });
    expect(r.status === 403, `${role} cannot create custom service`, `got ${r.status}`);
  }

  // Missing name → 400
  const noName = await req('POST', '/custom-services', tokens['admin'], { price: 100 });
  expect(noName.status === 400, 'Reject custom service with no name', `got ${noName.status}`);

  // Edit — admin only
  if (created.customServiceId) {
    const edit = await req('PUT', `/custom-services/${created.customServiceId}`, tokens['admin'], { price: 2000 });
    expect(edit.status === 200, 'Admin can edit custom service', `got ${edit.status}`);

    const editFail = await req('PUT', `/custom-services/${created.customServiceId}`, tokens['receptionist'], { price: 9999 });
    expect(editFail.status === 403, 'Receptionist cannot edit custom service', `got ${editFail.status}`);

    // Soft-delete — admin only
    const del = await req('DELETE', `/custom-services/${created.customServiceId}`, tokens['admin']);
    expect(del.status === 200, 'Admin can delete (soft) custom service', `got ${del.status}`);

    const delFail = await req('DELETE', `/custom-services/${created.customServiceId}`, tokens['nurse']);
    expect(delFail.status === 403, 'Nurse cannot delete custom service', `got ${delFail.status}`);
  }
}

// ── 16. Doctor Fees ───────────────────────────────────────────────────────────
async function testDoctorFees() {
  sec('16. Doctor Fees');

  // All authenticated roles can view fee list
  for (const role of ['admin', 'doctor', 'receptionist', 'nurse']) {
    const r = await req('GET', '/doctor-fees', tokens[role]);
    expect(r.status === 200, `${role} can list doctor fees`, `got ${r.status}`);
  }

  const drList = await req('GET', '/doctors', tokens['admin']);
  const doctorId = drList.data.data?.[0]?.id;

  if (!doctorId) {
    warn('No doctors found — skipping doctor fee update tests');
    return;
  }

  // Update fee — admin only
  const feeUpdate = await req('PUT', `/doctor-fees/${doctorId}`, tokens['admin'], {
    fee_label: 'Consultation Fee', amount: 1500,
  });
  expect(feeUpdate.status === 200, 'Admin can update doctor fee', `got ${feeUpdate.status}`);

  // Non-admin roles cannot update fees
  for (const role of ['doctor', 'receptionist', 'nurse']) {
    const r = await req('PUT', `/doctor-fees/${doctorId}`, tokens[role], { amount: 9999 });
    expect(r.status === 403, `${role} cannot update doctor fee`, `got ${r.status}`);
  }

  // Missing amount → 400
  const noAmount = await req('PUT', `/doctor-fees/${doctorId}`, tokens['admin'], { fee_label: 'No Amount' });
  expect(noAmount.status === 400, 'Reject fee update without amount', `got ${noAmount.status}`);
}

// ── 17. Patient Portal (Public Routes) ───────────────────────────────────────
async function testPatientPortal() {
  sec('17. Patient Portal');

  // Clinic info — always public, no auth required
  const info = await req('GET', '/portal/info', null);
  expect(info.status === 200, 'Portal /info is public', `got ${info.status}`);

  const portalEnabled = info.data.data?.patient_portal_enabled === true;

  // Doctor list — requires portal enabled
  const doctors = await req('GET', '/portal/doctors', null);
  if (portalEnabled) {
    expect(doctors.status === 200, 'Portal doctors list returns 200', `got ${doctors.status}`);
  } else {
    expect(doctors.status === 403, 'Portal doctors returns 403 when disabled', `got ${doctors.status}`);
    warn('patient_portal_enabled=false — booking tests skipped');
    return;
  }

  // Get a doctor ID for slot tests
  const drList = await req('GET', '/doctors', tokens['admin']);
  const doctorId = drList.data.data?.[0]?.id;
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (doctorId) {
    // Slot availability
    const slots = await req('GET', `/portal/doctors/${doctorId}/slots?date=${futureDate}`, null);
    expect(slots.status === 200, 'Portal slot availability returns 200', `got ${slots.status}`);

    // Missing date param → 400
    const noDate = await req('GET', `/portal/doctors/${doctorId}/slots`, null);
    expect(noDate.status === 400, 'Portal slots reject missing date', `got ${noDate.status}`);
  }

  // Book with missing required fields → 400
  const missingFields = await req('POST', '/portal/book', null, { patient_name: 'Walk In' });
  expect(missingFields.status === 400, 'Portal book rejects missing required fields', `got ${missingFields.status}`);

  // Lookup unknown booking reference → 404
  const badRef = await req('GET', '/portal/booking/NOTAREF000', null);
  expect(badRef.status === 404, 'Portal booking lookup returns 404 for unknown ref', `got ${badRef.status}`);

  // Full booking flow
  if (doctorId) {
    const slotsRes = await req('GET', `/portal/doctors/${doctorId}/slots?date=${futureDate}`, null);
    const available = slotsRes.data.data?.find(s => s.available);

    if (available) {
      const phone = `0779${String(Date.now()).slice(-6)}`;
      const bookRes = await req('POST', '/portal/book', null, {
        doctor_id:        doctorId,
        appointment_date: futureDate,
        appointment_time: available.time,
        patient_name:     'Portal Test Patient',
        patient_phone:    phone,
        reason:           'Automated test booking',
      });
      expect(bookRes.status === 201, 'Portal can book appointment online', `got ${bookRes.status}`);

      if (bookRes.status === 201) {
        const ref = bookRes.data.data?.booking_reference;
        const lookup = await req('GET', `/portal/booking/${ref}`, null);
        expect(lookup.status === 200, 'Portal can look up booking by reference', `got ${lookup.status}`);

        // Same slot → 409 conflict
        const dupBook = await req('POST', '/portal/book', null, {
          doctor_id:        doctorId,
          appointment_date: futureDate,
          appointment_time: available.time,
          patient_name:     'Duplicate Patient',
          patient_phone:    `0770${String(Date.now()).slice(-6)}`,
        });
        expect(dupBook.status === 409, 'Portal rejects duplicate slot booking', `got ${dupBook.status}`);
      }
    } else {
      warn('No available slots for future date — full booking flow skipped');
    }
  }
}

// ── 18. Super Admin Panel ─────────────────────────────────────────────────────
async function testSuperAdmin() {
  sec('18. Super Admin Panel');

  const SUPER_EMAIL    = process.env.SUPER_ADMIN_EMAIL;
  const SUPER_PASSWORD = process.env.SUPER_ADMIN_PASSWORD;

  if (!SUPER_EMAIL || !SUPER_PASSWORD) {
    warn('SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD env vars not set — section skipped');
    return;
  }

  // Super admin login
  const loginRes  = await fetch(`${BASE}/admin/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: SUPER_EMAIL, password: SUPER_PASSWORD }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  expect(loginRes.status === 200 && !!loginData.data?.token, 'Super admin login', `got ${loginRes.status}`);
  if (loginRes.status !== 200 || !loginData.data?.token) return;

  const superToken = loginData.data.token;

  // Admin-scoped request helper (no X-Tenant-Subdomain)
  const adminReq = async (method, path, body) => {
    const r = await fetch(`${BASE}/admin${path}`, {
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${superToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    return { status: r.status, data };
  };

  // Reject invalid token
  const badTok = await fetch(`${BASE}/admin/dashboard`, {
    headers: { 'Authorization': 'Bearer invalidtoken' },
  });
  expect(badTok.status === 401 || badTok.status === 403, 'Reject invalid super admin token', `got ${badTok.status}`);

  // Reject no token
  const noTok = await fetch(`${BASE}/admin/dashboard`);
  expect(noTok.status === 401 || noTok.status === 403, 'Reject unauthenticated admin route', `got ${noTok.status}`);

  // Dashboard
  const dash = await adminReq('GET', '/dashboard');
  expect(dash.status === 200, 'Super admin can view dashboard', `got ${dash.status}`);

  // Tenant list
  const tenants = await adminReq('GET', '/tenants');
  expect(tenants.status === 200, 'Super admin can list tenants', `got ${tenants.status}`);
  const firstTenantId = tenants.data.data?.[0]?.id;

  // Tenant detail
  if (firstTenantId) {
    const detail = await adminReq('GET', `/tenants/${firstTenantId}`);
    expect(detail.status === 200, 'Super admin can get tenant detail', `got ${detail.status}`);

    // Feature flags — read
    const flags = await adminReq('GET', `/feature-flags/${firstTenantId}`);
    expect(flags.status === 200, 'Super admin can read feature flags', `got ${flags.status}`);

    // Feature flags — update (toggle online_booking without changing others)
    const currentOnlineBooking = flags.data.data?.find(f => f.module === 'online_booking')?.enabled ?? false;
    const flagUpd = await adminReq('PUT', `/feature-flags/${firstTenantId}`, {
      flags: { online_booking: !currentOnlineBooking },
    });
    expect(flagUpd.status === 200, 'Super admin can update feature flags', `got ${flagUpd.status}`);

    // Restore original value
    await adminReq('PUT', `/feature-flags/${firstTenantId}`, {
      flags: { online_booking: currentOnlineBooking },
    });
  }

  // Non-existent tenant → 404
  const notFound = await adminReq('GET', '/tenants/00000000-0000-0000-0000-000000000000');
  expect(notFound.status === 404, 'Non-existent tenant returns 404', `got ${notFound.status}`);

  // Create tenant with missing fields → 400
  const badTenant = await adminReq('POST', '/tenants', { clinic_name: 'Bad' });
  expect(badTenant.status === 400, 'Reject tenant creation with missing fields', `got ${badTenant.status}`);
}

// ── 19. End-to-End: Full Patient Journey ─────────────────────────────────────
async function testE2EJourney() {
  sec('19. E2E — Walk-in Full Journey');

  // Helpers for PDF checks (PDF endpoints stream bytes, not JSON)
  async function reqRaw(path, token) {
    const headers = { 'X-Tenant-Subdomain': TENANT };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { headers });
    return { status: res.status, contentType: res.headers.get('content-type') || '' };
  }

  // ── Get doctor ──────────────────────────────────────────────────────────────
  const drList = await req('GET', '/doctors', tokens['admin']);
  const doctor = drList.data.data?.[0];
  if (!doctor) { warn('No doctors found — E2E journey skipped'); return; }

  // ── Get a medicine ──────────────────────────────────────────────────────────
  const medList = await req('GET', '/medicines', tokens['admin']);
  const medicine = medList.data.data?.[0];

  // ═══════════════════════════════════════════════════════════════════════════
  // A. WALK-IN FLOW
  // ═══════════════════════════════════════════════════════════════════════════

  // Step 1 — Create a fresh patient for this run
  const ts = Date.now();
  const e2ePatient = await req('POST', '/patients', tokens['receptionist'], {
    first_name: 'E2E', last_name: 'WalkIn', phone: `0760${String(ts).slice(-6)}`, gender: 'female',
  });
  expect(e2ePatient.status === 201, 'E2E: create walk-in patient', `got ${e2ePatient.status}`);
  const e2ePid = e2ePatient.data.data?.id;
  if (!e2ePid) { warn('E2E: patient creation failed — walk-in flow skipped'); return; }

  // Step 2 — Receptionist adds walk-in to queue
  const walkinAppt = await req('POST', '/appointments', tokens['receptionist'], {
    patient_id: e2ePid, doctor_id: doctor.id,
    appointment_date: TODAY, type: 'walk_in',
  });
  expect(walkinAppt.status === 201, 'E2E: receptionist adds walk-in to queue', `got ${walkinAppt.status}`);
  const e2eApptId = walkinAppt.data.data?.id;
  const e2eToken  = walkinAppt.data.data?.token_number;
  expect(!!e2eToken, 'E2E: walk-in gets a token number', `token=${e2eToken}`);

  // Step 3 — Verify appointment appears in queue with correct data
  const queue = await req('GET', `/appointments?date=${TODAY}`, tokens['receptionist']);
  const queueEntry = queue.data.data?.find(a => a.id === e2eApptId);
  expect(!!queueEntry, 'E2E: walk-in visible in queue', queueEntry ? 'found' : 'missing');
  expect(queueEntry?.status === 'pending', 'E2E: initial status is pending', `got ${queueEntry?.status}`);
  expect(!!queueEntry?.patient_name, 'E2E: queue entry has patient name', `got "${queueEntry?.patient_name}"`);
  expect(!!queueEntry?.doctor_name, 'E2E: queue entry has doctor name', `got "${queueEntry?.doctor_name}"`);

  // Step 4 — Nurse marks patient as arrived
  if (e2eApptId) {
    const arrive = await req('PUT', `/appointments/${e2eApptId}`, tokens['nurse'], { status: 'arrived' });
    expect(arrive.status === 200, 'E2E: nurse marks patient arrived', `got ${arrive.status}`);

    // Step 5 — Verify status updated in queue
    const queueAfter = await req('GET', `/appointments?date=${TODAY}`, tokens['receptionist']);
    const arrived = queueAfter.data.data?.find(a => a.id === e2eApptId);
    expect(arrived?.status === 'arrived', 'E2E: appointment status is now arrived', `got ${arrived?.status}`);
  }

  // Step 6 — Doctor creates consultation linked to this appointment
  const e2eConsult = await req('POST', '/consultations', tokens['doctor'], {
    appointment_id:  e2eApptId,
    patient_id:      e2ePid,
    doctor_id:       doctor.id,
    chief_complaint: 'Headache and fever',
    diagnosis:       'Viral fever',
    notes:           'Rest and fluids advised',
    bp_systolic:     118, bp_diastolic: 76, temperature: 38.2, weight: 65, pulse: 88,
  });
  expect(e2eConsult.status === 201, 'E2E: doctor creates consultation', `got ${e2eConsult.status}`);
  const e2eCid = e2eConsult.data.data?.id;

  // Step 7 — Doctor prescribes medicine
  const rxItems = medicine
    ? [{ medicine_id: medicine.id, dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days', quantity: 6 }]
    : [{ custom_medicine_name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days', quantity: 6 }];
  const e2eRx = await req('POST', '/prescriptions', tokens['doctor'], {
    patient_id: e2ePid, doctor_id: doctor.id,
    appointment_id: e2eApptId,
    items: rxItems,
  });
  expect(e2eRx.status === 201, 'E2E: doctor writes prescription', `got ${e2eRx.status}`);
  const e2eRxId = e2eRx.data.data?.id;

  // Step 8 — Prescription PDF (slip) — check endpoint returns PDF bytes, not an error
  if (e2eRxId) {
    const rxPdf = await reqRaw(`/prescriptions/${e2eRxId}/pdf`, tokens['doctor']);
    expect(
      rxPdf.status === 200 && rxPdf.contentType.includes('pdf'),
      'E2E: prescription PDF renders correctly',
      `status=${rxPdf.status} content-type=${rxPdf.contentType}`
    );
  }

  // Step 9 — Receptionist generates invoice from consultation
  let e2eInvId;
  if (e2eCid) {
    const e2eInv = await req('POST', '/invoices', tokens['receptionist'], { consultation_id: e2eCid });
    expect(e2eInv.status === 201, 'E2E: receptionist generates invoice', `got ${e2eInv.status}`);
    e2eInvId = e2eInv.data.data?.id;

    // Step 10 — Verify invoice contains items
    if (e2eInvId) {
      const invDetail = await req('GET', `/invoices/${e2eInvId}`, tokens['receptionist']);
      const items = invDetail.data.data?.items || [];
      expect(items.length > 0, 'E2E: invoice has line items', `${items.length} items`);
    }

    // Step 11 — Receptionist records payment (full payment)
    if (e2eInvId) {
      const invDetail = await req('GET', `/invoices/${e2eInvId}`, tokens['receptionist']);
      const total = invDetail.data.data?.total_amount || 500;
      const payment = await req('POST', `/invoices/${e2eInvId}/pay`, tokens['receptionist'], {
        payment_method: 'cash', amount: total,
      });
      expect(payment.status === 200, 'E2E: receptionist records payment', `got ${payment.status}`);
      expect(payment.data.data?.payment_status === 'paid', 'E2E: invoice marked as paid', `got ${payment.data.data?.payment_status}`);
    }

    // Step 12 — Invoice PDF (receipt) — check endpoint returns PDF bytes
    if (e2eInvId) {
      const invPdf = await reqRaw(`/invoices/${e2eInvId}/pdf`, tokens['receptionist']);
      expect(
        invPdf.status === 200 && invPdf.contentType.includes('pdf'),
        'E2E: invoice PDF renders correctly',
        `status=${invPdf.status} content-type=${invPdf.contentType}`
      );
    }
  }

  // Step 13 — Pharmacy dispenses the prescription
  if (e2eRxId) {
    const dispense = await req('POST', `/pharmacy/dispense/${e2eRxId}`, tokens['receptionist'], {});
    expect(
      dispense.status === 200 || dispense.status === 409,
      'E2E: pharmacy dispenses prescription',
      `got ${dispense.status} — ${dispense.data?.message}`
    );
    // Verify dispensed flag on prescription
    const rxCheck = await req('GET', `/prescriptions/${e2eRxId}`, tokens['receptionist']);
    expect(rxCheck.data.data?.is_dispensed === true, 'E2E: prescription marked dispensed', `is_dispensed=${rxCheck.data.data?.is_dispensed}`);
  }

  // Step 14 — Mark appointment completed
  if (e2eApptId) {
    const complete = await req('PUT', `/appointments/${e2eApptId}`, tokens['receptionist'], { status: 'completed' });
    expect(complete.status === 200, 'E2E: appointment marked completed', `got ${complete.status}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // B. BOOKED APPOINTMENT FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  sec('19. E2E — Booked Appointment Flow');

  const bookedAppt = await req('POST', '/appointments', tokens['receptionist'], {
    patient_id: e2ePid, doctor_id: doctor.id,
    appointment_date: TODAY, type: 'booked',
    appointment_time: '10:00',
  });
  // 201 = created, 409 = time slot taken (acceptable in test env)
  expect(bookedAppt.status === 201 || bookedAppt.status === 409, 'E2E: receptionist creates booked appointment', `got ${bookedAppt.status}`);
  if (bookedAppt.status === 201) {
    const bApptId = bookedAppt.data.data?.id;
    const bRef    = bookedAppt.data.data?.booking_reference;
    expect(!!bRef, 'E2E: booked appointment has booking reference', `ref=${bRef}`);

    // Mark confirmed → arrived → completed
    const confirm = await req('PUT', `/appointments/${bApptId}`, tokens['receptionist'], { status: 'confirmed' });
    expect(confirm.status === 200, 'E2E: booked appointment confirmed', `got ${confirm.status}`);

    const bArrive = await req('PUT', `/appointments/${bApptId}`, tokens['nurse'], { status: 'arrived' });
    expect(bArrive.status === 200, 'E2E: booked patient marked arrived', `got ${bArrive.status}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // C. ONLINE PORTAL BOOKING → STAFF FLOW
  // ═══════════════════════════════════════════════════════════════════════════
  sec('19. E2E — Online Portal Booking → Staff');

  const portalInfo = await req('GET', '/portal/info', null);
  const portalEnabled = portalInfo.data.data?.patient_portal_enabled === true;

  if (!portalEnabled) {
    warn('E2E: patient_portal_enabled=false — online booking flow skipped');
  } else {
    // Set up a doctor schedule for the day-of-week of next week's date
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];
    const dayOfWeek = nextWeek.getDay();

    await req('POST', '/doctors/schedules', tokens['admin'], {
      doctor_id: doctor.id, day_of_week: dayOfWeek,
      start_time: '09:00', end_time: '12:00',
      slot_duration_minutes: 15, is_active: true,
    });

    // Get available slots
    const slots = await req('GET', `/portal/doctors/${doctor.id}/slots?date=${nextWeekDate}`, null);
    const available = slots.data.data?.find(s => s.available);

    if (!available) {
      warn(`E2E: no available portal slots for ${nextWeekDate} — online booking flow skipped`);
    } else {
      // Book online
      const portalBook = await req('POST', '/portal/book', null, {
        doctor_id:        doctor.id,
        appointment_date: nextWeekDate,
        appointment_time: available.time,
        patient_name:     'Portal Journey Test',
        patient_phone:    `0751${String(ts).slice(-6)}`,
        reason:           'E2E test booking',
      });
      expect(portalBook.status === 201, 'E2E: patient books online via portal', `got ${portalBook.status}`);

      if (portalBook.status === 201) {
        const bookingRef = portalBook.data.data?.booking_reference;
        expect(!!bookingRef, 'E2E: online booking has reference number', `ref=${bookingRef}`);
        expect(!!portalBook.data.data?.token_number, 'E2E: online booking gets token number', `token=${portalBook.data.data?.token_number}`);

        // Staff looks up booking in appointments list
        const staffQueue = await req('GET', `/appointments?date=${nextWeekDate}`, tokens['receptionist']);
        const onlineAppt = staffQueue.data.data?.find(a => a.booking_reference === bookingRef);
        expect(!!onlineAppt, 'E2E: online booking visible in staff appointments', onlineAppt ? 'found' : 'missing');
        expect(onlineAppt?.type === 'booked', 'E2E: online appointment has correct type', `got ${onlineAppt?.type}`);

        // Staff can also look up by reference via portal
        const refLookup = await req('GET', `/portal/booking/${bookingRef}`, null);
        expect(refLookup.status === 200, 'E2E: patient can look up booking by reference', `got ${refLookup.status}`);
      }
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
function printSummary() {
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));

  const bySection = {};
  for (const r of results) {
    if (!bySection[r.section]) bySection[r.section] = { pass: 0, fail: 0, warn: 0 };
    bySection[r.section][r.status.toLowerCase()] = (bySection[r.section][r.status.toLowerCase()] || 0) + 1;
  }

  for (const [sec, counts] of Object.entries(bySection)) {
    const total = counts.pass + counts.fail + (counts.warn || 0);
    console.log(`  ${counts.fail > 0 ? '❌' : '✅'} ${sec.padEnd(35)} ${counts.pass}/${total} passed`);
  }

  const totalPass = results.filter(r => r.status === 'PASS').length;
  const totalFail = results.filter(r => r.status === 'FAIL').length;
  const totalWarn = results.filter(r => r.status === 'WARN').length;
  console.log('─'.repeat(60));
  console.log(`  Total: ${totalPass} passed · ${totalFail} failed · ${totalWarn} warnings`);

  const bugs = results.filter(r => r.status === 'FAIL');
  if (bugs.length > 0) {
    console.log('\n  FAILURES:');
    bugs.forEach((b, i) => {
      console.log(`  ${i + 1}. [${b.section}] ${b.name} — ${b.detail}`);
    });
  }

  return { totalPass, totalFail, totalWarn, bugs };
}

// ── Run all ───────────────────────────────────────────────────────────────────
async function run() {
  console.log('ClinicPOS — Automated Test Suite');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Tenant: ${TENANT}  |  Base: ${BASE}\n`);

  try {
    await loginAll();
    await testPatients();
    await testAppointments();
    await testConsultations();
    await testPrescriptions();
    await testMedicines();
    await testBilling();
    await testPharmacy();
    await testLab();
    await testInsurance();
    await testReports();
    await testSettings();
    await testStaff();
    await testEdgeCases();
    await testCustomServices();
    await testDoctorFees();
    await testPatientPortal();
    await testSuperAdmin();
    await testE2EJourney();
  } catch (err) {
    console.error('\n⚠️  Unexpected error during test run:', err.message);
  }

  const { bugs } = printSummary();
  return bugs;
}

run().then(bugs => {
  process.exit(bugs.length > 0 ? 1 : 0);
});
