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

// POST /api/admin/system-diagnostics - Second-order XSS chain target
router.post('/admin/system-diagnostics', (req, res) => {
  const { token, action } = req.body;
  
  if (!token || token !== req.session.report_token) {
    return res.status(403).json({
      success: false,
      error: 'Invalid or missing CSRF token'
    });
  }

  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).json({
      success: false,
      error: 'Invalid request origin'
    });
  }

  res.json({
    success: true,
    flag: 'flag{391023}',
    message: 'System diagnostics completed. Stored XSS chain successful!'
  });
});

module.exports = router;
