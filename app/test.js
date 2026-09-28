const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

if (!html.includes('Incident Response Runbook')) {
  console.error('FAIL: page title missing');
  process.exit(1);
}
console.log('PASS: index.html looks good');
