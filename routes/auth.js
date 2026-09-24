const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../db/database');

// GET /login
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', user: req.session.user, message: null, error: null });
});

// POST /login - VULNERABLE TO SQL INJECTION
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();

  // Authenticate user
  const query = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

  try {
    const stmt = db.prepare(query);
    let user = null;
    if (stmt.step()) {
      const cols = stmt.getColumnNames();
      const vals = stmt.get();
      user = {};
      cols.forEach((col, i) => { user[col] = vals[i]; });
    }
    stmt.free();
    db.close();

    if (user) {
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      };

      // If admin login was via SQL injection, set flag in session
      if (user.role === 'admin' && password !== 'admin') {
        req.session.sqli_flag = 'flag{194827}';
      }

      return res.redirect('/profile');
    } else {
      res.render('login', { title: 'Login', user: null, message: null, error: 'Invalid credentials' });
    }
  } catch (e) {
    db.close();
    res.render('login', { title: 'Login', user: null, message: null, error: 'Query error: ' + e.message });
  }
});

// GET /register
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register', user: req.session.user, message: null, error: null });
});

// POST /register
router.post('/register', (req, res) => {
  const { username, password, email, full_name, phone, bio } = req.body;
  const db = getDb();

  try {
    // Check if username already exists
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ?');
    checkStmt.bind([username]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      db.close();
      return res.render('register', { title: 'Register', user: null, message: null, error: 'Username already taken. Please choose a different username.' });
    }

    const stmt = db.prepare('INSERT INTO users (username, password, email, full_name, phone, ssn, balance, role, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run([username, password, email || '', full_name || '', phone || '', 'N/A', 1000.00, 'user', bio || '', new Date().toISOString()]);
    stmt.free();
    saveDb(db);
    db.close();
    res.render('login', { title: 'Login', user: null, message: 'Registration successful! Please login.', error: null });
  } catch (e) {
    db.close();
    res.render('register', { title: 'Register', user: null, message: null, error: 'Registration failed: ' + e.message });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
