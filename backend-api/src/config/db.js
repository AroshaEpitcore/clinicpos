const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

/**
 * Run a query in the public schema (tenants, feature_flags, subscriptions).
 */
async function queryPublic(text, params) {
  return pool.query(text, params);
}

/**
 * Run a query scoped to a specific tenant schema.
 * Every tenant query MUST go through this — never skip tenant_id.
 *
 * @param {string} tenantSchema  e.g. "tenant_drsilva"
 * @param {string} text          SQL query
 * @param {any[]}  params        Query parameters
 */
async function queryTenant(tenantSchema, text, params) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${tenantSchema}, public`);
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

module.exports = { pool, queryPublic, queryTenant };
