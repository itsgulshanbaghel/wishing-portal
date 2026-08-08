const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Mapping of original files to WebP versions
const imageMapping = {
  'devi.png': 'devi.webp',
  'devi_en.png': 'devi_en.webp',
  'ganga_aarti.png': 'ganga_aarti.webp',
  'F1.png': 'F1.webp',
  'F2.png': 'F2.webp',
  'og-cover.png': 'og-cover.webp',
  'ganga_dussehra_main.png': 'ganga_dussehra_main.webp',
  'ganga_spiritual.png': 'ganga_spiritual.webp',
  'CLOGO.jpg': 'CLOGO.webp',
  'Dark_logo.png': 'Dark_logo.webp',
  'Light_logo.png': 'Light_logo.webp'
};

function updateHtmlFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let changes = [];

  for (const [original, webp] of Object.entries(imageMapping)) {
    // Check for various path patterns
    const patterns = [
      original,
      `assets/${original}`,
      `/assets/${original}`,
      `../assets/${original}`,
      `./assets/${original}`
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.replace('.', '\\.'), 'g');
      const matches = content.match(regex);
      if (matches) {
        const webpPattern = pattern.replace(original, webp);
        content = content.replace(regex, webpPattern);
        modified = true;
        changes.push(`${pattern} → ${webpPattern} (${matches.length} times)`);
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${path.relative(__dirname, filePath)}`);
    changes.forEach(change => console.log(`  ${change}`));
    return true;
  }
  return false;
}

function main() {
  console.log('Updating HTML image references to WebP...\n');

  const publicDir = path.join(__dirname, 'public');
  const htmlFiles = glob.sync('**/*.html', { cwd: publicDir });

  let updatedCount = 0;

  for (const htmlFile of htmlFiles) {
    const filePath = path.join(publicDir, htmlFile);
    if (updateHtmlFile(filePath)) {
      updatedCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files updated: ${updatedCount}`);
  console.log(`Total HTML files: ${htmlFiles.length}`);
}

main().catch(console.error);
