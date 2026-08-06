/**
 * Automated SEO Validation Script for TheGreeter.in
 * Validates metadata, canonical tags, hreflang attributes, image alt tags,
 * and JSON-LD structured data across all static HTML pages.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function getHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Exclude admin, generated, and template component snippets from indexing checks
      if (file !== 'admin' && file !== 'generated' && file !== 'templates') {
        getHtmlFiles(filePath, fileList);
      }
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

function validateSeo() {
  console.log('====================================================');
  console.log('🔍 Starting Automated SEO Validation Report');
  console.log('====================================================\n');

  const files = getHtmlFiles(PUBLIC_DIR);
  let totalErrors = 0;
  let totalWarnings = 0;

  files.forEach((file) => {
    const relPath = path.relative(PUBLIC_DIR, file);
    const content = fs.readFileSync(file, 'utf8');
    const errors = [];
    const warnings = [];

    // 1. Title Tag Check
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (!titleMatch || !titleMatch[1].trim()) {
      errors.push('Missing <title> tag');
    } else {
      const titleLen = titleMatch[1].trim().length;
      if (titleLen > 70) {
        warnings.push(`Title exceeds 70 chars (${titleLen} chars): "${titleMatch[1].trim()}"`);
      }
    }

    // 2. Meta Description Check
    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    if (!descMatch || !descMatch[1].trim()) {
      errors.push('Missing meta description');
    } else {
      const descLen = descMatch[1].trim().length;
      if (descLen < 50 || descLen > 160) {
        warnings.push(`Meta description length outside 50-160 chars (${descLen} chars)`);
      }
    }

    // 3. Canonical Link Check
    const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i);
    if (!canonicalMatch) {
      errors.push('Missing canonical tag');
    } else if (!canonicalMatch[1].startsWith('https://thegreeter.in')) {
      warnings.push(`Canonical URL does not use absolute domain https://thegreeter.in: "${canonicalMatch[1]}"`);
    }

    // 4. Hreflang Tags Check
    const hreflangMatches = content.match(/hreflang=["'](.*?)["']/gi);
    if (!hreflangMatches || hreflangMatches.length === 0) {
      warnings.push('No hreflang annotations found on this page');
    }

    // 5. Image Alt Tag Check
    const imgMatches = content.match(/<img\s+[^>]*>/gi) || [];
    imgMatches.forEach((img) => {
      if (!/alt=["'].*?["']/i.test(img)) {
        warnings.push(`Image missing alt attribute: ${img.substring(0, 60)}...`);
      }
    });

    // 6. JSON-LD Schema Syntax Check
    const jsonLdMatches = content.match(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi) || [];
    jsonLdMatches.forEach((ldScript) => {
      const jsonStr = ldScript.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
      try {
        JSON.parse(jsonStr);
      } catch (err) {
        errors.push(`Invalid JSON-LD syntax: ${err.message}`);
      }
    });

    // Output per file
    if (errors.length > 0 || warnings.length > 0) {
      console.log(`📄 Page: ${relPath}`);
      errors.forEach((err) => console.log(`   ❌ ERROR: ${err}`));
      warnings.forEach((warn) => console.log(`   ⚠️ WARNING: ${warn}`));
      console.log('');
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  });

  console.log('====================================================');
  console.log(`Validation Complete: ${files.length} public pages checked.`);
  console.log(`Summary: ${totalErrors} Errors, ${totalWarnings} Warnings.`);
  console.log('====================================================\n');
}

validateSeo();
