const express = require('express');
const router = express.Router();
const { query } = require('../db/database');

// GET /store - Marketplace & Upgrades
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const rows = await query('SELECT balance FROM users WHERE id = $1', [req.session.user.id]);
    const balance = rows.length > 0 ? rows[0].balance : 0;
    
    let xss_flag = null;
    const review_q = req.query.review_q || '';
    if (review_q.includes('<script>') || review_q.includes('onerror=')) {
        xss_flag = 'flag{857391}';
    }

    res.render('store', {
      title: 'Marketplace & Upgrades',
      user: req.session.user,
      balance: balance,
      review_q: review_q,
      xss_flag: xss_flag,
      message: null,
      error: null
    });
  } catch (e) {
    console.error(e);
    res.redirect('/profile');
  }
});

module.exports = router;
