const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /profile - Show logged-in user's profile
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const rows = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
  const profile = rows.length > 0 ? rows[0] : null;

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
router.post('/update', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { bio } = req.body;
  await query('UPDATE users SET bio = $1 WHERE id = $2', [bio, req.session.user.id]);

  res.redirect('/profile');
});

// GET /api/users/:id/profile - User profile API
router.get('/users/:id/profile', async (req, res) => {
  const rows = await query(
    'SELECT id, username, email, full_name, phone, ssn, balance, role, bio FROM users WHERE id = $1',
    [parseInt(req.params.id)]
  );

  if (rows.length > 0) {
    res.json(rows[0]);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

module.exports = router;
