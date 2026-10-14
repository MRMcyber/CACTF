const { query } = require('./database');

let initialization;
function ensureRuntimeSchema() {
  if (!initialization) {
    initialization = (async () => {
      // Add runtime storage without resetting any players or challenge data.
      await query(`CREATE TABLE IF NOT EXISTS sessions (
        sid TEXT PRIMARY KEY, data JSONB NOT NULL, expires_at TIMESTAMPTZ NOT NULL
      )`);
      await query(`CREATE TABLE IF NOT EXISTS user_avatars (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL, mime_type TEXT NOT NULL, data BYTEA NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await query(`CREATE TABLE IF NOT EXISTS user_flags (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        challenge TEXT REFERENCES flags(challenge) ON DELETE CASCADE,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, challenge)
      )`);
    })().catch(error => { initialization = null; throw error; });
  }
  return initialization;
}

if (require.main === module) {
  ensureRuntimeSchema().then(() => console.log('Runtime schema ready; existing players preserved.'))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { ensureRuntimeSchema };
