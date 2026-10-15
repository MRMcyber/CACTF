const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const { query } = require('./db/database');
const PostgresSessionStore = require('./db/session-store');
const { ensureRuntimeSchema } = require('./db/schema');

const app = express();
const PORT = process.env.PORT || 3000;
app.locals.user = null;
app.locals.message = null;
app.locals.error = null;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
// Vercel pre-parses request bodies, which can conflict with Express parsers.
// This middleware ensures req.body is available in both environments.
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    req._body = true; // Tell Express body-parser that the body is already parsed
  }
  next();
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Session config (intentionally insecure for CSRF challenge)
app.use(session({
  store: new PostgresSessionStore(),
  secret: 'ctf-insecure-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: false, secure: false, sameSite: false, maxAge: 86400000 }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.message = null;
  res.locals.error = null;
  next();
});

// ── Landing Page (must be before other route mounts) ──
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/profile');
  }
  res.render('index', {
    title: 'CACTF — The Commerce Platform Built for Scale',
    user: null,
    message: null,
    error: null
  });
});

// Routes
const authRoutes = require('./routes/auth');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const transferRoutes = require('./routes/transfer');
const storeRoutes = require('./routes/store');
const jwtAdminRoutes = require('./routes/jwt-admin');
const apiRoutes = require('./routes/api');

app.use('/', authRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/transfer', transferRoutes);
app.use('/store', storeRoutes);
app.use('/jwt', jwtAdminRoutes);
app.use('/api', apiRoutes);
app.use('/api', profileRoutes); // IDOR API route (/api/users/:id/profile)

// ── Challenges list builder ──
function buildChallenges(foundFlags) {
  return [
    // Easy
    { name: 'Authentication Bypass', points: 5, found: foundFlags.includes('sqli_basic'), hint: 'Sometimes logging in is as easy as knowing who you want to be, and ignoring the rest. Pay attention to quotes.' },
    { name: 'Input Validation', points: 5, found: foundFlags.includes('xss_reflected'), hint: 'Does the store search page trust your input too much? Try running a classic alert(1) payload.' },
    { name: 'Information Disclosure', points: 5, found: foundFlags.includes('hardcoded_creds'), hint: 'Developers often leave sensitive keys directly in the frontend JavaScript or backend routes. Look closely at the API endpoints.' },
    { name: 'Access Control', points: 5, found: foundFlags.includes('default_admin'), hint: 'If an admin account exists, did the developer bother changing the default password from something like admin/admin?' },
    { name: 'Source Code Recon', points: 5, found: foundFlags.includes('html_comment'), hint: 'Sometimes developers leave notes for themselves in the HTML source code. View Source on the main pages.' },
    { name: 'API Over-fetching', points: 5, found: foundFlags.includes('api_overfetch'), hint: 'Does the session info API endpoint return more data than what is actually displayed on the screen? Inspect the JSON.' },
    { name: 'Business Logic Flaw', points: 5, found: foundFlags.includes('negative_transfer'), hint: 'Can you transfer a negative amount of money to someone else? What happens to your balance if you do?' },
    { name: 'Basic Reconnaissance', points: 5, found: foundFlags.includes('robots_txt'), hint: 'Bots need instructions on what NOT to crawl. Where do websites typically store these instructions?' },
    
    // Medium
    { name: 'Session Security (Massive Transfer)', points: 10, found: foundFlags.includes('csrf_transfer'), hint: 'If you can manipulate your balance to be extremely high, try transferring a massive amount (over 5000) to another user.' },
    { name: 'Authorization (IDOR)', points: 10, found: foundFlags.includes('idor_access'), hint: 'The API lets you fetch your own profile by ID. What happens if you just change the ID number to someone else (e.g., ID 5)?' },
    { name: 'Token Security (JWT)', points: 10, found: foundFlags.includes('jwt_manipulation'), hint: 'The SOC Admin panel uses a JWT. We left a comment in the source about the secret key. Forge a token with the "admin" role.' },
    { name: 'Directory Traversal', points: 10, found: foundFlags.includes('lfi_traversal'), hint: 'The invoice download API takes a filename. Can you force it to download the backend `.env` file instead using ../ ?' },
    { name: 'Server-Side Request Forgery', points: 10, found: foundFlags.includes('ssrf_metadata'), hint: 'The Webhook tester will fetch any URL. In cloud environments like AWS, the magic IP 169.254.169.254 holds metadata.' },
    { name: 'Avatar Path Traversal', points: 10, found: foundFlags.includes('path_traversal_master'), hint: 'Your profile avatar is loaded via ?f=filename. Try traversing back out of /public/uploads/ (e.g. ../../) to read traversal_flag.txt' },
    
    // Hard
    { name: 'Advanced Chaining (XSS)', points: 30, found: foundFlags.includes('stored_xss_chain'), hint: 'The System Diagnostics endpoint expects an XMLHttpRequest. Can you craft a payload to spoof this?' },
    { name: 'Race Condition (TOCTOU)', points: 30, found: foundFlags.includes('race_condition'), hint: 'The Promo Code WELCOME10 gives you $10, but the endpoint has an artificial 200ms delay before marking it as used. Send concurrent requests to race the check, reach $500, and acquire the Master Key!' }
  ];
}

// ── Flag Submission (GET) ──
app.get('/submit-flag', async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const foundFlags = (await query('SELECT challenge FROM user_flags WHERE user_id = $1', [req.session.user.id])).map(row => row.challenge);
    const challenges = buildChallenges(foundFlags);
    const totalScore = challenges.filter(c => c.found).reduce((s, c) => s + c.points, 0);

    res.render('scoreboard', {
      title: 'Flag Submission',
      user: req.session.user,
      message: null,
      error: null,
      challenges,
      totalScore,
      maxScore: challenges.reduce((sum, challenge) => sum + challenge.points, 0)
    });
  } catch (error) { next(error); }
});

