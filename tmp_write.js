
const fs = require('fs');
const path = 'D:\\wishing-portal\\public\\personalize.html';

const content = fs.readFileSync('D:\\wishing-portal\\public\\personalize.html', 'utf-8');
console.log('Current content:', JSON.stringify(content));
