const fs = require('fs');
const path = require('path');

const flagMap = {
  'flag{194827}': 'flag{194827}',
  'flag{857391}': 'flag{857391}',
  'flag{402851}': 'flag{402851}',
  'flag{719304}': 'flag{719304}',
  'flag{294851}': 'flag{294851}',
  'flag{581930}': 'flag{581930}',
  'flag{602941}': 'flag{602941}',
  'flag{391023}': 'flag{391023}'
};

function replaceInDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'ctf.db' || file === '.git' || file === 'data') continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ejs') || fullPath.endsWith('.md')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      for (const [oldFlag, newFlag] of Object.entries(flagMap)) {
        if (content.includes(oldFlag)) {
          content = content.split(oldFlag).join(newFlag);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated flags in: ${fullPath}`);
      }
    }
  }
}

replaceInDirectory(__dirname);
console.log('Flag update complete.');
