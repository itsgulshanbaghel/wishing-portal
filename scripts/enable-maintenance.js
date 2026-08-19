const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../public/index.html');
const backupPath = path.join(__dirname, '../public/index.original.html');
const maintenancePath = path.join(__dirname, '../public/maintenance.html');

try {
  // Ensure maintenance.html exists
  if (!fs.existsSync(maintenancePath)) {
    console.error('Error: public/maintenance.html does not exist.');
    process.exit(1);
  }

  // Backup original index.html if backup doesn't exist yet
  if (fs.existsSync(indexPath) && !fs.existsSync(backupPath)) {
    fs.copyFileSync(indexPath, backupPath);
    console.log('✓ Created backup of original index.html at public/index.original.html');
  }

  // Copy maintenance.html to index.html
  fs.copyFileSync(maintenancePath, indexPath);
  console.log('✓ Successfully deployed Maintenance page to public/index.html!');
  console.log('  All visitors to the homepage will now see: "We are under maintenance and get back soon"');
} catch (err) {
  console.error('Failed to enable maintenance mode:', err);
  process.exit(1);
}
