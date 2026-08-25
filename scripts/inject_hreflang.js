const fs = require('fs');
const path = require('path');
const glob = require('glob');

const publicDir = path.join(__dirname, '../public');
const files = glob.sync('**/*.html', { cwd: publicDir, ignore: ['templates/**', 'generated/**', 'admin.html', 'maintenance.html', '404.html'] });

const targetCountries = ['en-in', 'en-us', 'en-ae', 'en-gb', 'en-ca', 'en-au', 'en-sg'];

files.forEach(file => {
    const filePath = path.join(publicDir, file);
    let html = fs.readFileSync(filePath, 'utf8');

    // Determine canonical URL path
    let urlPath = file === 'index.html' ? '' : file.replace('.html', '');
    if (file === 'index.html') urlPath = ''; // Root

    const canonicalUrl = `https://thegreeter.in${urlPath ? '/' + urlPath : '/'}`;

    let hreflangBlock = `\n  <!-- CANONICAL & HREFLANG -->\n  <link rel="canonical" href="${canonicalUrl}">\n  <link rel="alternate" hreflang="en" href="${canonicalUrl}">\n  <link rel="alternate" hreflang="x-default" href="${canonicalUrl}">\n`;
    targetCountries.forEach(code => {
        hreflangBlock += `  <link rel="alternate" hreflang="${code}" href="${canonicalUrl}">\n`;
    });

    // Check if CANONICAL & HREFLANG already exists
    if (html.includes('<!-- CANONICAL & HREFLANG -->')) {
        const regex = /<!-- CANONICAL & HREFLANG -->[\s\S]*?(?=<!-- OPEN GRAPH|<!-- JSON-LD|<script|<\/head>)/i;
        html = html.replace(regex, hreflangBlock + '  ');
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`Updated hreflang for ${file}`);
    } else {
        // Try to inject before OPEN GRAPH or </head>
        if (html.includes('<!-- OPEN GRAPH')) {
            html = html.replace('<!-- OPEN GRAPH', hreflangBlock + '  <!-- OPEN GRAPH');
            fs.writeFileSync(filePath, html, 'utf8');
            console.log(`Injected hreflang for ${file}`);
        } else if (html.includes('</head>')) {
            html = html.replace('</head>', hreflangBlock + '</head>');
            fs.writeFileSync(filePath, html, 'utf8');
            console.log(`Injected hreflang for ${file} (before </head>)`);
        }
    }
});
