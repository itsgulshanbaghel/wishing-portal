const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
const backupPath = path.join(__dirname, '../public/index.original.html');

try {
  if (!fs.existsSync(backupPath)) {
    console.error('Error: Backup public/index.original.html not found. Cannot restore index.html automatically.');
    process.exit(1);
  }

  // Restore original index.html
  fs.copyFileSync(backupPath, indexPath);
  console.log('✓ Restored original index.html from public/index.original.html');
  console.log('✓ Frontend is live and maintenance mode is disabled!');
} catch (err) {
  console.error('Failed to disable maintenance mode:', err);
  process.exit(1);
}
