const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('../MasterCodebase.txt');
let content = '### PACKAGE METADATA ###\n\n';

const packageJson = fs.readFileSync('package.json', 'utf8');
content += packageJson + '\n';

const appJson = fs.readFileSync('app.json', 'utf8');
content += appJson + '\n\n\n### SOURCE CODE ###\n\n\n\n';

const dirsToScan = ['app', 'components', 'constants', 'context', 'hooks', 'types'];

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      content += `--- ${fullPath.replace(/\\/g, '/')} ---\n\n`;
      content += fileContent + '\n\n\n';
    }
  }
}

dirsToScan.forEach(dir => walkDir(dir));

fs.writeFileSync(targetFile, content);
console.log('MasterCodebase.txt perfectly updated!');
