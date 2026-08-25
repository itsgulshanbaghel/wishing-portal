const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('public/**/*.html');
files.forEach(file => {
    let html = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Font optimizations
    if (html.includes('https://fonts.googleapis.com/css2') && !html.includes('rel="preload" as="style"')) {
        const linkTagRegex = /<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2[^>]*>/i;
        const match = html.match(linkTagRegex);
        if (match) {
            let tag = match[0];
            if (!tag.includes('display=swap')) {
                tag = tag.replace('css2?', 'css2?display=swap&');
                html = html.replace(match[0], tag);
            }
            const hrefMatch = tag.match(/href="([^"]+)"/);
            if (hrefMatch) {
                const preload = `<link rel="preload" as="style" href="${hrefMatch[1]}">\n  ${tag}`;
                html = html.replace(match[0], preload);
                changed = true;
            }
        }
    }

    // Image WebP optimizations
    const imageReplacements = [
        { from: 'assets/F1.png', to: 'assets/F1.webp' },
        { from: 'assets/F2.png', to: 'assets/F2.webp' },
        { from: 'assets/Light_logo.png', to: 'assets/Light_logo.webp' },
        { from: 'assets/Dark_logo.png', to: 'assets/Dark_logo.webp' },
        { from: 'assets/CLOGO.jpg', to: 'assets/CLOGO.webp' },
        { from: 'assets/og-cover.png', to: 'assets/og-cover.webp' }
    ];

    imageReplacements.forEach(({from, to}) => {
        const regex = new RegExp(from, 'g');
        if (regex.test(html)) {
            html = html.replace(regex, to);
            changed = true;
        }
    });
    
    if (changed) {
        fs.writeFileSync(file, html, 'utf8');
        console.log('Optimized:', file);
    }
});
