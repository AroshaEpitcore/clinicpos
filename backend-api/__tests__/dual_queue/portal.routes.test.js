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

// Order of queries inside POST /portal/book:
//   1. patient_portal_enabled
//   2. holiday check
//   3. slot conflict check
//   4. patient phone lookup
//   5. (if no match) INSERT patient → RETURNING id
//   6. nextToken
//   7. INSERT appointment
//   8. SELECT doctor for response
function arrangePortal(q, { portalEnabled = true, isHoliday = false, hasConflict = false, existingPatient = null }) {
  q.queryTenant
    .mockResolvedValueOnce({ rows: [{ patient_portal_enabled: portalEnabled }] })
    .mockResolvedValueOnce({ rows: isHoliday ? [{ id: 'h' }] : [] })
    .mockResolvedValueOnce({ rows: hasConflict ? [{ id: 'c' }] : [] })
    .mockResolvedValueOnce({ rows: existingPatient ? [existingPatient] : [] });
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

describe('GET /api/v1/portal/info', () => {
  test('exposes dual_queue_enabled flag', async () => {
    const { app, q } = mountWithFlag(true);
    q.queryTenant.mockResolvedValueOnce({ rows: [{ clinic_name: 'Test Clinic', patient_portal_enabled: true }] });

    const res = await request(app).get('/api/v1/portal/info');

    expect(res.status).toBe(200);
    expect(res.body.data.dual_queue_enabled).toBe(true);
  });
});
