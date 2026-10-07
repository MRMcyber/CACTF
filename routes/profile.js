const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const upload = multer({ dest: path.join(__dirname, '../public/uploads/') });

// GET /profile - Show logged-in user's profile
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const rows = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
  const profile = rows.length > 0 ? rows[0] : null;

  res.render('profile', {
    title: 'Dashboard',
    user: req.session.user,
    message: null,
    error: null,
    profile: profile,
    sqli_flag: req.session.sqli_flag || null
  });
});

// POST /profile/update - Update bio
router.post('/update', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const { bio } = req.body;
  await query('UPDATE users SET bio = $1 WHERE id = $2', [bio, req.session.user.id]);

  // Re-fetch and render directly (avoids redirect issues on Vercel)
  const rows = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
  const profile = rows.length > 0 ? rows[0] : null;

  res.render('profile', {
    title: 'Dashboard',
    user: req.session.user,
    message: 'Bio updated successfully!',
    error: null,
    profile: profile,
    sqli_flag: req.session.sqli_flag || null
  });
});

// GET /profile/avatar - Path traversal vulnerability!
router.get('/avatar', (req, res) => {
  const file = req.query.f || 'default.png';
  // VULNERABLE: No validation or sanitization on 'file'
  const filePath = path.join(__dirname, '../public/uploads', file);
  
  try {
    const data = fs.readFileSync(filePath);
    res.send(data);
  } catch (err) {
    res.status(404).send('Avatar not found');
  }
});

// POST /profile/upload - Handle file upload
router.post('/upload', upload.single('avatar'), async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  if (req.file) {
    req.session.user.avatar = req.file.filename;
  }

  const rows = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
  const profile = rows.length > 0 ? rows[0] : null;

  res.render('profile', {
    title: 'Dashboard',
    user: req.session.user,
    message: 'Avatar uploaded successfully!',
    error: null,
    profile: profile,
    sqli_flag: req.session.sqli_flag || null
  });
});

// GET /api/users/:id/profile - User profile API
router.get('/users/:id/profile', async (req, res) => {
  const rows = await query(
    'SELECT id, username, email, full_name, phone, ssn, balance, role, bio FROM users WHERE id = $1',
    [parseInt(req.params.id)]
  );

  if (rows.length > 0) {
    res.json(rows[0]);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// GET /api/user/session-info - Excessive Data Exposure target
router.get('/user/session-info', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  res.json({
    id: req.session.user.id,
    username: req.session.user.username,
    role: req.session.user.role,
    // Excessive data exposed in JSON response!
    debug_flag: 'flag{485729}'
  });
});

module.exports = router;
