const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'public', 'assets');

// Large images to optimize
const imagesToOptimize = [
  'devi.png',
  'devi_en.png', 
  'ganga_aarti.png',
  'F1.png',
  'F2.png',
  'og-cover.png',
  'ganga_dussehra_main.png',
  'ganga_spiritual.png',
  'CLOGO.jpg',
  'Dark_logo.png',
  'Light_logo.png'
];

async function optimizeImage(imageName) {
  const inputPath = path.join(assetsDir, imageName);
  const outputPath = path.join(assetsDir, imageName.replace(/\.(png|jpg|jpeg)$/i, '.webp'));
  
  try {
    // Get original size
    const originalStats = fs.statSync(inputPath);
    const originalSize = (originalStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`Processing ${imageName} (${originalSize}MB)...`);
    
    // Optimize and convert to WebP
    await sharp(inputPath)
      .webp({ 
        quality: 80,
        effort: 6
      })
      .toFile(outputPath);
    
    // Get new size
    const newStats = fs.statSync(outputPath);
    const newSize = (newStats.size / 1024 / 1024).toFixed(2);
    const savings = ((1 - newStats.size / originalStats.size) * 100).toFixed(1);
    
    console.log(`✓ ${imageName}: ${originalSize}MB → ${newSize}MB (${savings}% reduction)`);
    
    return { success: true, originalSize, newSize, savings };
  } catch (error) {
    console.error(`✗ Error processing ${imageName}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Starting image optimization...\n');
  
  const results = [];
  
  for (const imageName of imagesToOptimize) {
    const inputPath = path.join(assetsDir, imageName);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`⊘ ${imageName} not found, skipping...`);
      continue;
    }
    
    const result = await optimizeImage(imageName);
    results.push({ imageName, ...result });
  }
  
  console.log('\n=== Summary ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Successfully optimized: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const totalSavings = successful.reduce((sum, r) => sum + parseFloat(r.savings), 0);
    console.log(`Average savings: ${(totalSavings / successful.length).toFixed(1)}%`);
  }
  
  if (failed.length > 0) {
    console.log('\nFailed images:');
    failed.forEach(f => console.log(`  - ${f.imageName}: ${f.error}`));
  }
}

main().catch(console.error);
