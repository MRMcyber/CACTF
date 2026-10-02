/**
 * Generate a 100k-word directory bruteforce wordlist for the CTF.
 * Real app endpoints are buried inside so participants must bruteforce to find them.
 */
const fs = require('fs');
const path = require('path');

// ── Real endpoints participants need to discover ──
const realPaths = [
  'login', 'register', 'logout', 'search', 'profile', 'transfer',
  'admin', 'admin/dashboard', 'admin/reports',
  'jwt', 'jwt/login', 'jwt/admin',
  'api', 'api/secret', 'api/users', 'api/admin', 'api/admin/secret-flag',
  'submit-flag', 'scoreboard',
  'js/config.js', 'js/app.js', 'css/style.css',
  'public', 'dashboard', 'reports'
];

// ── Word components for generating realistic fake paths ──
const prefixes = [
  'admin', 'api', 'app', 'auth', 'account', 'assets', 'ajax', 'backup',
  'bin', 'blog', 'build', 'cache', 'cdn', 'cgi', 'cgi-bin', 'client',
  'cms', 'config', 'console', 'content', 'core', 'cp', 'cpanel', 'cron',
  'css', 'dashboard', 'data', 'database', 'db', 'debug', 'demo', 'dev',
  'docs', 'download', 'email', 'embed', 'engine', 'env', 'error', 'event',
  'export', 'external', 'feed', 'file', 'files', 'fonts', 'form', 'forum',
  'framework', 'frontend', 'ftp', 'gateway', 'global', 'graphql', 'grpc',
  'guest', 'handler', 'health', 'help', 'hidden', 'home', 'hook', 'host',
  'html', 'http', 'i18n', 'image', 'images', 'img', 'import', 'inbox',
  'include', 'index', 'info', 'init', 'install', 'internal', 'intranet',
  'io', 'job', 'jobs', 'json', 'key', 'lang', 'layout', 'legacy', 'lib',
  'library', 'license', 'link', 'load', 'local', 'locale', 'log', 'login',
  'logout', 'logs', 'mail', 'main', 'manage', 'manager', 'map', 'media',
  'member', 'members', 'menu', 'message', 'meta', 'metrics', 'migrate',
  'misc', 'mobile', 'mock', 'model', 'module', 'modules', 'monitor',
  'net', 'network', 'new', 'news', 'node', 'node_modules', 'notification',
  'oauth', 'old', 'open', 'order', 'orders', 'org', 'out', 'output',
  'package', 'page', 'pages', 'panel', 'partner', 'password', 'patch',
  'payment', 'php', 'ping', 'pipeline', 'plugin', 'plugins', 'portal',
  'post', 'preview', 'print', 'private', 'proc', 'process', 'product',
  'products', 'profile', 'project', 'proxy', 'public', 'push', 'queue',
  'raw', 'readme', 'recovery', 'redirect', 'register', 'release', 'remote',
  'render', 'report', 'reports', 'request', 'reset', 'resource', 'resources',
  'rest', 'result', 'review', 'robot', 'robots', 'root', 'route', 'router',
  'rpc', 'rss', 'run', 'runtime', 'saml', 'sandbox', 'save', 'schedule',
  'schema', 'script', 'scripts', 'sdk', 'search', 'secret', 'secure',
  'security', 'seed', 'server', 'service', 'services', 'session', 'setting',
  'settings', 'setup', 'share', 'shell', 'shop', 'sign', 'signin', 'signup',
  'site', 'sitemap', 'smtp', 'socket', 'source', 'sql', 'sso', 'staff',
  'stage', 'staging', 'start', 'static', 'stats', 'status', 'storage',
  'store', 'stream', 'style', 'submit', 'support', 'swagger', 'sync',
  'sys', 'system', 'table', 'tag', 'task', 'tasks', 'team', 'temp',
  'template', 'templates', 'tenant', 'terms', 'test', 'testing', 'theme',
  'themes', 'ticket', 'tmp', 'token', 'tool', 'tools', 'trace', 'track',
  'tracking', 'transfer', 'trigger', 'tunnel', 'ui', 'update', 'upgrade',
  'upload', 'uploads', 'url', 'user', 'users', 'util', 'utils', 'v1',
  'v2', 'v3', 'validate', 'vendor', 'version', 'video', 'view', 'views',
  'virtual', 'vpn', 'web', 'webapp', 'webhook', 'webhooks', 'websocket',
  'widget', 'wiki', 'worker', 'workflow', 'wp', 'wp-admin', 'wp-content',
  'wp-includes', 'wp-json', 'xml', 'xss', 'yaml', 'zone'
];

