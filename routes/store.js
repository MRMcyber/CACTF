const router = require('../lib/router')();
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
    if (/<script\b|\bon\w+\s*=/i.test(review_q)) {
        xss_flag = 'flag{857391}';
    }

    res.render('store', {
      title: 'Marketplace & Upgrades',
      user: req.session.user,
      balance: balance,
      review_q: review_q,
      xss_flag: xss_flag,
      purchase_flag: req.session.purchase_flag || null,
      message: null,
      error: null
    });
  } catch (e) {
    console.error(e);
    res.redirect('/profile');
  }
});

module.exports = router;
