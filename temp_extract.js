const fs = require('fs');
let code = fs.readFileSync('public/generated/customize.html', 'utf8');
const regex = /nudgeEl\.textContent\s*=\s*"((?:[^"\\]|\\.)*)"\s*;/;
const match = code.match(regex);
if (match) {
  fs.writeFileSync('temp_nudge.txt', match[1]);
  console.log('SUCCESS extracted ' + match[1].length + ' chars');
} else {
  console.log('NO MATCH for nudge textContent');
  const pos = code.indexOf('nudgeEl');
  if (pos>0) console.log('Found nudgeEl at ' + pos + ', nearby: ' + JSON.stringify(code.substring(pos, pos+300)));
}