// ── Flag Submission (POST) ──
app.post('/submit-flag', async (req, res, next) => {
  try {
    if (!req.session.user) return res.redirect('/login');

    const flag = typeof req.body.flag === 'string' ? req.body.flag.trim() : '';
    const flags = await query('SELECT challenge, flag, points FROM flags');

    const matched = flags.find(f => f.flag === (flag || '').trim());
    let message = null, error = null;

    if (matched) {
      const captured = await query(
        'INSERT INTO user_flags (user_id, challenge) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING challenge',
        [req.session.user.id, matched.challenge]
      );
      if (!captured.length) {
        message = `You've already captured this flag! (+0 pts)`;
      } else {
        message = `🎉 Flag accepted! +${matched.points} points!`;
      }
    } else {
      error = 'Invalid flag. Keep looking!';
    }

    const foundFlags = (await query('SELECT challenge FROM user_flags WHERE user_id = $1', [req.session.user.id])).map(row => row.challenge);
    const challenges = buildChallenges(foundFlags);
    const totalScore = challenges.filter(c => c.found).reduce((s, c) => s + c.points, 0);

    res.render('scoreboard', {
      title: 'Flag Submission',
      user: req.session.user,
      message,
      error,
      challenges,
      totalScore,
      maxScore: challenges.reduce((sum, challenge) => sum + challenge.points, 0)
    });
  } catch (error) { next(error); }
});

app.use((req, res) => res.status(404).send('Page not found'));
app.use((error, req, res, next) => {
  console.error('Request failed:', error.message);
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  const message = status < 500 ? error.message : 'Unable to complete this request. Please try again.';
  if (req.path.startsWith('/api/')) return res.status(status).json({ error: message });
  res.status(status).render('error', { title: 'Request error', error: message });
});

// ── Start ──
async function start() {
  await ensureRuntimeSchema();
  app.listen(PORT, () => {
    console.log(`\n  CACTF Platform`);
    console.log(`  Running at http://localhost:${PORT}\n`);
  });
}

if (require.main === module) {
  start().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = app;