const suffixes = [
  'action', 'api', 'aspx', 'auth', 'bak', 'backup', 'cfg', 'check',
  'class', 'conf', 'config', 'controller', 'create', 'crt', 'dat',
  'data', 'db', 'default', 'delete', 'detail', 'details', 'dev',
  'dir', 'dist', 'dll', 'doc', 'edit', 'email', 'endpoint', 'engine',
  'env', 'error', 'example', 'exec', 'export', 'ext', 'file', 'form',
  'get', 'handler', 'health', 'helper', 'history', 'htm', 'html',
  'import', 'index', 'info', 'init', 'input', 'install', 'internal',
  'item', 'items', 'js', 'json', 'jwt', 'key', 'lib', 'list', 'load',
  'local', 'log', 'login', 'logs', 'main', 'manage', 'manager', 'map',
  'master', 'md', 'menu', 'meta', 'method', 'migration', 'min', 'model',
  'module', 'new', 'node', 'oauth', 'old', 'open', 'option', 'options',
  'order', 'original', 'output', 'override', 'page', 'panel', 'param',
  'parse', 'partial', 'password', 'path', 'payload', 'pdf', 'php',
  'ping', 'plugin', 'policy', 'pool', 'portal', 'post', 'preview',
  'private', 'proc', 'process', 'prod', 'production', 'provider',
  'proxy', 'public', 'query', 'queue', 'raw', 'read', 'recovery',
  'redirect', 'register', 'remote', 'render', 'report', 'request',
  'reset', 'resolve', 'resource', 'response', 'result', 'retry',
  'return', 'review', 'role', 'root', 'route', 'router', 'run',
  'runtime', 'sample', 'save', 'schema', 'script', 'search', 'secret',
  'seed', 'send', 'server', 'service', 'session', 'set', 'settings',
  'setup', 'shell', 'show', 'signin', 'signup', 'site', 'socket',
  'source', 'sql', 'sso', 'staging', 'start', 'state', 'static',
  'stats', 'status', 'step', 'store', 'stream', 'string', 'style',
  'submit', 'super', 'support', 'swagger', 'sync', 'system', 'table',
  'target', 'task', 'temp', 'template', 'test', 'text', 'theme',
  'tmp', 'token', 'tool', 'trace', 'track', 'transfer', 'txt',
  'type', 'update', 'upgrade', 'upload', 'url', 'user', 'users',
  'util', 'utils', 'validate', 'value', 'vendor', 'verify', 'version',
  'view', 'web', 'webhook', 'widget', 'worker', 'write', 'xml',
  'yaml', 'yml', 'zip'
];

const fileExts = [
  '.php', '.asp', '.aspx', '.jsp', '.html', '.htm', '.txt', '.xml',
  '.json', '.yml', '.yaml', '.cfg', '.conf', '.ini', '.env', '.bak',
  '.old', '.log', '.sql', '.db', '.sqlite', '.csv', '.md', '.pdf',
  '.zip', '.tar.gz', '.gz', '.rar', '.7z', '.swp', '.swo',
  '.py', '.rb', '.pl', '.sh', '.bat', '.ps1', '.js', '.ts', '.jsx',
  '.css', '.scss', '.map', '.min.js', '.min.css', '.bundle.js',
  '.woff', '.woff2', '.ttf', '.eot', '.svg', '.png', '.jpg', '.ico',
  '.key', '.pem', '.crt', '.csr', '.p12', '.pfx', '.pub',
  '.dockerfile', '.gitignore', '.htaccess', '.htpasswd',
  '.DS_Store', '.npmrc', '.nvmrc'
];

const commonFiles = [
  'robots.txt', 'sitemap.xml', 'favicon.ico', '.env', '.env.local',
  '.env.production', '.env.development', '.env.staging', '.env.backup',
  '.git/config', '.git/HEAD', '.gitignore', '.htaccess', '.htpasswd',
  'web.config', 'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  'package.json', 'package-lock.json', 'yarn.lock', 'composer.json',
  'composer.lock', 'Gemfile', 'Gemfile.lock', 'requirements.txt',
  'Pipfile', 'Pipfile.lock', 'Makefile', 'Gruntfile.js', 'gulpfile.js',
  'webpack.config.js', 'tsconfig.json', 'babel.config.js', '.babelrc',
  'jest.config.js', 'karma.conf.js', 'pm2.json', 'ecosystem.config.js',
  'Procfile', 'Vagrantfile', 'nginx.conf', 'httpd.conf', 'server.xml',
  'applicationContext.xml', 'struts.xml', 'web.xml', 'pom.xml',
  'build.gradle', 'settings.gradle', 'README.md', 'CHANGELOG.md',
  'LICENSE', 'LICENSE.md', 'CONTRIBUTING.md', 'TODO.md', 'SECURITY.md',
  'phpinfo.php', 'info.php', 'test.php', 'wp-config.php', 'config.php',
  'database.yml', 'secrets.yml', 'credentials.yml', 'application.yml',
  'appsettings.json', 'launchSettings.json', 'manifest.json',
  'crossdomain.xml', 'clientaccesspolicy.xml', 'browserconfig.xml',
  'humans.txt', 'security.txt', '.well-known/security.txt',
  'swagger.json', 'swagger.yaml', 'openapi.json', 'openapi.yaml',
  'graphql', 'graphiql', '.graphqlrc', 'schema.graphql',
  'Caddyfile', 'traefik.yml', 'haproxy.cfg',
  'id_rsa', 'id_rsa.pub', 'authorized_keys', 'known_hosts',
  'server.key', 'server.crt', 'ca-bundle.crt',
  'error.log', 'access.log', 'debug.log', 'app.log',
  'dump.sql', 'backup.sql', 'database.sql', 'db.sql',
  'backup.zip', 'backup.tar.gz', 'site.zip', 'www.zip',
  'phpMyAdmin', 'phpmyadmin', 'pma', 'adminer', 'adminer.php'
];

