const fs = require('fs');
const path = require('path');
const glob = require('glob');

const protectionScript = '    <!-- Content Protection Script -->\n    <script src="assets/content-protection.js"></script>';

function addProtectionScript(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if protection script already exists
  if (content.includes('content-protection.js')) {
    return false;
  }
  
  // Find the closing </body> tag and add script before it
  const bodyCloseIndex = content.lastIndexOf('</body>');
  if (bodyCloseIndex === -1) {
    console.log(`⊘ No </body> tag found in ${path.relative(__dirname, filePath)}`);
    return false;
  }
  
  // Insert protection script before </body>
  content = content.slice(0, bodyCloseIndex) + protectionScript + '\n' + content.slice(bodyCloseIndex);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Added protection script to ${path.relative(__dirname, filePath)}`);
  return true;
}

function main() {
  console.log('Adding content protection script to all HTML files...\n');

  const publicDir = path.join(__dirname, 'public');
  const htmlFiles = glob.sync('**/*.html', { cwd: publicDir });

  let addedCount = 0;

  for (const htmlFile of htmlFiles) {
    const filePath = path.join(publicDir, htmlFile);
    if (addProtectionScript(filePath)) {
      addedCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Files updated: ${addedCount}`);
  console.log(`Files already protected: ${htmlFiles.length - addedCount}`);
  console.log(`Total HTML files: ${htmlFiles.length}`);
}

main().catch(console.error);
