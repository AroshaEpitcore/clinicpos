const express = require('express');
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const { queryTenant }                      = require('../config/db');
const { authMiddleware, requireRole }      = require('../middleware/auth');
const { tenantMiddleware, requireFeature } = require('../middleware/tenant');

const router = express.Router();
router.use(tenantMiddleware, authMiddleware, requireFeature('lab'));

// ── multer for result file uploads ────────────────────────────────────────────
function makeStorage(subdir) {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const dir = path.join('uploads', 'tenants', req.tenantSchema, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `result_${Date.now()}${ext}`);
    },
  });
}

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  cb(null, allowed.includes(ext));
};

const uploadResult = multer({
  storage: makeStorage('lab'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// ══════════════════════════════════════════════════════════════════════════════
// LAB TEST CATALOG
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/lab/tests
router.get('/tests', async (req, res) => {
  const { active_only } = req.query;
  try {
    const where = active_only === 'true' ? 'WHERE is_active = TRUE' : '';
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT id, name, code, category, description, normal_range, unit, price, is_active, created_at
       FROM lab_tests ${where}
       ORDER BY category ASC, name ASC`,
      []
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/v1/lab/tests  (admin, receptionist)
router.post('/tests', requireRole('admin', 'receptionist'), async (req, res) => {
  const { name, code, category, description, normal_range, unit, price } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Test name is required' });
  }
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `INSERT INTO lab_tests (name, code, category, description, normal_range, unit, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), code?.trim() || null, category?.trim() || null,
       description?.trim() || null, normal_range?.trim() || null,
       unit?.trim() || null, parseFloat(price) || 0]
    );
    res.status(201).json({ status: 'success', message: `'${name}' added to catalog`, data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/v1/lab/tests/:id  (admin, receptionist)
router.put('/tests/:id', requireRole('admin', 'receptionist'), async (req, res) => {
  const { name, code, category, description, normal_range, unit, price, is_active } = req.body;
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `UPDATE lab_tests SET
         name         = COALESCE($1, name),
         code         = $2,
         category     = $3,
         description  = $4,
         normal_range = $5,
         unit         = $6,
         price        = COALESCE($7, price),
         is_active    = COALESCE($8, is_active),
         updated_at   = NOW()
       WHERE id = $9 RETURNING *`,
      [name?.trim() || null, code?.trim() ?? null, category?.trim() ?? null,
       description?.trim() ?? null, normal_range?.trim() ?? null,
       unit?.trim() ?? null, price !== undefined ? parseFloat(price) : null,
       is_active ?? null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Test not found' });
    res.json({ status: 'success', message: 'Changes saved successfully', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// DELETE /api/v1/lab/tests/:id  (admin, receptionist — soft delete)
router.delete('/tests/:id', requireRole('admin', 'receptionist'), async (req, res) => {
  try {
    await queryTenant(
      req.tenantSchema,
      `UPDATE lab_tests SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ status: 'success', message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// LAB REQUESTS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/lab/requests?date=&status=&patient_id=
router.get('/requests', async (req, res) => {
  const { date, status, patient_id } = req.query;
  try {
    const params = [];
    const conditions = [];

    if (date) {
      params.push(date);
      conditions.push(`DATE(lr.created_at) = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`lr.status = $${params.length}`);
    }
    if (patient_id) {
      params.push(patient_id);
      conditions.push(`lr.patient_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await queryTenant(
      req.tenantSchema,
      `SELECT lr.id, lr.status, lr.notes, lr.created_at,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_code, p.id AS patient_id,
              t.name AS test_name, t.code AS test_code,
              t.normal_range, t.unit, t.category,
              req.full_name AS requested_by_name,
              res.id AS result_id,
              res.result_value, res.result_file_url,
              res.notes AS result_notes,
              res.resulted_at,
              resby.full_name AS resulted_by_name
       FROM lab_requests lr
       JOIN patients p   ON lr.patient_id   = p.id
       JOIN lab_tests t  ON lr.test_id      = t.id
       JOIN staff req    ON lr.requested_by = req.id
       LEFT JOIN lab_results res   ON res.request_id = lr.id
       LEFT JOIN staff resby       ON res.resulted_by = resby.id
       ${where}
       ORDER BY lr.created_at DESC`,
      params
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// POST /api/v1/lab/requests  (doctor, admin, receptionist)
router.post('/requests', requireRole('doctor', 'admin', 'receptionist'), async (req, res) => {
  const { patient_id, consultation_id, test_ids, notes } = req.body;

  if (!patient_id || !test_ids?.length) {
    return res.status(400).json({ status: 'error', message: 'Patient and at least one test are required' });
  }

  const client = await require('../config/db').pool.connect();
  try {
    await client.query(`SET search_path TO ${req.tenantSchema}, public`);
    await client.query('BEGIN');

    const created = [];
    for (const test_id of test_ids) {
      const r = await client.query(
        `INSERT INTO lab_requests (patient_id, consultation_id, test_id, requested_by, notes)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [patient_id, consultation_id || null, test_id, req.user.id, notes?.trim() || null]
      );
      created.push(r.rows[0].id);
    }

    await client.query('COMMIT');
    res.status(201).json({
      status: 'success',
      message: `${test_ids.length} lab test${test_ids.length > 1 ? 's' : ''} requested successfully`,
      data: { ids: created }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  } finally {
    client.release();
  }
});

// GET /api/v1/lab/requests/:id
router.get('/requests/:id', async (req, res) => {
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT lr.id, lr.status, lr.notes, lr.created_at,
              p.first_name || ' ' || p.last_name AS patient_name,
              p.patient_code, p.id AS patient_id,
              t.name AS test_name, t.code AS test_code,
              t.normal_range, t.unit, t.category, t.description,
              req.full_name AS requested_by_name,
              res.id AS result_id,
              res.result_value, res.result_file_url,
              res.notes AS result_notes,
              res.resulted_at,
              resby.full_name AS resulted_by_name
       FROM lab_requests lr
       JOIN patients p   ON lr.patient_id   = p.id
       JOIN lab_tests t  ON lr.test_id      = t.id
       JOIN staff req    ON lr.requested_by = req.id
       LEFT JOIN lab_results res   ON res.request_id = lr.id
       LEFT JOIN staff resby       ON res.resulted_by = resby.id
       WHERE lr.id = $1`,
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ status: 'error', message: 'Request not found' });
    res.json({ status: 'success', data: r.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

// PUT /api/v1/lab/requests/:id/result  (doctor, nurse, admin)
// Accepts multipart/form-data for optional file upload
router.put('/requests/:id/result', (req, res) => {
  uploadResult.single('result_file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ status: 'error', message: uploadErr.message });
    }

    const { result_value, notes } = req.body;

    if (!result_value?.trim() && !req.file) {
      return res.status(400).json({ status: 'error', message: 'Result value or file is required' });
    }

    const client = await require('../config/db').pool.connect();
    try {
      await client.query(`SET search_path TO ${req.tenantSchema}, public`);
      await client.query('BEGIN');

      // Verify request exists
      const reqRes = await client.query(
        `SELECT id, status FROM lab_requests WHERE id = $1`,
        [req.params.id]
      );
      if (!reqRes.rows.length) throw new Error('REQUEST_NOT_FOUND');

      const fileUrl = req.file
        ? `/uploads/tenants/${req.tenantSchema}/lab/${req.file.filename}`
        : null;

      // Upsert result — delete old if exists then insert fresh
      await client.query(`DELETE FROM lab_results WHERE request_id = $1`, [req.params.id]);
      await client.query(
        `INSERT INTO lab_results (request_id, result_value, result_file_url, notes, resulted_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.id, result_value?.trim() || null, fileUrl, notes?.trim() || null, req.user.id]
      );

      // Mark request as completed
      await client.query(
        `UPDATE lab_requests SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );

      await client.query('COMMIT');
      res.json({ status: 'success', message: 'Result saved successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.message === 'REQUEST_NOT_FOUND') {
        return res.status(404).json({ status: 'error', message: 'Lab request not found' });
      }
      console.error(err);
      res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      client.release();
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PATIENT LAB HISTORY
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/v1/lab/patients/:patientId
router.get('/patients/:patientId', async (req, res) => {
  try {
    const r = await queryTenant(
      req.tenantSchema,
      `SELECT lr.id, lr.status, lr.notes, lr.created_at,
              t.name AS test_name, t.code AS test_code,
              t.normal_range, t.unit, t.category,
              req.full_name AS requested_by_name,
              res.result_value, res.result_file_url,
              res.notes AS result_notes,
              res.resulted_at,
              resby.full_name AS resulted_by_name
       FROM lab_requests lr
       JOIN lab_tests t  ON lr.test_id      = t.id
       JOIN staff req    ON lr.requested_by = req.id
       LEFT JOIN lab_results res   ON res.request_id = lr.id
       LEFT JOIN staff resby       ON res.resulted_by = resby.id
       WHERE lr.patient_id = $1
       ORDER BY lr.created_at DESC`,
      [req.params.patientId]
    );
    res.json({ status: 'success', data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
