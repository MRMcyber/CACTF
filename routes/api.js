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
  // SIMPLIFIED FOR 1HR CTF: CSRF token check removed.
  // Players only need to figure out the XMLHttpRequest header spoofing.
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

// Easy 4: robots.txt target
router.get('/v1/dev-test-flag-endpoint-do-not-index', (req, res) => {
  res.json({ success: true, flag: 'flag{592837}' });
});

// Medium 1: Directory Traversal / LFI
router.get('/download', (req, res) => {
  const file = req.query.file || '';
  if (file.includes('.env')) {
    return res.type('text/plain').send(`DATABASE_URL=postgres://neondb_owner:pass@ep-fancy-art.us-east-2.aws.neon.tech/neondb\nAPI_SECRET=flag{384756}\n`);
  }
  res.type('text/plain').send(`%PDF-1.4\n%Invoice details for CACTF billing.\nFile: ${file}\n`);
});

// Medium 2: Server-Side Request Forgery (SSRF)
router.post('/webhook/test', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });
  
  // Check for metadata IP simulating AWS environment
  if (url.includes('169.254.169.254')) {
    return res.json({ result: 'iam/security-credentials/cactf-role\nflag{918273}' });
  }
  
  try {
    // Simple fetch implementation (mocked to avoid real external requests hanging)
    if (url.includes('example.com')) {
      res.json({ result: 'Example Domain HTML content...' });
    } else {
      res.json({ result: 'Webhook delivered successfully to ' + url });
    }
  } catch (e) {
    res.json({ result: 'Error fetching URL' });
  }
});

// Simplified Hard: Logic Flaw (Replay Attack)
const { query } = require('../db/database');

router.post('/promo/redeem', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  const { code } = req.body;
  if (code !== 'WELCOME10') return res.status(400).json({ error: 'Invalid code' });
  
  try {
    // SIMPLIFIED FOR 1HR CTF: Removed the 'promo_used' state check and race condition delay.
    // Increased payout to $100 so they only have to submit it 5 times.
    await query('UPDATE users SET balance = balance + 100 WHERE id = $1', [req.session.user.id]);

    res.json({ success: true, message: 'Redeemed $100!' });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/store/buy-flag', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  try {
    const userRows = await query('SELECT balance FROM users WHERE id = $1', [req.session.user.id]);
    if (userRows[0].balance >= 500) {
      await query('UPDATE users SET balance = balance - 500 WHERE id = $1', [req.session.user.id]);
      res.json({ success: true, flag: 'flag{746352}' });
    } else {
      res.status(400).json({ error: 'Insufficient balance. Need $500.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
