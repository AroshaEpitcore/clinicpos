/**
 * Dual-queue tests for the POS appointment route.
 *
 * Two-level gate:
 *   superFlag  = req.tenantFlags.dual_queue                (set by super-admin)
 *   clinicFlag = clinic_settings.dual_queue_enabled        (set by clinic admin)
 *   dualQueueOn = superFlag AND clinicFlag
 *
 * When dual_queue logic is active (both true) the route runs detectVisitType,
 * an optional audit insert, and a type-scoped nextToken. When the clinic flag
 * is fetched (i.e. superFlag is on), it adds ONE extra query at the head of
 * the dual-queue section.
 */

const request = require('supertest');
const { makeTestApp } = require('../helpers/testApp');

const RECEPTION_USER = { id: 'staff-1', role: 'receptionist' };

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

function mountWithFlag(superFlag) {
  return makeTestApp({
    routes: '../../src/routes/appointment.routes',
    mountPath: '/api/v1/appointments',
    user: RECEPTION_USER,
    tenantFlags: { dual_queue: superFlag },
  });
}

// Queue the prerequisite query results that POST /appointments performs in
// order. With type='walkin' and no appointment_time, the order is:
//   1. allow_walk_ins lookup
//   2. holiday check
//   3. dual_queue_enabled (clinic-admin flag) — ONLY when superFlag is true
// (slot-conflict check is skipped when appointment_time is null)
function arrangeBaseChecks(q, {
  walkInsAllowed = true,
  isHoliday = false,
  superFlag = false,
  clinicFlag = false,
} = {}) {
  q.queryTenant
    .mockResolvedValueOnce({ rows: [{ allow_walk_ins: walkInsAllowed }] })
    .mockResolvedValueOnce({ rows: isHoliday ? [{ id: 'h' }] : [] });
  if (superFlag) {
    q.queryTenant.mockResolvedValueOnce({ rows: [{ dual_queue_enabled: clinicFlag }] });
  }
}

describe('POST /api/v1/appointments — dual-queue OFF (legacy path)', () => {
  test('ignores patient_visit_type from the body and uses single token series', async () => {
    const { app, q } = mountWithFlag(false);
    arrangeBaseChecks(q, {});
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ next: 7 }] })                        // nextToken (no type)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-1' }] });                  // INSERT

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        appointment_time: null,
        type: 'walkin',
        patient_visit_type: 'new',   // should be ignored when flag off
      });

    expect(res.status).toBe(201);
    expect(res.body.data.token_number).toBe(7);
    expect(res.body.data.patient_visit_type).toBe('returning'); // default

    // nextToken call should be the legacy 2-arg form (no type filter)
    const nextTokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('MAX(token_number)'));
    expect(nextTokenCall[2]).toEqual(['doc-1', '2026-05-20']);
  });
});

