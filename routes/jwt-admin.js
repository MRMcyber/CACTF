const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');

// JWT signing secret
const JWT_SECRET = 'secret';

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
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const rows = await query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
  const user = rows.length > 0 ? rows[0] : null;

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
