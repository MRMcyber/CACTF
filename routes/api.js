const router = require('../lib/router')();

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
  if (file.includes('traversal_flag')) {
    return res.type('text/plain').send('flag{path_traversal_master_9921}\n');
  }
  res.type('text/plain').send(`%PDF-1.4\n%Invoice details for CACTF billing.\nFile: ${file}\n`);
});

// Medium 2: Server-Side Request Forgery (SSRF)
router.post('/webhook/test', (req, res) => {
  const { url } = req.body;
  if (typeof url !== 'string' || !url.trim()) return res.status(400).json({ error: 'URL required' });
  
  // Check for metadata IP simulating AWS environment
  if (url.includes('169.254.169.254')) {
    return res.json({ result: 'iam/security-credentials/cactf-role\nflag{918273}' });
  }
  
  // Simple mocked response (no real outbound request)
  if (url.includes('example.com')) {
    return res.json({ result: 'Example Domain HTML content...' });
  }
  return res.json({ result: 'Webhook delivered successfully to ' + url });
});

// Flag 9: Race Condition (TOCTOU)
const { query } = require('../db/database');

router.post('/promo/redeem', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  const { code } = req.body;
  if (code !== 'WELCOME10') return res.status(400).json({ error: 'Invalid code' });
  
  try {
    // 1. Time-of-Check (TOC): verify user has not already used the promo code
    const userRows = await query('SELECT promo_used, balance FROM users WHERE id = $1', [req.session.user.id]);
    if (!userRows.length) return res.status(404).json({ error: 'User not found' });
    
    if (userRows[0].promo_used) {
      return res.status(400).json({ error: 'Promo code has already been redeemed' });
    }

    // Vulnerability: Artificial 200ms delay between check and update introduces TOCTOU race window
    await new Promise(resolve => setTimeout(resolve, 200));

    // 2. Time-of-Use (TOU): Increment balance by $10 and set promo_used flag
    const rows = await query('UPDATE users SET balance = balance + 10, promo_used = TRUE WHERE id = $1 RETURNING balance', [req.session.user.id]);
    res.json({ success: true, message: 'Redeemed $10!', balance: rows[0].balance });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/store/buy-flag', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Login required' });
  try {
    const userRows = await query('UPDATE users SET balance = balance - 500 WHERE id = $1 AND balance >= 500 RETURNING balance', [req.session.user.id]);
    if (userRows.length) {
      req.session.purchase_flag = 'flag{746352}';
      res.json({ success: true, message: 'Enterprise Master Key purchased!', flag: req.session.purchase_flag, balance: userRows[0].balance });
    } else {
      res.status(400).json({ error: 'Insufficient balance. Need $500.' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
