const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /admin/dashboard - Administration panel
router.get('/dashboard', async (req, res) => {
  const users = await query('SELECT id, username, email, role, balance FROM users ORDER BY id');

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
router.get('/reports', async (req, res) => {
  const users = await query('SELECT id, username, full_name, email, bio, created_at FROM users ORDER BY id DESC');

  // Generate a dynamic token for the stored XSS chain
  const crypto = require('crypto');
  const reportToken = crypto.randomBytes(16).toString('hex');
  req.session.report_token = reportToken;

  res.render('reports', {
    title: 'User Reports',
    user: req.session.user,
    message: null,
    error: null,
    users: users,
    reportToken: reportToken
  });
});

module.exports = router;
