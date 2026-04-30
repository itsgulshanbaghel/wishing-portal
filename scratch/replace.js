const fs = require('fs');
const index = fs.readFileSync('public/index.html', 'utf8');
let create = fs.readFileSync('public/create.html', 'utf8');

const navHtmlMatch = index.match(/<nav class="navbar">[\s\S]*?<\/nav>/);
const footerHtmlMatch = index.match(/<footer class="footer">[\s\S]*?<\/footer>/);

if (!navHtmlMatch || !footerHtmlMatch) {
    console.error("Could not find nav or footer in index.html");
    process.exit(1);
}

let navHtml = navHtmlMatch[0];
let footerHtml = footerHtmlMatch[0];

// In create.html, the navbar has an id. We should add it back if we replace it.
const createNavRegex = /<nav class="navbar" id="navbar">[\s\S]*?<\/nav>/;
// In create.html, the footer is a div
const createFooterRegex = /<div class="footer">[\s\S]*?<div class="social">[\s\S]*?<\/div>\s*<\/div>/;

let newCreate = create.replace(createNavRegex, navHtml.replace('<nav class="navbar">', '<nav class="navbar" id="navbar">'));
newCreate = newCreate.replace(createFooterRegex, footerHtml);

// Save HTML replacements
fs.writeFileSync('public/create.html', newCreate);
console.log('HTML replaced successfully.');
