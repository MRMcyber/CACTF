/**
 * Shared database module — Neon Postgres (serverless driver)
 * Replaces the old sql.js / SQLite file-based approach so the app
 * works on read-only deployments like Vercel.
 */
const { neon } = require('@neondatabase/serverless');

const fs = require('fs');
const path = require('path');
// Local startup loads the ignored development environment; Vercel injects its own.
const localEnv = path.join(__dirname, '..', '.env.local');
if (!process.env.VERCEL && fs.existsSync(localEnv)) process.loadEnvFile(localEnv);
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL is required. Configure .env.local or your deployment environment.');

const sql = neon(DATABASE_URL);

/**
 * Run a parameterised query and return rows.
 * Usage:  const rows = await query('SELECT * FROM users WHERE id = $1', [42]);
 */
async function query(text, params = []) {
  return sql.query(text, params);
}

module.exports = { query, sql, DATABASE_URL };
