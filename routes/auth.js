const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /login
router.get('/login', (req, res) => {
  res.render('login', { title: 'Login', user: req.session.user, message: null, error: null });
});

// POST /login - VULNERABLE TO SQL INJECTION
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Authenticate user — intentionally vulnerable to SQL injection
  const q = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

  try {
    const rows = await query(q);
    const user = rows.length > 0 ? rows[0] : null;

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

      // Save session before redirect (required for serverless platforms)
      return req.session.save(() => res.redirect(302, '/profile'));
    } else {
      res.render('login', { title: 'Login', user: null, message: null, error: 'Invalid credentials' });
    }
  } catch (e) {
    res.render('login', { title: 'Login', user: null, message: null, error: 'Query error: ' + e.message });
  }
});

// GET /register
router.get('/register', (req, res) => {
  res.render('register', { title: 'Register', user: req.session.user, message: null, error: null });
});

// POST /register
router.post('/register', async (req, res) => {
  const { username, password, email, full_name, phone, bio } = req.body;

  try {
    // Check if username already exists
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);

    if (existing.length > 0) {
      return res.render('register', { title: 'Register', user: null, message: null, error: 'Username already taken. Please choose a different username.' });
    }

    await query(
      'INSERT INTO users (username, password, email, full_name, phone, ssn, balance, role, bio, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
      [username, password, email || '', full_name || '', phone || '', 'N/A', 1000.00, 'user', bio || '', new Date().toISOString()]
    );
    res.render('login', { title: 'Login', user: null, message: 'Registration successful! Please login.', error: null });
  } catch (e) {
    res.render('register', { title: 'Register', user: null, message: null, error: 'Registration failed: ' + e.message });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
