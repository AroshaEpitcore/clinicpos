/**
 * Dual-queue tests for the public online-booking endpoint.
 *
 * Covers:
 *   - Phone-match drives RETURNING; no match creates a new patient + NEW
 *   - Token series scoped by visit_type when flag is ON
 *   - When flag is OFF, legacy single-series is used and visit_type defaults to 'returning'
 *   - Response surfaces patient_visit_type + dual_queue_enabled
 */

const request = require('supertest');
const { makeTestApp } = require('../helpers/testApp');

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

function mountWithFlag(dualQueueOn) {
  return makeTestApp({
    routes: '../../src/routes/portal.routes',
    mountPath: '/api/v1/portal',
    user: null,                          // public — no auth
    tenantFlags: { dual_queue: dualQueueOn },
  });
}

// Order of queries inside POST /portal/book (current implementation):
//   1. checkPortalEnabled — SELECT patient_portal_enabled, dual_queue_enabled
//   2. getPortalHoursStatus — SELECT portal_hours rows
//   3. holiday check
//   4. checkDailyCap — clinic max_patients_per_day
//      (if > 0) clinic count
//   5. checkDailyCap — staff max_patients_per_day
//      (if > 0) doctor count
//   6. slot conflict check
//   7. patient phone lookup
//   8. (if no match) INSERT patient → RETURNING id
//   9. nextToken
//  10. INSERT appointment
//  11. SELECT doctor for response
function arrangePortal(q, {
  portalEnabled = true,
  clinicFlag = true,
  portalOpen = true,
  isHoliday = false,
  hasConflict = false,
  existingPatient = null,
  clinicCap = 0,
  doctorCap = 0,
  clinicCount = 0,
  doctorCount = 0,
}) {
  // Build a portal_hours row set with TODAY wide open (or closed when portalOpen=false)
  const todayDow = new Date().getDay();
  const portalHoursRows = Array.from({ length: 7 }, (_, dow) => ({
    day_of_week: dow,
    is_open:     dow === todayDow ? portalOpen : false,
    open_time:   '00:00',
    close_time:  '23:59',
  }));

  q.queryTenant
    .mockResolvedValueOnce({ rows: [{ patient_portal_enabled: portalEnabled, dual_queue_enabled: clinicFlag }] })
    .mockResolvedValueOnce({ rows: portalHoursRows })
    .mockResolvedValueOnce({ rows: isHoliday ? [{ id: 'h' }] : [] });

  // Cap-check queries (before slot-conflict)
  q.queryTenant.mockResolvedValueOnce({ rows: [{ max_patients_per_day: clinicCap }] });
  if (clinicCap > 0) q.queryTenant.mockResolvedValueOnce({ rows: [{ n: clinicCount }] });
  q.queryTenant.mockResolvedValueOnce({ rows: [{ max_patients_per_day: doctorCap }] });
  if (doctorCap > 0) q.queryTenant.mockResolvedValueOnce({ rows: [{ n: doctorCount }] });

  // Slot conflict, then patient lookup
  q.queryTenant.mockResolvedValueOnce({ rows: hasConflict ? [{ id: 'c' }] : [] });
  q.queryTenant.mockResolvedValueOnce({ rows: existingPatient ? [existingPatient] : [] });
}

describe('POST /api/v1/portal/book — dual-queue ON', () => {
  test('phone match → RETURNING patient gets blue token (returning series)', async () => {
    const { app, q } = mountWithFlag(true);
    arrangePortal(q, {
      existingPatient: { id: 'pat-1', first_name: 'Nimal', last_name: 'Perera' },
    });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ next: 4 }] })                        // nextToken (returning)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-r' }] })                   // INSERT appointment
      .mockResolvedValueOnce({ rows: [{ full_name: 'Dr. Silva', specialization: 'GP' }] });

    const res = await request(app)
      .post('/api/v1/portal/book')
      .send({
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        appointment_time: '10:00',
        patient_name: 'Nimal Perera',
        patient_phone: '0771234567',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.patient_visit_type).toBe('returning');
    expect(res.body.data.token_number).toBe(4);
    expect(res.body.data.dual_queue_enabled).toBe(true);

    // nextToken scoped by 'returning'
    const tokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('patient_visit_type ='));
    expect(tokenCall[2][2]).toBe('returning');
  });

  test('no phone match → NEW patient is created and gets red token (new series)', async () => {
    const { app, q } = mountWithFlag(true);
    arrangePortal(q, {});  // existingPatient is null → no match
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ id: 'pat-new' }] })                  // INSERT patient
      .mockResolvedValueOnce({ rows: [{ next: 1 }] })                        // nextToken (new series)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-n' }] })                   // INSERT appointment
      .mockResolvedValueOnce({ rows: [{ full_name: 'Dr. Silva' }] });

    const res = await request(app)
      .post('/api/v1/portal/book')
      .send({
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        appointment_time: '10:00',
        patient_name: 'First Timer',
        patient_phone: '0779999999',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.patient_visit_type).toBe('new');
    expect(res.body.data.token_number).toBe(1);

    const tokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('patient_visit_type ='));
    expect(tokenCall[2][2]).toBe('new');
  });
});

