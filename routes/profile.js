const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

// Helper to get single row as object
function getRow(db, query, params) {
  const stmt = db.prepare(query);
  if (params) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
  }
  stmt.free();
  return row;
}

// GET /profile - Show logged-in user's profile
router.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const db = getDb();
  const profile = getRow(db, 'SELECT * FROM users WHERE id = ?', [req.session.user.id]);
  db.close();

  res.render('profile', {
    title: 'Dashboard',
    user: req.session.user,
    message: null,
    error: null,
    profile: profile,
    sqli_flag: req.session.sqli_flag || null
  });
});

// POST /profile/update - Update bio (stored XSS entry point)
router.post('/update', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { bio } = req.body;
  const db = getDb();

  // Update user bio
  const stmt = db.prepare('UPDATE users SET bio = ? WHERE id = ?');
  stmt.run([bio, req.session.user.id]);
  stmt.free();
  saveDb(db);
  db.close();

  res.redirect('/profile');
});

// GET /api/users/:id/profile - User profile API
router.get('/users/:id/profile', (req, res) => {
  const db = getDb();
  const user = getRow(db, 'SELECT id, username, email, full_name, phone, ssn, balance, role, bio FROM users WHERE id = ?', [parseInt(req.params.id)]);
  db.close();

  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

module.exports = router;
