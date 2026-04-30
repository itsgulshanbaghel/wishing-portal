const fs = require('fs');

const indexHtml = fs.readFileSync('public/index.html', 'utf8');
let createHtml = fs.readFileSync('public/create.html', 'utf8');

// Extract CSS for navbar from index.html (from '/* ---------- NAVBAR' up to '/* ---------- SHARE BUTTON')
const navbarCssMatch = indexHtml.match(/\/\* ---------- NAVBAR[\s\S]*?\/\* ---------- SHARE BUTTON/);
let navbarCss = navbarCssMatch ? navbarCssMatch[0].replace('/* ---------- SHARE BUTTON', '') : '';

// The footer CSS is part of the same block in index.html! Wait, in index.html:
// /* ---------- NAVBAR ...
// ...
// /* Footer (from ContactUs) */
// ...
// /* ---------- SHARE BUTTON

// Let's replace the whole block of CSS in create.html that corresponds to navbar and footer.
// In create.html, the navbar CSS starts at:
// .navbar {
// and ends around .loading-spinner-small or the media queries.
// It's safer to just inject the index.html CSS right before </style> and remove the old create.html navbar/footer CSS.

// Wait, doing this via script might be messy. Let's just use regular expressions carefully or just log the create.html CSS to see where to cut.
