const router = require('../lib/router')();
const { query } = require('../db/database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Readable } = require('stream');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 8 } });

async function renderProfile(req, res, message = null, error = null) {
  const rows = await query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
  if (!rows.length) return res.redirect('/logout');
  const avatars = await query('SELECT filename, updated_at FROM user_avatars WHERE user_id = $1', [req.session.user.id]);
  const avatar = avatars[0];
  res.locals.avatarUrl = avatar
    ? `/profile/avatar?f=${encodeURIComponent(avatar.filename)}&v=${encodeURIComponent(avatar.updated_at)}`
    : '/profile/avatar?f=default.png';
  res.render('profile', {
    title: 'Dashboard', user: req.session.user, message, error,
    profile: rows[0], sqli_flag: req.session.sqli_flag || null
  });
}

function receiveAvatar(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  // Vercel can consume multipart bodies before invoking the Express app.
  // Feed Multer the original bytes when the platform has already read them.
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.isBuffer(req.rawBody) ? req.rawBody : null;
  const input = raw ? Readable.from(raw) : req;
  if (raw) input.headers = { ...req.headers, 'content-length': String(raw.length) };
  upload.single('avatar')(input, res, error => {
    if (raw) { req.file = input.file; req.body = input.body; }
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Please choose an image smaller than 2 MB.'
      : 'Unable to read the upload. Select one image and try again.';
    renderProfile(req, res.status(400), null, message).catch(next);
  });
}

function imageType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  if (/^GIF8[79]a$/.test(buffer.subarray(0, 6).toString())) return 'image/gif';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

// GET /profile - Show logged-in user's profile
router.get('/', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  return renderProfile(req, res);
});

// POST /profile/update - Update bio
router.post('/update', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const bio = typeof req.body.bio === 'string' ? req.body.bio : '';
  await query('UPDATE users SET bio = $1 WHERE id = $2', [bio, req.session.user.id]);

  return renderProfile(req, res, 'Bio updated successfully!');
});

// GET /profile/avatar - Path traversal vulnerability!
router.get('/avatar', async (req, res) => {
  const file = req.query.f || 'default.png';
  if (typeof file !== 'string') return res.status(400).send('Invalid avatar filename');
  if (req.session.user && file !== 'default.png' && !file.startsWith('..')) {
    const avatars = await query(
      "SELECT mime_type, encode(data, 'base64') AS data FROM user_avatars WHERE user_id = $1 AND ($2 = 'current' OR filename = $2)",
      [req.session.user.id, file]
    );
    if (avatars[0]) {
      res.set('Cache-Control', 'private, no-cache');
      return res.type(avatars[0].mime_type).send(Buffer.from(avatars[0].data, 'base64'));
    }
  }
  // VULNERABLE: No validation or sanitization on 'file'
  const filePath = path.join(__dirname, '../public/uploads', file);
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      // If it's a text file (like the flag), send as text
      if (file.endsWith('.txt')) {
        res.type('text/plain');
      } else {
        res.type(path.extname(file));
      }
      res.send(data);
    } else if (file === 'default.png' || file === 'current') {
      // Return a simple SVG avatar as default
      res.type('image/svg+xml').send(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#e5e7eb" rx="50"/>
        <text x="50" y="58" text-anchor="middle" font-size="36" font-family="sans-serif" fill="#6b7280">👤</text>
      </svg>`);
    } else {
      res.status(404).send('Avatar not found');
    }
  } catch (err) {
    // If traversal reaches a valid file, still serve it (intentionally vulnerable)
    res.status(404).send('Avatar not found');
  }
});

// POST /profile/upload - Handle file upload
router.post('/upload', receiveAvatar, async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  if (!req.file) return renderProfile(req, res.status(400), null, 'Please select an image file to upload.');
  const mimeType = imageType(req.file.buffer);
  if (!mimeType) return renderProfile(req, res.status(400), null, 'Choose a PNG, JPEG, GIF, or WebP image.');
  const filename = `avatar-${req.session.user.id}.${mimeType.split('/')[1]}`;
  await query(
    `INSERT INTO user_avatars (user_id, filename, mime_type, data) VALUES ($1, $2, $3, decode($4, 'hex'))
     ON CONFLICT (user_id) DO UPDATE SET filename = EXCLUDED.filename, mime_type = EXCLUDED.mime_type,
       data = EXCLUDED.data, updated_at = NOW()`,
    [req.session.user.id, filename, mimeType, req.file.buffer.toString('hex')]
  );
  return renderProfile(req, res, 'Avatar uploaded successfully!');
});

// GET /api/users/:id/profile - User profile API
router.get('/users/:id/profile', async (req, res) => {
  if (!/^\d+$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
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
