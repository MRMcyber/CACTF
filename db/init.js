const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { faker } = require('@faker-js/faker');

const DB_PATH = path.join(__dirname, 'ctf.db');

async function initDatabase() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      email TEXT,
      full_name TEXT,
      phone TEXT,
      ssn TEXT,
      balance REAL DEFAULT 1000.00,
      role TEXT DEFAULT 'user',
      bio TEXT DEFAULT '',
      created_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge TEXT UNIQUE,
      flag TEXT,
      points INTEGER
    )
  `);

  // Insert admin user
  db.run(`
    INSERT INTO users (username, password, email, full_name, phone, ssn, balance, role, bio, created_at)
    VALUES ('admin', 'admin', 'admin@ctf-platform.local', 'System Administrator', '+1-555-000-0000', '000-00-0000', 99999.00, 'admin', 'Platform administrator account', '${new Date().toISOString()}')
  `);

  // Common weak passwords for realism
  const weakPasswords = [
    'password', 'password123', '123456', 'qwerty', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', 'login', 'abc123', 'admin123',
    'passw0rd', 'shadow', 'sunshine', 'trustno1', 'iloveyou', 'batman',
    'football', 'charlie', 'donald', 'hello', 'access', 'thunder'
  ];

  // Generate and insert 100 users
  const users = [];
  const usedUsernames = new Set(['admin']);

  for (let i = 0; i < 100; i++) {
    let username;
    do {
      username = faker.internet.username().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    } while (usedUsernames.has(username));
    usedUsernames.add(username);

    const password = weakPasswords[i % weakPasswords.length];
    const email = faker.internet.email();
    const fullName = faker.person.fullName();
    const phone = faker.phone.number({ style: 'national' });
    const ssn = `${faker.number.int({min:100,max:999})}-${faker.number.int({min:10,max:99})}-${faker.number.int({min:1000,max:9999})}`;
    const balance = parseFloat((Math.random() * 4900 + 100).toFixed(2));
    const bio = faker.lorem.sentence();
    const createdAt = faker.date.past({ years: 2 }).toISOString();

    // User 42 gets a special SSN containing the IDOR flag
    const actualSsn = (i + 1 === 42) ? 'flag{581930}' : ssn;

    users.push({
      username, password, email, fullName, phone,
      ssn: actualSsn, balance, bio, createdAt
    });

    db.run(
      `INSERT INTO users (username, password, email, full_name, phone, ssn, balance, role, bio, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)`,
      [username, password, email, fullName, phone, actualSsn, balance, bio, createdAt]
    );
  }

  // Insert flags
  const flags = [
    ['sqli_basic', 'flag{194827}', 5],
    ['xss_reflected', 'flag{857391}', 5],
    ['hardcoded_creds', 'flag{402851}', 5],
    ['default_admin', 'flag{719304}', 5],
    ['csrf_transfer', 'flag{294851}', 10],
    ['idor_access', 'flag{581930}', 10],
    ['jwt_manipulation', 'flag{602941}', 10],
    ['stored_xss_chain', 'flag{391023}', 30]
  ];

  for (const [challenge, flag, points] of flags) {
    db.run(
      'INSERT INTO flags (challenge, flag, points) VALUES (?, ?, ?)',
      [challenge, flag, points]
    );
  }

  // Save database to file
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);

  // Export users to JSON
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(dataDir, 'users.json'),
    JSON.stringify(users.map((u, i) => ({ id: i + 2, ...u })), null, 2)
  );

  console.log(`✅ Database initialized at ${DB_PATH}`);
  console.log(`✅ ${users.length} users created (+ 1 admin)`);
  console.log(`✅ ${flags.length} flags inserted`);
  console.log(`✅ User data exported to data/users.json`);
  console.log(`\n🔑 Admin credentials: admin / admin`);
  console.log(`🎯 IDOR target: User ID 43 (index 42 in users, id=43 in DB because admin is id=1)`);

  db.close();
}

initDatabase().catch(console.error);
