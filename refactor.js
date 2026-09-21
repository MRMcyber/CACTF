const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const routesDir = path.join(__dirname, 'routes');
const publicJsDir = path.join(__dirname, 'public', 'js');
const rootDir = __dirname;

const replacements = [
  { regex: /☁️ CACTF SaaS/g, replacement: '☁️ CACTF SaaS' },
  { regex: /CACTF/g, replacement: 'CACTF' },
  { regex: /SaaS Dashboard/g, replacement: 'SaaS Dashboard' },
  { regex: /Student \& Faculty Directory/g, replacement: 'Customer Directory' },
  { regex: /Customers/g, replacement: 'Customers' },
  { regex: /Billing \& Transfers/g, replacement: 'Billing \& Invoicing' },
  { regex: /Billing/g, replacement: 'Billing' },
  { regex: /Dashboard/g, replacement: 'Dashboard' },
  { regex: /horizon-university\.edu/g, replacement: 'cactf-saas.com' },
  { regex: /\[HorizonU\]/g, replacement: '[CACTF]' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ejs') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(viewsDir);
processDirectory(routesDir);
processDirectory(publicJsDir);
processDirectory(rootDir); // For server.js

console.log('Theme refactoring complete.');
