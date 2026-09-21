const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const { initSQL, getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Session config (intentionally insecure for CSRF challenge)
app.use(session({
  secret: 'ctf-insecure-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { httpOnly: false, secure: false, sameSite: false }
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
const jwtAdminRoutes = require('./routes/jwt-admin');
const apiRoutes = require('./routes/api');

app.use('/', authRoutes);
app.use('/search', searchRoutes);
app.use('/admin', adminRoutes);
app.use('/profile', profileRoutes);
app.use('/transfer', transferRoutes);
app.use('/jwt', jwtAdminRoutes);
app.use('/api', apiRoutes);
app.use('/api', profileRoutes); // IDOR API route (/api/users/:id/profile)

// ── Helper ──
function allResults(db, query, params) {
  const stmt = db.prepare(query);
  if (params) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    const row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
    results.push(row);
  }
  stmt.free();
  return results;
}

// ── Challenges list builder ──
function buildChallenges(foundFlags) {
  return [
    { name: 'Authentication Bypass', points: 5, found: foundFlags.includes('sqli_basic') },
    { name: 'Input Validation', points: 5, found: foundFlags.includes('xss_reflected') },
    { name: 'Information Disclosure', points: 5, found: foundFlags.includes('hardcoded_creds') },
    { name: 'Access Control', points: 5, found: foundFlags.includes('default_admin') },
    { name: 'Session Security', points: 10, found: foundFlags.includes('csrf_transfer') },
    { name: 'Authorization', points: 10, found: foundFlags.includes('idor_access') },
    { name: 'Token Security', points: 10, found: foundFlags.includes('jwt_manipulation') },
    { name: 'Advanced Chaining', points: 30, found: foundFlags.includes('stored_xss_chain') }
  ];
}

// ── Flag Submission (GET) ──
app.get('/submit-flag', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const foundFlags = req.session.foundFlags || [];
  const challenges = buildChallenges(foundFlags);
  const totalScore = challenges.filter(c => c.found).reduce((s, c) => s + c.points, 0);

  res.render('scoreboard', {
    title: 'Flag Submission',
    user: req.session.user,
    message: null,
    error: null,
    challenges,
    totalScore,
    maxScore: 80
  });
});

// ── Flag Submission (POST) ──
app.post('/submit-flag', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { flag } = req.body;
  const db = getDb();
  const flags = allResults(db, 'SELECT challenge, flag, points FROM flags');
  db.close();

  if (!req.session.foundFlags) req.session.foundFlags = [];

  const matched = flags.find(f => f.flag === (flag || '').trim());
  let message = null, error = null;

  if (matched) {
    if (req.session.foundFlags.includes(matched.challenge)) {
      message = `You've already captured this flag! (+0 pts)`;
    } else {
      req.session.foundFlags.push(matched.challenge);
      message = `🎉 Flag accepted! +${matched.points} points!`;
    }
  } else {
    error = 'Invalid flag. Keep looking!';
  }

  const foundFlags = req.session.foundFlags;
  const challenges = buildChallenges(foundFlags);
  const totalScore = challenges.filter(c => c.found).reduce((s, c) => s + c.points, 0);

  res.render('scoreboard', {
    title: 'Flag Submission',
    user: req.session.user,
    message,
    error,
    challenges,
    totalScore,
    maxScore: 80
  });
});

// ── Start ──
async function start() {
  await initSQL();
  app.listen(PORT, () => {
    console.log(`\n  CACTF Platform`);
    console.log(`  Running at http://localhost:${PORT}\n`);
  });
}

if (require.main === module) {
  start().catch(console.error);
}

module.exports = app;