describe('POST /api/v1/appointments — dual-queue ON', () => {
  test('auto-detects RETURNING when patient has prior consultations', async () => {
    const { app, q } = mountWithFlag(true);
    arrangeBaseChecks(q, { superFlag: true, clinicFlag: true });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })                  // detectVisitType — prior consult exists
      .mockResolvedValueOnce({ rows: [{ next: 3 }] })                        // nextToken
      .mockResolvedValueOnce({ rows: [{ id: 'appt-2' }] });                  // INSERT

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        type: 'walkin',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.patient_visit_type).toBe('returning');
    expect(res.body.data.token_number).toBe(3);

    // nextToken should be scoped by type
    const tokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('patient_visit_type ='));
    expect(tokenCall[2]).toEqual(['doc-1', '2026-05-20', 'returning']);
  });

  test('auto-detects NEW when patient has no prior consultations', async () => {
    const { app, q } = mountWithFlag(true);
    arrangeBaseChecks(q, { superFlag: true, clinicFlag: true });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [] })                                   // no prior consult → NEW
      .mockResolvedValueOnce({ rows: [{ next: 1 }] })                        // nextToken (NEW series starts at 1)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-3' }] });

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-new',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        type: 'walkin',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.patient_visit_type).toBe('new');
    expect(res.body.data.token_number).toBe(1);

    const tokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('patient_visit_type ='));
    expect(tokenCall[2]).toEqual(['doc-1', '2026-05-20', 'new']);
  });

  test('manual override is honored AND audit-logged when it disagrees with detection', async () => {
    const { app, q } = mountWithFlag(true);
    arrangeBaseChecks(q, { superFlag: true, clinicFlag: true });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })                  // detection says returning
      .mockResolvedValueOnce({ rows: [{ id: 'audit-1' }] })                  // audit_logs insert
      .mockResolvedValueOnce({ rows: [{ next: 5 }] })                        // nextToken (NEW)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-4' }] });                  // INSERT

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        type: 'walkin',
        patient_visit_type: 'new',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.patient_visit_type).toBe('new');

    // Audit log call should be present with action='visit_type_override'
    const auditCall = q.queryTenant.mock.calls.find(c => c[1].includes('visit_type_override'));
    expect(auditCall).toBeDefined();

    // Token series scoped to 'new'
    const tokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('patient_visit_type ='));
    expect(tokenCall[2][2]).toBe('new');
  });

  test('manual override that AGREES with detection does NOT trigger audit log', async () => {
    const { app, q } = mountWithFlag(true);
    arrangeBaseChecks(q, { superFlag: true, clinicFlag: true });
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })                  // detection: returning
      .mockResolvedValueOnce({ rows: [{ next: 2 }] })                        // nextToken (returning)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-5' }] });

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        type: 'walkin',
        patient_visit_type: 'returning',   // matches detection
      });

    expect(res.status).toBe(201);
    const auditCall = q.queryTenant.mock.calls.find(c => c[1].includes('visit_type_override'));
    expect(auditCall).toBeUndefined();
  });

  test('emergency appointments get token=0 regardless of dual_queue', async () => {
    const { app, q } = mountWithFlag(true);
    // Emergency skips the walk-ins check; only the holiday check runs before dual-queue logic.
    q.queryTenant
      .mockResolvedValueOnce({ rows: [] })                                   // holiday
      .mockResolvedValueOnce({ rows: [{ dual_queue_enabled: true }] })       // clinic-flag fetch
      .mockResolvedValueOnce({ rows: [] })                                   // detectVisitType → new
      .mockResolvedValueOnce({ rows: [{ id: 'appt-emrg' }] });               // INSERT (token = 0, no nextToken call)

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-x',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        type: 'emergency',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.token_number).toBe(0);
  });
});

describe('POST /api/v1/appointments — super-admin ON, clinic-admin OFF (two-level gate)', () => {
  test('falls back to single-series even though super-admin enabled the capability', async () => {
    const { app, q } = mountWithFlag(true);
    arrangeBaseChecks(q, { superFlag: true, clinicFlag: false });            // clinic admin hasn't opted in
    q.queryTenant
      .mockResolvedValueOnce({ rows: [{ next: 9 }] })                        // legacy nextToken (no type filter)
      .mockResolvedValueOnce({ rows: [{ id: 'appt-fallback' }] });

    const res = await request(app)
      .post('/api/v1/appointments')
      .send({
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        appointment_date: '2026-05-20',
        type: 'walkin',
        patient_visit_type: 'new',        // ignored because clinic flag is off
      });

    expect(res.status).toBe(201);
    expect(res.body.data.token_number).toBe(9);
    expect(res.body.data.patient_visit_type).toBe('returning');

    // No detectVisitType call (gate failed), no audit insert
    const detectCall = q.queryTenant.mock.calls.find(c => /FROM consultations WHERE patient_id/.test(c[1]));
    expect(detectCall).toBeUndefined();
    const auditCall = q.queryTenant.mock.calls.find(c => c[1].includes('visit_type_override'));
    expect(auditCall).toBeUndefined();

    // nextToken SQL must NOT include patient_visit_type filter
    const tokenCall = q.queryTenant.mock.calls.find(c => c[1].includes('MAX(token_number)'));
    expect(tokenCall[1]).not.toContain('patient_visit_type');
  });
});

describe('GET /api/v1/appointments/detect-visit-type/:patientId', () => {
  test('returns returning when prior consultation exists', async () => {
    const { app, q } = mountWithFlag(true);
    q.queryTenant.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/api/v1/appointments/detect-visit-type/pat-1');

    expect(res.status).toBe(200);
    expect(res.body.data.patient_visit_type).toBe('returning');
  });

  test('returns new when no prior consultation', async () => {
    const { app, q } = mountWithFlag(true);
    q.queryTenant.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/v1/appointments/detect-visit-type/pat-new');

    expect(res.status).toBe(200);
    expect(res.body.data.patient_visit_type).toBe('new');
  });
});
