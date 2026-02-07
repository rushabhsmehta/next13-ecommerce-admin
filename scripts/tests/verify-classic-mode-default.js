#!/usr/bin/env node

/**
 * Verification script for Classic Mode default setting
 * 
 * This script checks that both Tour Package and Tour Package Query
 * components default to 'classic' mode.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Classic Mode Default Settings...\n');

const checks = [
  {
    name: 'Tour Package Form',
    file: 'src/app/(dashboard)/tourPackages/[tourPackageId]/components/tourPackage-form.tsx',
    expectedPattern: /useState<'classic'\s*\|\s*'wysiwyg'>\('classic'\)/,
  },
  {
    name: 'Tour Package Query Form Wrapper',
    file: 'src/app/(dashboard)/(routes)/tourpackagequeryfrominquiry/[inquiryId]/components/tourpackagequery-form-wrapper.tsx',
    expectedPattern: /useState<'classic'\s*\|\s*'wysiwyg'>\('classic'\)/,
  }
];

let allPassed = true;

checks.forEach(check => {
  const filePath = path.join(__dirname, '..', '..', check.file);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    if (check.expectedPattern.test(content)) {
      console.log(`✅ ${check.name}: Default mode is 'classic'`);
    } else {
      console.log(`❌ ${check.name}: Default mode is NOT 'classic'`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${check.name}: Error reading file - ${error.message}`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('✅ All checks passed! Both components default to Classic Mode.');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please review the files.');
  process.exit(1);
}
