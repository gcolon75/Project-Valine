#!/usr/bin/env node

/**
 * Performance Audit Script
 * 
 * Analyzes build output and provides performance recommendations
 * Run after: npm run build
 */

const fs = require('fs');
const path = require('path');

// Performance budgets (in KB)
const BUDGETS = {
  totalJS: 300,        // Total JS bundle size
  totalCSS: 60,        // Total CSS size
  largestJS: 250,      // Largest single JS file
  largestCSS: 50,      // Largest single CSS file
  imageMax: 500,       // Max single image size
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bold');
  console.log('='.repeat(60) + '\n');
}

function getFileSizeInKB(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size / 1024;
}

function scanDirectory(dir, extensions = []) {
  const files = [];
  
  function scan(directory) {
    const items = fs.readdirSync(directory);
    
    items.forEach(item => {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scan(fullPath);
      } else if (extensions.length === 0 || extensions.some(ext => item.endsWith(ext))) {
        files.push({
          path: fullPath,
          name: item,
          size: getFileSizeInKB(fullPath),
        });
      }
    });
  }
  
  scan(dir);
  return files;
}

function analyzeAssets() {
  const distDir = path.join(process.cwd(), 'dist');
  
  if (!fs.existsSync(distDir)) {
    log('❌ Build directory not found. Run "npm run build" first.', 'red');
    process.exit(1);
  }

  logHeader('📊 Performance Audit Report');

  // Analyze JavaScript files
  const jsFiles = scanDirectory(path.join(distDir, 'assets'), ['.js']);
  const totalJS = jsFiles.reduce((sum, file) => sum + file.size, 0);
  const largestJS = jsFiles.reduce((max, file) => file.size > max.size ? file : max, jsFiles[0] || { size: 0, name: 'none' });

  log('JavaScript Analysis:', 'cyan');
  log(`  Total JS Size: ${totalJS.toFixed(2)} KB`, totalJS > BUDGETS.totalJS ? 'yellow' : 'green');
  log(`  Largest JS File: ${largestJS.name} (${largestJS.size.toFixed(2)} KB)`, largestJS.size > BUDGETS.largestJS ? 'yellow' : 'green');
  log(`  Number of JS Files: ${jsFiles.length}`);
  
  if (totalJS > BUDGETS.totalJS) {
    log(`  ⚠️  Exceeds budget by ${(totalJS - BUDGETS.totalJS).toFixed(2)} KB`, 'yellow');
  } else {
    log(`  ✓ Within budget (${BUDGETS.totalJS} KB)`, 'green');
  }

  // Analyze CSS files
  const cssFiles = scanDirectory(path.join(distDir, 'assets'), ['.css']);
  const totalCSS = cssFiles.reduce((sum, file) => sum + file.size, 0);
  const largestCSS = cssFiles.reduce((max, file) => file.size > max.size ? file : max, cssFiles[0] || { size: 0, name: 'none' });

  console.log();
  log('CSS Analysis:', 'cyan');
  log(`  Total CSS Size: ${totalCSS.toFixed(2)} KB`, totalCSS > BUDGETS.totalCSS ? 'yellow' : 'green');
  log(`  Largest CSS File: ${largestCSS.name} (${largestCSS.size.toFixed(2)} KB)`, largestCSS.size > BUDGETS.largestCSS ? 'yellow' : 'green');
  log(`  Number of CSS Files: ${cssFiles.length}`);
  
  if (totalCSS > BUDGETS.totalCSS) {
    log(`  ⚠️  Exceeds budget by ${(totalCSS - BUDGETS.totalCSS).toFixed(2)} KB`, 'yellow');
  } else {
    log(`  ✓ Within budget (${BUDGETS.totalCSS} KB)`, 'green');
  }

  // Check for large images
  const imageFiles = scanDirectory(distDir, ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
  const largeImages = imageFiles.filter(file => file.size > BUDGETS.imageMax);

  console.log();
  log('Image Analysis:', 'cyan');
  log(`  Total Images: ${imageFiles.length}`);
  
  if (largeImages.length > 0) {
    log(`  ⚠️  ${largeImages.length} images exceed ${BUDGETS.imageMax} KB:`, 'yellow');
    largeImages.forEach(img => {
      log(`    - ${img.name} (${img.size.toFixed(2)} KB)`, 'yellow');
    });
  } else {
    log(`  ✓ All images within budget`, 'green');
  }

  // Overall summary
  console.log();
  logHeader('📈 Performance Summary');

  const issues = [];
  const warnings = [];

  if (totalJS > BUDGETS.totalJS) {
    warnings.push(`Total JS size exceeds budget: ${totalJS.toFixed(2)} KB / ${BUDGETS.totalJS} KB`);
  }
  
  if (totalCSS > BUDGETS.totalCSS) {
    warnings.push(`Total CSS size exceeds budget: ${totalCSS.toFixed(2)} KB / ${BUDGETS.totalCSS} KB`);
  }

  if (largestJS.size > BUDGETS.largestJS) {
    warnings.push(`Largest JS file exceeds budget: ${largestJS.size.toFixed(2)} KB / ${BUDGETS.largestJS} KB`);
  }

  if (largeImages.length > 0) {
    warnings.push(`${largeImages.length} images exceed size limit`);
  }

  if (warnings.length === 0) {
    log('✅ All performance budgets met!', 'green');
  } else {
    log(`⚠️  ${warnings.length} performance warnings:`, 'yellow');
    warnings.forEach((warning, i) => {
      log(`  ${i + 1}. ${warning}`, 'yellow');
    });
  }

  // Recommendations
  console.log();
  logHeader('💡 Recommendations');

  const recommendations = [];

  if (totalJS > BUDGETS.totalJS) {
    recommendations.push('Consider code splitting large routes');
    recommendations.push('Remove unused dependencies');
    recommendations.push('Enable tree shaking and minification');
  }

  if (totalCSS > BUDGETS.totalCSS) {
    recommendations.push('Purge unused CSS with PurgeCSS/TailwindCSS');
    recommendations.push('Consider critical CSS inlining');
  }

  if (largeImages.length > 0) {
    recommendations.push('Optimize images with tools like ImageOptim or Squoosh');
    recommendations.push('Consider using WebP format for better compression');
    recommendations.push('Implement lazy loading for below-fold images');
  }

  if (jsFiles.length > 20) {
    recommendations.push('Consider bundling smaller chunks together');
  }

  if (recommendations.length === 0) {
    log('✓ No optimization recommendations at this time', 'green');
  } else {
    recommendations.forEach((rec, i) => {
      log(`  ${i + 1}. ${rec}`, 'blue');
    });
  }

  console.log();
  
  // Exit with error if critical issues
  if (issues.length > 0) {
    process.exit(1);
  }
}

// Run the audit
try {
  analyzeAssets();
} catch (error) {
  log(`❌ Error running performance audit: ${error.message}`, 'red');
  process.exit(1);
}
