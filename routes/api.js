const express = require('express');
const router = express.Router();

const VALID_API_KEY = 'sk-ctf-2024-s3cur1ty-k3y-d0nt-sh4r3';

// GET /api/secret - Requires API key from config.js
router.get('/secret', (req, res) => {
  const key = req.query.key || req.headers['x-api-key'];

  if (key === VALID_API_KEY) {
    res.json({
      success: true,
      flag: 'flag{402851}',
      message: 'Congratulations! You found the hardcoded API key and used it to access this endpoint.'
    });
  } else {
    res.status(403).json({
      success: false,
      error: 'Invalid API key. Find the correct key to access this endpoint.'
    });
  }
});

// GET /api/admin/secret-flag - Second-order XSS chain target
router.get('/admin/secret-flag', (req, res) => {
  res.json({
    flag: 'flag{391023}',
    message: 'You successfully exploited the stored XSS chain!'
  });
});

module.exports = router;
