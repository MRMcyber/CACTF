const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { query } = require('../db/database');
const { ensureRuntimeSchema } = require('../db/schema');
const PostgresSessionStore = require('../db/session-store');
const app = require('../server');
const username = `runtime_test_${randomUUID()}`;
let server, base, userId, cookie;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9o0AAAAASUVORK5CYII=', 'base64');
const invoke = (store, method, ...args) => new Promise((resolve, reject) =>
  store[method](...args, (error, data) => error ? reject(error) : resolve(data)));

before(async () => {
  await ensureRuntimeSchema();
  const rows = await query("INSERT INTO users (username, password, balance, bio) VALUES ($1, 'test-password', 50, '') RETURNING id", [username]);
  userId = rows[0].id;
  // Emulate Vercel reading multipart bytes before Express sees the request.
  server = http.createServer((req, res) => {
    if (!req.headers['content-type']?.startsWith('multipart/form-data')) return app(req, res);
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => { req.body = Buffer.concat(chunks); app(req, res); });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(base + '/login', {
    method: 'POST', body: new URLSearchParams({ username, password: 'test-password' }), redirect: 'manual'
  });
  assert.equal(response.status, 302);
  cookie = response.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  if (cookie) await fetch(base + '/logout', { headers: { cookie }, redirect: 'manual' });
  if (userId) await query('DELETE FROM users WHERE id = $1', [userId]);
  if (server) await new Promise(resolve => server.close(resolve));
});

test('sessions survive independent stores, expire, and can be destroyed', async () => {
  const first = new PostgresSessionStore(), second = new PostgresSessionStore();
  const sid = `test-${randomUUID()}`;
  try {
    await invoke(first, 'set', sid, { cookie: { expires: new Date(Date.now() + 60000) }, user: { id: userId } });
    assert.equal((await invoke(second, 'get', sid)).user.id, userId);
    await invoke(second, 'touch', sid, { cookie: { expires: new Date(Date.now() - 1000) } });
    assert.equal(await invoke(first, 'get', sid), null);
    await invoke(first, 'destroy', sid);
    assert.equal(await invoke(second, 'get', sid), null);
  } finally { await query('DELETE FROM sessions WHERE sid = $1', [sid]); }
});

test('pre-parsed multipart bytes upload and render the persisted avatar', async () => {
  const form = new FormData();
  form.append('avatar', new Blob([png], { type: 'image/png' }), 'picture.png');
  const response = await fetch(base + '/profile/upload', { method: 'POST', headers: { cookie }, body: form });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Avatar uploaded successfully/);
  const avatar = await fetch(base + '/profile/avatar?f=current', { headers: { cookie } });
  assert.equal(avatar.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await avatar.arrayBuffer()), png);
  const login = await fetch(base + '/login', {
    method: 'POST', body: new URLSearchParams({ username, password: 'test-password' }), redirect: 'manual'
  });
  const freshCookie = login.headers.get('set-cookie').split(';')[0];
  const persisted = await fetch(base + '/profile/avatar?f=current', { headers: { cookie: freshCookie } });
  assert.deepEqual(Buffer.from(await persisted.arrayBuffer()), png);
  await fetch(base + '/logout', { headers: { cookie: freshCookie }, redirect: 'manual' });
});

test('missing, malformed, oversized, and non-image uploads return useful errors', async () => {
  const invalid = new FormData();
  invalid.append('avatar', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
  let response = await fetch(base + '/profile/upload', { method: 'POST', headers: { cookie }, body: invalid });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Choose a PNG/);
  response = await fetch(base + '/profile/upload', { method: 'POST', headers: { cookie }, body: new FormData() });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Please select an image/);
  response = await fetch(base + '/profile/upload', {
    method: 'POST', headers: { cookie, 'Content-Type': 'multipart/form-data; boundary=missing' }, body: 'broken'
  });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /Unable to read the upload/);
  const large = new FormData();
  large.append('avatar', new Blob([Buffer.alloc(2 * 1024 * 1024 + 1)]), 'large.png');
  response = await fetch(base + '/profile/upload', { method: 'POST', headers: { cookie }, body: large });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /smaller than 2 MB/);
});

test('invalid API IDs and malformed JSON respond without hanging the app', async () => {
  const response = await fetch(base + '/api/users/not-a-number/profile');
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'Invalid user ID');
  const malformed = await fetch(base + '/api/webhook/test', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{'
  });
  assert.equal(malformed.status, 400);
  assert.ok((await malformed.json()).error);
  assert.equal((await fetch(base + '/login')).status, 200);
});
