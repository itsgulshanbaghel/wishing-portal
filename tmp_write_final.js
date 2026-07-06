
const fs = require('fs');
const path = 'D:\\wishing-portal\\public\\personalize.html';

const html = fs.readFileSync('D:\\wishing-portal\\tmp_personalize_part1.html', 'utf-8') +
  fs.readFileSync('D:\\wishing-portal\\tmp_personalize_part2.html', 'utf-8') +
  fs.readFileSync('D:\\wishing-portal\\tmp_personalize_part3.html', 'utf-8') +
  fs.readFileSync('D:\\wishing-portal\\tmp_personalize_part4.html', 'utf-8');

fs.writeFileSync(path, html, 'utf-8');
console.log('Wrote personalize.html, size:', Buffer.byteLength(html, 'utf8'));
