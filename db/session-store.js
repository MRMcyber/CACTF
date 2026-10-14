const session = require('express-session');
const { query } = require('./database');
const { ensureRuntimeSchema } = require('./schema');

class PostgresSessionStore extends session.Store {
  get(sid, callback) {
    ensureRuntimeSchema().then(() => query(
      'SELECT data FROM sessions WHERE sid = $1 AND expires_at > NOW()', [sid]
    )).then(rows => callback(null, rows[0]?.data || null), callback);
  }

  set(sid, data, callback = () => {}) {
    const expires = data.cookie.expires || new Date(Date.now() + 86400000);
    ensureRuntimeSchema().then(() => query(
      `INSERT INTO sessions (sid, data, expires_at) VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (sid) DO UPDATE SET data = EXCLUDED.data, expires_at = EXCLUDED.expires_at`,
      [sid, JSON.stringify(data), expires]
    )).then(() => callback(null), callback);
  }

  touch(sid, data, callback = () => {}) {
    const expires = data.cookie.expires || new Date(Date.now() + 86400000);
    query('UPDATE sessions SET expires_at = $1 WHERE sid = $2', [expires, sid])
      .then(() => callback(null), callback);
  }

  destroy(sid, callback = () => {}) {
    query('DELETE FROM sessions WHERE sid = $1', [sid]).then(() => callback(null), callback);
  }
}
module.exports = PostgresSessionStore;
