const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Helper to convert sql.js results to array of objects
function allResults(db, query, params) {
  const stmt = db.prepare(query);
  if (params) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    const row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
    results.push(row);
  }
  stmt.free();
  return results;
}

// GET /admin/dashboard - Administration panel
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const users = allResults(db, 'SELECT id, username, email, role, balance FROM users ORDER BY id');
  db.close();

  res.render('admin', {
    title: 'Admin Dashboard',
    user: req.session.user,
    message: null,
    error: null,
    users: users,
    flag: 'flag{719304}'
  });
});

// GET /admin/reports - Renders user bios unsafely (stored XSS chain)
router.get('/reports', (req, res) => {
  const db = getDb();
  const users = allResults(db, 'SELECT id, username, full_name, email, bio, created_at FROM users ORDER BY id DESC');
  db.close();

  res.render('reports', {
    title: 'User Reports',
    user: req.session.user,
    message: null,
    error: null,
    users: users
  });
});

module.exports = router;
