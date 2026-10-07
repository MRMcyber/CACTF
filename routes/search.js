const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /search - Admin only customer search
router.get('/', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Forbidden: This page is restricted to administrators.');
  }

  const q = req.query.q || '';
  let results = [];

  if (q) {
    results = await query(
      'SELECT id, username, email, full_name FROM users WHERE username LIKE $1 OR full_name LIKE $2 OR email LIKE $3',
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );
  }

  // Return search results
  res.render('search', {
    title: 'Search Users',
    user: req.session.user,
    message: null,
    error: null,
    query: q,
    results: results
  });
});

module.exports = router;
