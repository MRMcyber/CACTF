const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, searchRegex, replacementText) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(searchRegex, replacementText);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
}

const viewsDir = path.join(__dirname, 'views');

// 1. SQLi - Make Staff Notes massive in profile.ejs
const profilePath = path.join(viewsDir, 'profile.ejs');
replaceInFile(profilePath, 
    /<% if \(typeof sqli_flag !== 'undefined' && sqli_flag\) { %>[\s\S]*?<% } %>/m,
    `<% if (typeof sqli_flag !== 'undefined' && sqli_flag) { %>
    <div style="background: #ef4444; color: white; padding: 2rem; border-radius: 10px; margin-top: 2rem; text-align: center; border: 4px solid #b91c1c;">
      <h2 style="color: white; margin-bottom: 1rem;">🚨 VULNERABILITY EXPLOITED: SQL INJECTION 🚨</h2>
      <p style="font-size: 1.2rem; margin-bottom: 1rem;">You successfully bypassed authentication as the admin user!</p>
      <div style="background: #7f1d1d; padding: 1rem; border-radius: 5px; font-family: monospace; font-size: 1.5rem; letter-spacing: 2px;">
        <%= sqli_flag %>
      </div>
      <p style="margin-top: 1rem;">Submit this flag on the Flag Submission page to claim your points.</p>
    </div>
  <% } %>`
);

// 2. Admin Dashboard - Make default credentials flag massive
const adminPath = path.join(viewsDir, 'admin.ejs');
replaceInFile(adminPath,
    /<div class="stat-card">[\s\S]*?<div class="stat-value" style="font-size: 1.2rem; word-break: break-all;"><%= flag %><\/div>[\s\S]*?<div class="stat-label">License Key<\/div>[\s\S]*?<\/div>/m,
    `<div style="background: #ef4444; color: white; padding: 2rem; border-radius: 10px; margin-bottom: 2rem; text-align: center; border: 4px solid #b91c1c; grid-column: 1 / -1;">
      <h2 style="color: white; margin-bottom: 1rem;">🚨 VULNERABILITY EXPLOITED: BROKEN ACCESS CONTROL 🚨</h2>
      <p style="font-size: 1.2rem; margin-bottom: 1rem;">You successfully accessed the protected Admin Dashboard!</p>
      <div style="background: #7f1d1d; padding: 1rem; border-radius: 5px; font-family: monospace; font-size: 1.5rem; letter-spacing: 2px;">
        <%= flag %>
      </div>
      <p style="margin-top: 1rem;">Submit this flag on the Flag Submission page to claim your points.</p>
    </div>`
);

// 3. Transfer (CSRF) - Make flag massive
const transferPath = path.join(viewsDir, 'transfer.ejs');
replaceInFile(transferPath,
    /<% if \(typeof flag !== 'undefined' && flag\) { %>[\s\S]*?<% } %>/m,
    `<% if (typeof flag !== 'undefined' && flag) { %>
    <div style="background: #ef4444; color: white; padding: 2rem; border-radius: 10px; margin-bottom: 2rem; text-align: center; border: 4px solid #b91c1c;">
      <h2 style="color: white; margin-bottom: 1rem;">🚨 VULNERABILITY EXPLOITED: CSRF 🚨</h2>
      <p style="font-size: 1.2rem; margin-bottom: 1rem;">You successfully performed an unauthorized high-value transfer!</p>
      <div style="background: #7f1d1d; padding: 1rem; border-radius: 5px; font-family: monospace; font-size: 1.5rem; letter-spacing: 2px;">
        <%= flag %>
      </div>
      <p style="margin-top: 1rem;">Submit this flag on the Flag Submission page to claim your points.</p>
    </div>
  <% } %>`
);

// 4. JWT Admin - Make flag massive
const jwtAdminPath = path.join(viewsDir, 'jwt-admin.ejs');
replaceInFile(jwtAdminPath,
    /<div class="soc-flag">[\s\S]*?<%= flag %>[\s\S]*?<\/div>/m,
    `<div style="background: #ef4444; color: white; padding: 2rem; border-radius: 10px; margin-top: 2rem; text-align: center; border: 4px solid #b91c1c;">
      <h2 style="color: white; margin-bottom: 1rem;">🚨 VULNERABILITY EXPLOITED: JWT FORGERY 🚨</h2>
      <p style="font-size: 1.2rem; margin-bottom: 1rem;">You successfully forged an admin JWT token!</p>
      <div style="background: #7f1d1d; padding: 1rem; border-radius: 5px; font-family: monospace; font-size: 1.5rem; letter-spacing: 2px;">
        <%= flag %>
      </div>
      <p style="margin-top: 1rem;">Submit this flag on the Flag Submission page to claim your points.</p>
    </div>`
);

// 5. Reflected XSS - Add flag display to search.js and search.ejs
const searchJsPath = path.join(__dirname, 'routes', 'search.js');
let searchJsContent = fs.readFileSync(searchJsPath, 'utf8');
searchJsContent = searchJsContent.replace(
    /const query = req\.query\.q \|\| '';/,
    `const query = req.query.q || '';
  let xss_flag = null;
  if (query.includes('<script>') || query.includes('onerror=')) {
      xss_flag = 'flag{857391}';
  }`
);
searchJsContent = searchJsContent.replace(
    /query: query,/,
    `query: query,\n    xss_flag: xss_flag,`
);
fs.writeFileSync(searchJsPath, searchJsContent, 'utf8');
console.log('Updated search.js');

const searchEjsPath = path.join(viewsDir, 'search.ejs');
replaceInFile(searchEjsPath,
    /<\/form>/,
    `</form>
  
  <% if (typeof xss_flag !== 'undefined' && xss_flag) { %>
    <div style="background: #ef4444; color: white; padding: 2rem; border-radius: 10px; margin-top: 2rem; text-align: center; border: 4px solid #b91c1c;">
      <h2 style="color: white; margin-bottom: 1rem;">🚨 VULNERABILITY EXPLOITED: REFLECTED XSS 🚨</h2>
      <p style="font-size: 1.2rem; margin-bottom: 1rem;">You successfully injected a cross-site scripting payload!</p>
      <div style="background: #7f1d1d; padding: 1rem; border-radius: 5px; font-family: monospace; font-size: 1.5rem; letter-spacing: 2px;">
        <%= xss_flag %>
      </div>
      <p style="margin-top: 1rem;">Submit this flag on the Flag Submission page to claim your points.</p>
    </div>
  <% } %>`
);

console.log('Flag banners injected.');
