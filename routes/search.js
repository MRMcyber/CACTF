const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');

// Helper to convert sql.js results to array of objects
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

// GET /search - VULNERABLE TO REFLECTED XSS
router.get('/', (req, res) => {
  const query = req.query.q || '';
  let xss_flag = null;
  if (query.includes('<script>') || query.includes('onerror=')) {
      xss_flag = 'flag{857391}';
  }
  let results = [];

  if (query) {
    const db = getDb();
    results = allResults(db,
      'SELECT id, username, email, full_name FROM users WHERE username LIKE ? OR full_name LIKE ? OR email LIKE ?',
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    db.close();
  }

  // Return search results
  res.render('search', {
    title: 'Search Users',
    user: req.session.user,
    message: null,
    error: null,
    query: query,
    xss_flag: xss_flag,
    results: results
  });
});

module.exports = router;
