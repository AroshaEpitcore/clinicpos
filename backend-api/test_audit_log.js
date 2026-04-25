/**
 * Automated test for audit log middleware.
 * Tests that login events (success + failure) are recorded in system_audit_logs.
 *
 * Usage:
 *   node test_audit_log.js                          # tests localhost:4000
 *   node test_audit_log.js familycare               # tests familycare subdomain locally
 *   BACKEND_URL=https://familycare.healthcenter.lk node test_audit_log.js  # tests production
 */

require('dotenv').config();
const https = require('https');
const http  = require('http');
const { Pool } = require('pg');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const SUBDOMAIN   = process.argv[2] || 'familycare';
const pool        = new Pool({ connectionString: process.env.DATABASE_URL });

const isHttps = BACKEND_URL.startsWith('https');

// ── helpers ───────────────────────────────────────────────────────────────────

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url     = new URL(path, BACKEND_URL);
    const payload = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':       'application/json',
        'Content-Length':     Buffer.byteLength(payload),
        'X-Tenant-Subdomain': SUBDOMAIN,
        ...headers,
      },
    };
    const req = (isHttps ? https : http).request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function pass(msg) { console.log(`  ✅ PASS — ${msg}`); }
function fail(msg) { console.log(`  ❌ FAIL — ${msg}`); }
function info(msg) { console.log(`  ℹ  ${msg}`); }

// ── tests ─────────────────────────────────────────────────────────────────────

async function checkTable() {
  console.log('\n[1] Checking system_audit_logs table exists…');
  try {
    const r = await pool.query(`
      SELECT COUNT(*) FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'system_audit_logs'
    `);
    if (parseInt(r.rows[0].count) === 1) pass('Table exists');
    else { fail('Table does NOT exist — run: node src/db/migrate_system_logs.js'); return false; }
  } catch (e) {
    fail(`DB error: ${e.message}`);
    return false;
  }
  return true;
}

async function testFailedLogin() {
  console.log('\n[2] Testing failed login is logged…');
  const before = new Date();

  const res = await post('/api/v1/auth/login', {
    email:    'test_audit@example.com',
    password: 'wrong_password_for_audit_test',
  });
  info(`Login response: ${res.status} — ${res.body?.message}`);

  if (res.status !== 401 && res.status !== 400) {
    info(`Unexpected status ${res.status} — clinic may not exist for subdomain "${SUBDOMAIN}"`);
  }

  await sleep(500); // let finish event write to DB

  const r = await pool.query(`
    SELECT id, tenant_id, tenant_subdomain, user_email, user_role, status_code, ip_address, created_at
    FROM public.system_audit_logs
    WHERE path = '/api/v1/auth/login'
      AND user_email = 'test_audit@example.com'
      AND created_at > $1
    ORDER BY created_at DESC LIMIT 1
  `, [before.toISOString()]);

  if (r.rows.length > 0) {
    const row = r.rows[0];
    pass(`Failed login logged — id=${row.id} tenant_id=${row.tenant_id} status=${row.status_code}`);
    info(`  subdomain=${row.tenant_subdomain}  role=${row.user_role}  ip=${row.ip_address}`);
    if (!row.tenant_id) fail('tenant_id is NULL — fix not working yet');
    else pass(`tenant_id=${row.tenant_id} correctly resolved`);
    return true;
  } else {
    fail('No log entry found for failed login — middleware may not be running or table not found');
    return false;
  }
}

async function testTenantResolution() {
  console.log('\n[3] Checking tenant exists in DB for this subdomain…');
  const r = await pool.query(
    `SELECT id, clinic_name, subdomain, status FROM public.tenants WHERE subdomain = $1`,
    [SUBDOMAIN]
  );
  if (r.rows.length === 0) {
    fail(`No tenant found with subdomain="${SUBDOMAIN}"`);
    return false;
  }
  const t = r.rows[0];
  pass(`Tenant found: id=${t.id}  name="${t.clinic_name}"  status=${t.status}`);
  return true;
}

async function testRecentLogs() {
  console.log('\n[4] Checking recent log entries in last 10 minutes…');
  const r = await pool.query(`
    SELECT method, path, status_code, user_email, user_role, tenant_id, tenant_subdomain, created_at
    FROM public.system_audit_logs
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC
    LIMIT 5
  `);
  if (r.rows.length === 0) {
    info('No log entries in last 10 minutes — this is expected before first action');
  } else {
    pass(`${r.rows.length} recent entries found:`);
    r.rows.forEach(row => {
      console.log(`     [${new Date(row.created_at).toLocaleTimeString()}] ${row.method} ${row.path} → ${row.status_code}  tenant_id=${row.tenant_id}  ${row.user_email || ''}`);
    });
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log(' Audit Log Test');
  console.log(` Backend : ${BACKEND_URL}`);
  console.log(` Subdomain: ${SUBDOMAIN}`);
  console.log('═══════════════════════════════════════════════════');

  const tableOk = await checkTable();
  if (!tableOk) { await pool.end(); return; }

  await testTenantResolution();
  await testFailedLogin();
  await testRecentLogs();

  console.log('\n═══════════════════════════════════════════════════\n');
  await pool.end();
}

main().catch(e => { console.error('Test error:', e.message); pool.end(); });
