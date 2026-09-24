const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /search - VULNERABLE TO REFLECTED XSS
router.get('/', async (req, res) => {
  const q = req.query.q || '';
  let xss_flag = null;
  if (q.includes('<script>') || q.includes('onerror=')) {
      xss_flag = 'flag{857391}';
  }
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
    xss_flag: xss_flag,
    results: results
  });
});

module.exports = router;
