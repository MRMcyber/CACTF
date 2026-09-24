/**
 * Shared database module — Neon Postgres (serverless driver)
 * Replaces the old sql.js / SQLite file-based approach so the app
 * works on read-only deployments like Vercel.
 */
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_aexGUfS8IB3Z@ep-fancy-art-b4fih0j9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

/**
 * Run a parameterised query and return rows.
 * Usage:  const rows = await query('SELECT * FROM users WHERE id = $1', [42]);
 */
async function query(text, params = []) {
  return sql.query(text, params);
}

module.exports = { query, sql, DATABASE_URL };
