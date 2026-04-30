const router = require('express').Router();
const { queryTenant } = require('../config/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { tenantMiddleware }            = require('../middleware/tenant');

router.use(tenantMiddleware, authMiddleware);

// ── GET /api/v1/end-of-day ────────────────────────────────────────────────────
// List past EOD records (most recent first)
router.get('/', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { limit = 30 } = req.query;
  try {
    const result = await queryTenant(tenantId, `
      SELECT e.*, s.full_name AS closed_by_name
      FROM end_of_day e
      JOIN staff s ON s.id = e.closed_by
      ORDER BY e.closing_date DESC
      LIMIT $1
    `, [parseInt(limit)]);
    res.json({ status: 'success', data: result.rows });
  } catch (err) {
    console.error('GET /end-of-day', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/end-of-day/summary/:date ─────────────────────────────────────
// Build live summary for a date (to show before closing).
// Returns status: 'already_closed' if the day is locked, 'success' otherwise.
router.get('/summary/:date', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { date } = req.params;
  try {
    // Check if already closed
    const closed = await queryTenant(tenantId,
      `SELECT * FROM end_of_day WHERE closing_date = $1`, [date]);
    if (closed.rows.length) {
      return res.json({ status: 'already_closed', data: closed.rows[0] });
    }

    // Aggregate invoices for the day
    const totals = await queryTenant(tenantId, `
      SELECT
        COUNT(DISTINCT id)                                          AS total_invoices,
        COUNT(DISTINCT patient_id)                                  AS total_patients,
        COALESCE(SUM(total_amount), 0)                             AS total_billed,
        COALESCE(SUM(paid_amount), 0)                              AS total_collected,
        COALESCE(SUM(balance_due), 0)                              AS outstanding_balance
      FROM invoices
      WHERE DATE(created_at) = $1
    `, [date]);

    // Per-method breakdown from payment_splits
    const splits = await queryTenant(tenantId, `
      SELECT ps.payment_method, COALESCE(SUM(ps.amount), 0) AS total
      FROM payment_splits ps
      JOIN invoices i ON i.id = ps.invoice_id
      WHERE DATE(i.created_at) = $1
      GROUP BY ps.payment_method
    `, [date]);

    const methodMap = {};
    for (const row of splits.rows) {
      methodMap[row.payment_method.toLowerCase()] = parseFloat(row.total);
    }

    const summary = {
      ...totals.rows[0],
      cash_system:     methodMap['cash']      || 0,
      card_total:      methodMap['card']      || 0,
      online_total:    methodMap['online']    || 0,
      insurance_total: methodMap['insurance'] || 0,
      qr_total:        methodMap['qr']        || 0,
    };

    res.json({ status: 'success', data: summary });
  } catch (err) {
    console.error('GET /end-of-day/summary/:date', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── GET /api/v1/end-of-day/:date ─────────────────────────────────────────────
// Get a specific closed EOD record
router.get('/:date', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    const result = await queryTenant(tenantId, `
      SELECT e.*, s.full_name AS closed_by_name
      FROM end_of_day e
      JOIN staff s ON s.id = e.closed_by
      WHERE e.closing_date = $1
    `, [req.params.date]);
    if (!result.rows.length) {
      return res.status(404).json({ status: 'error', message: 'No EOD record for this date' });
    }
    res.json({ status: 'success', data: result.rows[0] });
  } catch (err) {
    console.error('GET /end-of-day/:date', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/end-of-day/auto-close ───────────────────────────────────────
// Auto-close any days before today that had invoice activity but no EOD record.
// Called silently from the frontend on BillingPage / EndOfDayPage load.
router.post('/auto-close', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  try {
    // Find all distinct invoice dates before today that have no EOD record
    const pending = await queryTenant(tenantId, `
      SELECT DISTINCT DATE(created_at) AS invoice_date
      FROM invoices
      WHERE DATE(created_at) < CURRENT_DATE
        AND DATE(created_at) NOT IN (
          SELECT closing_date FROM end_of_day
        )
      ORDER BY invoice_date ASC
    `, []);

    if (!pending.rows.length) {
      return res.json({ status: 'success', data: { auto_closed: 0, dates: [] } });
    }

    const closedDates = [];
    for (const row of pending.rows) {
      const d = row.invoice_date instanceof Date
        ? row.invoice_date.toISOString().split('T')[0]
        : String(row.invoice_date).split('T')[0];

      // Aggregate totals for this date
      const totals = await queryTenant(tenantId, `
        SELECT
          COUNT(DISTINCT id)             AS total_invoices,
          COUNT(DISTINCT patient_id)     AS total_patients,
          COALESCE(SUM(total_amount), 0) AS total_billed,
          COALESCE(SUM(paid_amount), 0)  AS total_collected,
          COALESCE(SUM(balance_due), 0)  AS outstanding_balance
        FROM invoices
        WHERE DATE(created_at) = $1
      `, [d]);

      const splits = await queryTenant(tenantId, `
        SELECT ps.payment_method, COALESCE(SUM(ps.amount), 0) AS total
        FROM payment_splits ps
        JOIN invoices i ON i.id = ps.invoice_id
        WHERE DATE(i.created_at) = $1
        GROUP BY ps.payment_method
      `, [d]);

      const methodMap = {};
      for (const r of splits.rows) {
        methodMap[r.payment_method.toLowerCase()] = parseFloat(r.total);
      }

      const t          = totals.rows[0];
      const cashSystem = methodMap['cash'] || 0;

      await queryTenant(tenantId, `
        INSERT INTO end_of_day (
          closing_date, total_billed, total_collected,
          cash_system, cash_counted, cash_difference,
          card_total, online_total, insurance_total, qr_total,
          total_patients, total_invoices, outstanding_balance,
          notes, closed_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (closing_date) DO NOTHING
      `, [
        d,
        t.total_billed, t.total_collected,
        cashSystem, cashSystem, 0,
        methodMap['card']      || 0,
        methodMap['online']    || 0,
        methodMap['insurance'] || 0,
        methodMap['qr']        || 0,
        t.total_patients, t.total_invoices, t.outstanding_balance,
        'Auto-closed by system', req.user.id,
      ]);

      closedDates.push(d);
    }

    res.json({ status: 'success', data: { auto_closed: closedDates.length, dates: closedDates } });
  } catch (err) {
    console.error('POST /end-of-day/auto-close', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ── POST /api/v1/end-of-day ───────────────────────────────────────────────────
// Submit and lock end-of-day closing
router.post('/', requireRole('receptionist', 'admin'), async (req, res) => {
  const tenantId = req.tenantSchema;
  const { closing_date, cash_counted, notes } = req.body;

  if (!closing_date || cash_counted == null) {
    return res.status(400).json({ status: 'error', message: 'closing_date and cash_counted are required' });
  }

  try {
    // Block duplicate closing
    const dup = await queryTenant(tenantId,
      `SELECT id FROM end_of_day WHERE closing_date = $1`, [closing_date]);
    if (dup.rows.length) {
      return res.status(409).json({ status: 'error', message: 'Day already closed' });
    }

    // Aggregate the day
    const totals = await queryTenant(tenantId, `
      SELECT
        COUNT(DISTINCT id)                AS total_invoices,
        COUNT(DISTINCT patient_id)        AS total_patients,
        COALESCE(SUM(total_amount), 0)    AS total_billed,
        COALESCE(SUM(paid_amount), 0)     AS total_collected,
        COALESCE(SUM(balance_due), 0)     AS outstanding_balance
      FROM invoices
      WHERE DATE(created_at) = $1
    `, [closing_date]);

    const splits = await queryTenant(tenantId, `
      SELECT ps.payment_method, COALESCE(SUM(ps.amount), 0) AS total
      FROM payment_splits ps
      JOIN invoices i ON i.id = ps.invoice_id
      WHERE DATE(i.created_at) = $1
      GROUP BY ps.payment_method
    `, [closing_date]);

    const methodMap = {};
    for (const row of splits.rows) {
      methodMap[row.payment_method.toLowerCase()] = parseFloat(row.total);
    }

    const t           = totals.rows[0];
    const cash_system = methodMap['cash'] || 0;
    const cash_diff   = parseFloat(cash_counted) - cash_system;

    const result = await queryTenant(tenantId, `
      INSERT INTO end_of_day (
        closing_date, total_billed, total_collected,
        cash_system, cash_counted, cash_difference,
        card_total, online_total, insurance_total, qr_total,
        total_patients, total_invoices, outstanding_balance,
        notes, closed_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      closing_date,
      t.total_billed, t.total_collected,
      cash_system, parseFloat(cash_counted), cash_diff,
      methodMap['card']      || 0,
      methodMap['online']    || 0,
      methodMap['insurance'] || 0,
      methodMap['qr']        || 0,
      t.total_patients, t.total_invoices, t.outstanding_balance,
      notes || null, req.user.id,
    ]);

    res.status(201).json({
      status: 'success',
      message: 'Day closed successfully',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('POST /end-of-day', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