const words = new Set();

// 1. Add all real paths
realPaths.forEach(p => words.add(p));

// 2. Add common files
commonFiles.forEach(f => words.add(f));

// 3. Single prefixes
prefixes.forEach(p => words.add(p));

// 4. prefix/suffix combos
for (const p of prefixes) {
  for (const s of suffixes) {
    if (words.size >= 100000) break;
    words.add(`${p}/${s}`);
    words.add(`${p}-${s}`);
    words.add(`${p}_${s}`);
  }
}

// 5. prefix + file extensions
for (const p of prefixes) {
  for (const ext of fileExts) {
    if (words.size >= 100000) break;
    words.add(`${p}${ext}`);
  }
}

// 6. prefix/prefix combos
for (const p1 of prefixes) {
  for (const p2 of prefixes) {
    if (words.size >= 100000) break;
    if (p1 !== p2) words.add(`${p1}/${p2}`);
  }
}

// 7. Numbered variants
for (const p of prefixes) {
  for (let i = 0; i <= 20; i++) {
    words.add(`${p}${i}`);
    words.add(`${p}/${i}`);
    words.add(`${p}-${i}`);
  }
  words.add(`${p}/v1`);
  words.add(`${p}/v2`);
  words.add(`${p}/v3`);
  words.add(`${p}/new`);
  words.add(`${p}/old`);
  words.add(`${p}/test`);
  words.add(`${p}/dev`);
  words.add(`${p}/staging`);
  words.add(`${p}/prod`);
  words.add(`${p}/beta`);
  words.add(`${p}/alpha`);
  words.add(`${p}/latest`);
  words.add(`${p}/current`);
  words.add(`${p}/backup`);
}

// 8. Deep paths
const deepDirs = ['api', 'admin', 'app', 'user', 'users', 'system', 'internal', 'v1', 'v2', 'private', 'public', 'secure', 'auth', 'manage'];
for (const d1 of deepDirs) {
  for (const d2 of prefixes.slice(0, 80)) {
    for (const d3 of suffixes.slice(0, 30)) {
      if (words.size >= 100000) break;
      words.add(`${d1}/${d2}/${d3}`);
    }
  }
}

// 9. Fill remaining with more combos
const fillers = ['index', 'default', 'main', 'home', 'start', 'root', 'base', 'core', 'entry', 'portal'];
while (words.size < 100000) {
  const p = prefixes[Math.floor(Math.random() * prefixes.length)];
  const s = suffixes[Math.floor(Math.random() * suffixes.length)];
  const ext = fileExts[Math.floor(Math.random() * fileExts.length)];
  const f = fillers[Math.floor(Math.random() * fillers.length)];
  const n = Math.floor(Math.random() * 9999);
  
  words.add(`${p}/${s}/${f}`);
  words.add(`${p}_${s}_${n}`);
  words.add(`${p}-${n}${ext}`);
  words.add(`${p}/${f}-${s}`);
  words.add(`${f}/${p}/${s}`);
  words.add(`${p}${ext.replace('.', '_')}${n}`);
}

// Shuffle — convert to array and Fisher-Yates
const arr = Array.from(words).slice(0, 100000);
for (let i = arr.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [arr[i], arr[j]] = [arr[j], arr[i]];
}

const outPath = path.join(__dirname, 'data', 'wordlist.txt');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, arr.join('\n') + '\n');

console.log(`✅ Wordlist generated: ${arr.length} entries`);
console.log(`📄 Saved to: ${outPath}`);

// Verify real paths are included
const missing = realPaths.filter(p => !arr.includes(p));
if (missing.length > 0) {
  console.log(`⚠️  Missing real paths (re-run): ${missing.join(', ')}`);
} else {
  console.log(`✅ All ${realPaths.length} real endpoints included`);
}