describe('POST /api/v1/portal/book — dual-queue OFF (legacy)', () => {
  test('uses single token series regardless of new/returning patient', async () => {
    const { app, q } = mountWithFlag(false);
    arrangePortal(q, {
      existingPatient: { id: 'pat-1', first_name: 'Nimal', last_name: null },
    });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ next: 12 }] })                       // legacy nextToken (no type)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-legacy' }] })              // INSERT
      .mockResolvedValueOnce({ rows: [{ full_name: 'Dr. Silva' }] });

    const res = await request(app)
      .post('/api/v1/portal/book')
      .send({
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        appointment_time: '10:00',
        patient_name: 'Nimal',
        patient_phone: '0771234567',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.token_number).toBe(12);
    expect(res.body.data.dual_queue_enabled).toBe(false);
    expect(res.body.data.patient_visit_type).toBe('returning'); // forced default

    // The nextToken SQL must NOT contain patient_visit_type filter
    const tokenCalls = q.queryTenant.mock.calls.filter(c => c[1].includes('MAX(token_number)'));
    expect(tokenCalls.length).toBe(1);
    expect(tokenCalls[0][1]).not.toContain('patient_visit_type');
  });
});

// Helper: portal_hours row mocks for the GET /info endpoint
function portalHoursMock({ openNow = true } = {}) {
  const todayDow = new Date().getDay();
  return Array.from({ length: 7 }, (_, dow) => ({
    day_of_week: dow,
    is_open:     dow === todayDow ? openNow : false,
    open_time:   '00:00',
    close_time:  '23:59',
  }));
}

describe('GET /api/v1/portal/info', () => {
  test('returns effective dual_queue_enabled = true when BOTH flags are on', async () => {
    const { app, q } = mountWithFlag(true);
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ clinic_name: 'Test Clinic', patient_portal_enabled: true, dual_queue_enabled: true }] })
      .mockResolvedValueOnce({ rows: portalHoursMock() });

    const res = await request(app).get('/api/v1/portal/info');

    expect(res.status).toBe(200);
    expect(res.body.data.dual_queue_enabled).toBe(true);
    expect(res.body.data.portal_open_now).toBe(true);
  });

  test('returns false when super-admin enabled but clinic admin opted out', async () => {
    const { app, q } = mountWithFlag(true);
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ clinic_name: 'Test', patient_portal_enabled: true, dual_queue_enabled: false }] })
      .mockResolvedValueOnce({ rows: portalHoursMock() });

    const res = await request(app).get('/api/v1/portal/info');
    expect(res.body.data.dual_queue_enabled).toBe(false);
  });

  test('returns false when super-admin has not enabled the capability', async () => {
    const { app, q } = mountWithFlag(false);
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ clinic_name: 'Test', patient_portal_enabled: true, dual_queue_enabled: true }] })
      .mockResolvedValueOnce({ rows: portalHoursMock() });

    const res = await request(app).get('/api/v1/portal/info');
    expect(res.body.data.dual_queue_enabled).toBe(false);
  });

  test('exposes portal_open_now=false when current day is closed', async () => {
    const { app, q } = mountWithFlag(false);
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ clinic_name: 'Test', patient_portal_enabled: true }] })
      .mockResolvedValueOnce({ rows: portalHoursMock({ openNow: false }) });

    const res = await request(app).get('/api/v1/portal/info');
    expect(res.body.data.portal_open_now).toBe(false);
  });
});

describe('POST /api/v1/portal/book — portal-hours closed', () => {
  test('returns 403 when the portal is closed right now', async () => {
    const { app, q } = mountWithFlag(false);
    // checkPortalEnabled then getPortalHoursStatus → closed
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ patient_portal_enabled: true, dual_queue_enabled: false }] })
      .mockResolvedValueOnce({ rows: portalHoursMock({ openNow: false }) });

    const res = await request(app)
      .post('/api/v1/portal/book')
      .send({
        doctor_id: 'doc-1', appointment_date: '2026-05-20', appointment_time: '10:00',
        patient_name: 'X', patient_phone: '0771234567',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/closed/i);
  });
});

describe('POST /api/v1/portal/book — daily cap', () => {
  test('returns 409 when the clinic-wide cap is reached', async () => {
    const { app, q } = mountWithFlag(false);
    arrangePortal(q, { clinicCap: 30, clinicCount: 30 });
    // No INSERTs because cap-check short-circuits

    const res = await request(app)
      .post('/api/v1/portal/book')
      .send({
        doctor_id: 'doc-1', appointment_date: '2026-05-20', appointment_time: '10:00',
        patient_name: 'X', patient_phone: '0771234567',
      });

    // Note: portal book performs patient lookup BEFORE the cap. Our arrangePortal
    // queues a patient lookup mock anyway; the cap rejection happens before
    // that mock is consumed, so the test still asserts 409.
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Clinic is fully booked/i);
  });
});

describe('POST /api/v1/portal/book — super-admin ON, clinic-admin OFF', () => {
  test('falls back to single-series legacy tokens', async () => {
    const { app, q } = mountWithFlag(true);
    arrangePortal(q, {
      clinicFlag: false,
      existingPatient: { id: 'pat-1', first_name: 'Nimal', last_name: null },
    });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ next: 8 }] })                        // legacy nextToken
      .mockResolvedValueOnce({ rows: [{ id: 'appt-x' }] })                   // INSERT
      .mockResolvedValueOnce({ rows: [{ full_name: 'Dr. Silva' }] });

    const res = await request(app)
      .post('/api/v1/portal/book')
      .send({
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        appointment_time: '10:00',
        patient_name: 'Nimal',
        patient_phone: '0771234567',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.dual_queue_enabled).toBe(false);
    expect(res.body.data.patient_visit_type).toBe('returning');

    // No type-scoped nextToken; legacy SQL only
    const tokenCalls = q.queryTenant.mock.calls.filter(c => c[1].includes('MAX(token_number)'));
    expect(tokenCalls[0][1]).not.toContain('patient_visit_type');
  });
});
