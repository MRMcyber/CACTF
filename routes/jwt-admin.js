const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

// JWT signing secret
const JWT_SECRET = 'secret';

// Helper to get single row as object
function getRow(db, query, params) {
  const stmt = db.prepare(query);
  if (params) stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
  }
  stmt.free();
  return row;
}

// GET /jwt/login
router.get('/login', (req, res) => {
  res.render('jwt-login', {
    title: 'JWT Authentication',
    user: req.session.user,
    message: null,
    error: null,
    token: null
  });
});

// POST /jwt/login - Returns a JWT token
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDb();
  const user = getRow(db, 'SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  db.close();

  if (user) {
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    res.render('jwt-login', {
      title: 'JWT Authentication',
      user: req.session.user,
      message: 'Authentication successful! Your JWT token:',
      error: null,
      token: token
    });
  } else {
    res.render('jwt-login', {
      title: 'JWT Authentication',
      user: req.session.user,
      message: null,
      error: 'Invalid credentials',
      token: null
    });
  }
});

// GET /jwt/admin - JWT-protected admin panel (SOC Dashboard)
router.get('/admin', (req, res) => {
  const authHeader = req.headers.authorization;
  const tokenFromQuery = req.query.token;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (tokenFromQuery) {
    token = tokenFromQuery;
  }

  if (!token) {
    return res.status(401).render('jwt-login', {
      title: 'JWT Authentication',
      user: req.session.user,
      message: null,
      error: 'Access denied. Provide a valid JWT token via Authorization header or ?token= query parameter.',
      token: null
    });
  }

  try {
    // VULNERABLE: weak secret 'secret' is dictionary-attackable
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });

    if (decoded.role === 'admin') {
      res.render('jwt-admin', {
        title: 'Security Operations Center',
        user: req.session.user,
        message: null,
        error: null,
        claims: decoded,
        flag: 'flag{602941}'
      });
    } else {
      res.status(403).render('jwt-login', {
        title: 'JWT Authentication',
        user: req.session.user,
        message: null,
        error: `Access denied. Insufficient privileges.`,
        token: null
      });
    }
  } catch (e) {
    res.status(401).render('jwt-login', {
      title: 'JWT Authentication',
      user: req.session.user,
      message: null,
      error: 'Invalid token: ' + e.message,
      token: null
    });
  }
});

module.exports = router;
