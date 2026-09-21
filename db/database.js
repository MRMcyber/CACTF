/**
 * Shared database module for sql.js
 * Provides a getDb() function that returns a ready-to-use SQL.js database instance.
 * The database is loaded from disk and saved back after modifications.
 */
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'ctf.db');

let SQL = null;

async function initSQL() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => path.join(__dirname, '..', 'public', 'sql-wasm.wasm')
    });
  }
  return SQL;
}

function getDb() {
  if (!SQL) {
    throw new Error('SQL.js not initialized. Call initSQL() first.');
  }
  const fileBuffer = fs.readFileSync(DB_PATH);
  return new SQL.Database(fileBuffer);
}

function saveDb(db) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

module.exports = { initSQL, getDb, saveDb, DB_PATH };
