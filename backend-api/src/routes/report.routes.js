const router = require('express').Router();
const { queryTenant } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

router.use(tenantMiddleware, authMiddleware);

// ── GET /api/v1/reports/daily?date=YYYY-MM-DD ─────────────────────────────────
// Admin + receptionist: daily report is needed for EOD workflow
router.get('/daily', requireRole('admin', 'receptionist'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const date = req.query.date || new Date().toISOString().split('T')[0];

  try {
    const [appts, revenue, methods, newPts, topDx] = await Promise.all([

      // Appointment counts by status
      queryTenant(tenantId, `
        SELECT
          COUNT(*)                                              AS total,
          COUNT(*) FILTER (WHERE status = 'completed')         AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')         AS cancelled,
          COUNT(*) FILTER (WHERE status = 'arrived')           AS arrived,
          COUNT(*) FILTER (WHERE status IN ('pending','confirmed')) AS waiting,
          COUNT(*) FILTER (WHERE type   = 'emergency')         AS emergency
        FROM appointments
        WHERE appointment_date = $1
      `, [date]),

      // Revenue from invoices created today
      queryTenant(tenantId, `
        SELECT
          COALESCE(SUM(total_amount), 0) AS total_billed,
          COALESCE(SUM(paid_amount),  0) AS total_collected,
          COALESCE(SUM(balance_due),  0) AS outstanding,
          COUNT(*)                        AS total_invoices,
          COUNT(*) FILTER (WHERE payment_status = 'paid')    AS paid_invoices,
          COUNT(*) FILTER (WHERE payment_status = 'partial') AS partial_invoices,
          COUNT(*) FILTER (WHERE payment_status = 'unpaid')  AS unpaid_invoices
        FROM invoices
        WHERE DATE(created_at) = $1
      `, [date]),

      // Payment method breakdown
      queryTenant(tenantId, `
        SELECT ps.payment_method, COALESCE(SUM(ps.amount), 0) AS total
        FROM payment_splits ps
        JOIN invoices i ON i.id = ps.invoice_id
        WHERE DATE(i.created_at) = $1
        GROUP BY ps.payment_method
        ORDER BY total DESC
      `, [date]),

      // New patients registered today
      queryTenant(tenantId, `
        SELECT COUNT(*) AS new_patients FROM patients WHERE DATE(created_at) = $1
      `, [date]),

      // Top 5 diagnoses today
      queryTenant(tenantId, `
        SELECT diagnosis, COUNT(*) AS count
        FROM consultations
        WHERE DATE(visit_date) = $1 AND diagnosis IS NOT NULL AND diagnosis != ''
        GROUP BY diagnosis
        ORDER BY count DESC
        LIMIT 5
      `, [date]),
    ]);

    res.json({
      data: {
        date,
        appointments:   appts.rows[0],
        revenue:        revenue.rows[0],
        payment_methods: methods.rows,
        new_patients:   parseInt(newPts.rows[0].new_patients),
        top_diagnoses:  topDx.rows,
      },
    });
  } catch (err) {
    console.error('GET /reports/daily', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/reports/monthly?year=YYYY&month=MM ────────────────────────────
router.get('/monthly', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const year  = parseInt(req.query.year)  || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  try {
    const [daily, totals] = await Promise.all([

      // Per-day breakdown for the month
      queryTenant(tenantId, `
        SELECT
          TO_CHAR(gs.day, 'YYYY-MM-DD') AS date,
          TO_CHAR(gs.day, 'DD')          AS label,
          COALESCE(appt.total,    0) AS appointments,
          COALESCE(appt.completed,0) AS completed,
          COALESCE(inv.billed,    0) AS billed,
          COALESCE(inv.collected, 0) AS collected
        FROM generate_series(
          DATE_TRUNC('month', MAKE_DATE($1, $2, 1)),
          DATE_TRUNC('month', MAKE_DATE($1, $2, 1)) + INTERVAL '1 month' - INTERVAL '1 day',
          INTERVAL '1 day'
        ) AS gs(day)
        LEFT JOIN (
          SELECT appointment_date,
                 COUNT(*) AS total,
                 COUNT(*) FILTER (WHERE status = 'completed') AS completed
          FROM appointments
          WHERE EXTRACT(YEAR FROM appointment_date) = $1
            AND EXTRACT(MONTH FROM appointment_date) = $2
          GROUP BY appointment_date
        ) appt ON appt.appointment_date = gs.day::date
        LEFT JOIN (
          SELECT DATE(created_at) AS created_date,
                 COALESCE(SUM(total_amount), 0) AS billed,
                 COALESCE(SUM(paid_amount),  0) AS collected
          FROM invoices
          WHERE EXTRACT(YEAR FROM created_at) = $1
            AND EXTRACT(MONTH FROM created_at) = $2
          GROUP BY DATE(created_at)
        ) inv ON inv.created_date = gs.day::date
        ORDER BY gs.day
      `, [year, month]),

      // Monthly totals
      queryTenant(tenantId, `
        SELECT
          COUNT(DISTINCT a.id)                                       AS total_appointments,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS completed_appointments,
          COUNT(DISTINCT a.patient_id)                               AS total_patients,
          COUNT(DISTINCT p.id) FILTER (WHERE DATE(p.created_at) BETWEEN
            MAKE_DATE($1, $2, 1) AND
            (DATE_TRUNC('month', MAKE_DATE($1, $2, 1)) + INTERVAL '1 month - 1 day')::date
          ) AS new_patients,
          COALESCE(SUM(i.total_amount), 0) AS total_billed,
          COALESCE(SUM(i.paid_amount),  0) AS total_collected,
          COALESCE(SUM(i.balance_due),  0) AS outstanding
        FROM appointments a
        LEFT JOIN patients p ON p.id = a.patient_id
        LEFT JOIN consultations c ON c.appointment_id = a.id
        LEFT JOIN invoices i ON i.consultation_id = c.id
        WHERE EXTRACT(YEAR FROM a.appointment_date) = $1
          AND EXTRACT(MONTH FROM a.appointment_date) = $2
      `, [year, month]),
    ]);

    res.json({ data: { year, month, daily: daily.rows, totals: totals.rows[0] } });
  } catch (err) {
    console.error('GET /reports/monthly', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/reports/doctors?from=&to= ────────────────────────────────────
router.get('/doctors', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const from = req.query.from || new Date().toISOString().split('T')[0];
  const to   = req.query.to   || from;

  try {
    const result = await queryTenant(tenantId, `
      SELECT
        s.id,
        s.full_name,
        s.specialization,
        COUNT(DISTINCT c.id)         AS consultations,
        COUNT(DISTINCT c.patient_id) AS patients_seen,
        COALESCE(SUM(i.total_amount), 0) AS revenue_billed,
        COALESCE(SUM(i.paid_amount),  0) AS revenue_collected
      FROM staff s
      LEFT JOIN consultations c ON c.doctor_id = s.id
        AND c.visit_date::date BETWEEN $1 AND $2
      LEFT JOIN invoices i ON i.consultation_id = c.id
      WHERE s.role = 'doctor' AND s.is_active = TRUE
      GROUP BY s.id, s.full_name, s.specialization
      ORDER BY consultations DESC
    `, [from, to]);

    res.json({ data: result.rows, from, to });
  } catch (err) {
    console.error('GET /reports/doctors', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/reports/medicines ─────────────────────────────────────────────
router.get('/medicines', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;

  try {
    const [overview, lowStock, nearExpiry, topPrescribed] = await Promise.all([

      queryTenant(tenantId, `
        SELECT
          COUNT(*) FILTER (WHERE is_active = TRUE)  AS total_active,
          COUNT(*) FILTER (WHERE is_active = TRUE AND stock_quantity <= reorder_level) AS low_stock,
          COUNT(*) FILTER (WHERE is_active = TRUE AND expiry_date IS NOT NULL
            AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
            AND expiry_date >= CURRENT_DATE) AS near_expiry,
          COUNT(*) FILTER (WHERE is_active = TRUE AND expiry_date IS NOT NULL
            AND expiry_date < CURRENT_DATE) AS expired
        FROM medicines
      `),

      queryTenant(tenantId, `
        SELECT id, name, generic_name, strength, unit, stock_quantity, reorder_level, selling_price
        FROM medicines
        WHERE is_active = TRUE AND stock_quantity <= reorder_level
        ORDER BY stock_quantity ASC
        LIMIT 20
      `),

      queryTenant(tenantId, `
        SELECT id, name, strength, unit, stock_quantity, expiry_date
        FROM medicines
        WHERE is_active = TRUE AND expiry_date IS NOT NULL
          AND expiry_date <= CURRENT_DATE + INTERVAL '60 days'
        ORDER BY expiry_date ASC
        LIMIT 20
      `),

      queryTenant(tenantId, `
        SELECT m.name, m.strength, m.unit, COUNT(*) AS times_prescribed
        FROM prescription_items pi
        JOIN medicines m ON m.id = pi.medicine_id
        GROUP BY m.id, m.name, m.strength, m.unit
        ORDER BY times_prescribed DESC
        LIMIT 10
      `),
    ]);

    res.json({
      data: {
        overview:        overview.rows[0],
        low_stock:       lowStock.rows,
        near_expiry:     nearExpiry.rows,
        top_prescribed:  topPrescribed.rows,
      },
    });
  } catch (err) {
    console.error('GET /reports/medicines', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/reports/patients?from=&to= ───────────────────────────────────
router.get('/patients', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const from = req.query.from || new Date().toISOString().split('T')[0];
  const to   = req.query.to   || from;

  try {
    const [demographics, ageGroups, topDiagnoses] = await Promise.all([

      queryTenant(tenantId, `
        SELECT
          COUNT(*) FILTER (WHERE is_active = TRUE) AS total_registered,
          COUNT(*) FILTER (WHERE is_active = TRUE AND gender = 'male')   AS male,
          COUNT(*) FILTER (WHERE is_active = TRUE AND gender = 'female') AS female,
          COUNT(*) FILTER (WHERE DATE(created_at) BETWEEN $1 AND $2)     AS new_in_period
        FROM patients
      `, [from, to]),

      queryTenant(tenantId, `
        SELECT
          COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) < 13)              AS child,
          COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 13 AND 17) AS teen,
          COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 18 AND 40) AS adult,
          COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) BETWEEN 41 AND 60) AS middle_aged,
          COUNT(*) FILTER (WHERE EXTRACT(YEAR FROM AGE(date_of_birth)) > 60)              AS senior
        FROM patients WHERE is_active = TRUE
      `),

      queryTenant(tenantId, `
        SELECT diagnosis, COUNT(*) AS count
        FROM consultations
        WHERE diagnosis IS NOT NULL AND diagnosis != ''
          AND visit_date::date BETWEEN $1 AND $2
        GROUP BY diagnosis
        ORDER BY count DESC
        LIMIT 10
      `, [from, to]),
    ]);

    res.json({
      data: {
        from, to,
        demographics:   demographics.rows[0],
        age_groups:     ageGroups.rows[0],
        top_diagnoses:  topDiagnoses.rows,
      },
    });
  } catch (err) {
    console.error('GET /reports/patients', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/reports/appointments?from=&to= ───────────────────────────────
router.get('/appointments', requireRole('admin', 'receptionist'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const from = req.query.from || new Date().toISOString().split('T')[0];
  const to   = req.query.to   || from;

  try {
    const [summary, byDow] = await Promise.all([

      queryTenant(tenantId, `
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed')           AS completed,
          COUNT(*) FILTER (WHERE status = 'cancelled')           AS cancelled,
          COUNT(*) FILTER (WHERE status IN ('pending','confirmed')) AS pending,
          COUNT(*) FILTER (WHERE status = 'arrived')             AS arrived,
          COUNT(*) FILTER (WHERE type   = 'walk-in')             AS walk_in,
          COUNT(*) FILTER (WHERE type   = 'booked')              AS booked,
          COUNT(*) FILTER (WHERE type   = 'emergency')           AS emergency
        FROM appointments
        WHERE appointment_date BETWEEN $1 AND $2
      `, [from, to]),

      // Busiest days of week
      queryTenant(tenantId, `
        SELECT
          EXTRACT(DOW FROM appointment_date)::int AS dow,
          TO_CHAR(appointment_date, 'Dy') AS day_name,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed
        FROM appointments
        WHERE appointment_date BETWEEN $1 AND $2
        GROUP BY dow, day_name
        ORDER BY dow
      `, [from, to]),
    ]);

    res.json({
      data: {
        from, to,
        summary:    summary.rows[0],
        by_day_of_week: byDow.rows,
      },
    });
  } catch (err) {
    console.error('GET /reports/appointments', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ── GET /api/v1/reports/end-of-day/history?from=&to=&limit= ──────────────────
router.get('/end-of-day/history', requireRole('admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { from, to, limit = 60 } = req.query;

  const conditions = [];
  const params     = [];

  if (from) { params.push(from); conditions.push(`e.closing_date >= $${params.length}`); }
  if (to)   { params.push(to);   conditions.push(`e.closing_date <= $${params.length}`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  params.push(parseInt(limit));

  try {
    const result = await queryTenant(tenantId, `
      SELECT e.*, s.full_name AS closed_by_name
      FROM end_of_day e
      JOIN staff s ON s.id = e.closed_by
      ${where}
      ORDER BY e.closing_date DESC
      LIMIT $${params.length}
    `, params);

    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /reports/end-of-day/history', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

module.exports = router;
