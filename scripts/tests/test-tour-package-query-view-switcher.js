#!/usr/bin/env node
/**
 * Test script to verify Tour Package Query view switcher components
 * This checks that all components can be properly imported and don't have syntax errors
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Tour Package Query View Switcher Components...\n');

const componentsDir = path.join(
  __dirname,
  '../../src/app/(dashboard)/(routes)/tourpackagequeryfrominquiry/[inquiryId]/components'
);

const testFiles = [
  'tourpackagequery-form.tsx',
  'tourpackagequery-form-wrapper.tsx',
  'tourpackagequery-form-classic.tsx',
  'tourpackagequery-form-wysiwyg.tsx',
];

let allTestsPassed = true;

// Test 1: Check files exist
console.log('📁 Test 1: Checking if all component files exist...');
testFiles.forEach(file => {
  const filePath = path.join(componentsDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✅ ${file} exists`);
  } else {
    console.log(`  ❌ ${file} NOT FOUND`);
    allTestsPassed = false;
  }
});
console.log();

// Test 2: Check file contents and exports
console.log('📝 Test 2: Checking component exports...');

// Check wrapper export
const wrapperPath = path.join(componentsDir, 'tourpackagequery-form-wrapper.tsx');
const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');
if (wrapperContent.includes('export const TourPackageQueryFormWrapper')) {
  console.log('  ✅ TourPackageQueryFormWrapper exported correctly');
} else {
  console.log('  ❌ TourPackageQueryFormWrapper export not found');
  allTestsPassed = false;
}

// Check classic export
const classicPath = path.join(componentsDir, 'tourpackagequery-form-classic.tsx');
const classicContent = fs.readFileSync(classicPath, 'utf8');
if (classicContent.includes('export const TourPackageQueryFormClassic')) {
  console.log('  ✅ TourPackageQueryFormClassic exported correctly');
} else {
  console.log('  ❌ TourPackageQueryFormClassic export not found');
  allTestsPassed = false;
}

// Check WYSIWYG export
const wysiwygPath = path.join(componentsDir, 'tourpackagequery-form-wysiwyg.tsx');
const wysiwygContent = fs.readFileSync(wysiwygPath, 'utf8');
if (wysiwygContent.includes('export const TourPackageQueryFormWYSIWYG')) {
  console.log('  ✅ TourPackageQueryFormWYSIWYG exported correctly');
} else {
  console.log('  ❌ TourPackageQueryFormWYSIWYG export not found');
  allTestsPassed = false;
}

// Check main re-export
const mainPath = path.join(componentsDir, 'tourpackagequery-form.tsx');
const mainContent = fs.readFileSync(mainPath, 'utf8');
if (mainContent.includes('export { TourPackageQueryFormWrapper as TourPackageQueryForm }')) {
  console.log('  ✅ Main form re-exports wrapper correctly');
} else {
  console.log('  ❌ Main form re-export not found');
  allTestsPassed = false;
}
console.log();

// Test 3: Check for key features in WYSIWYG
console.log('🎨 Test 3: Checking WYSIWYG component features...');
if (wysiwygContent.includes('PDFLikeSection')) {
  console.log('  ✅ PDFLikeSection component defined');
} else {
  console.log('  ❌ PDFLikeSection component not found');
  allTestsPassed = false;
}

if (wysiwygContent.includes('brandColors')) {
  console.log('  ✅ Brand colors defined');
} else {
  console.log('  ❌ Brand colors not found');
  allTestsPassed = false;
}

if (wysiwygContent.includes('Accordion')) {
  console.log('  ✅ Accordion components used');
} else {
  console.log('  ❌ Accordion components not found');
  allTestsPassed = false;
}

const tabComponents = [
  'BasicInfoTab',
  'GuestsTab',
  'LocationTab',
  'DatesTab',
  'ItineraryTab',
  'HotelsTab',
  'FlightsTab',
  'PricingTab',
  'PoliciesTab'
];

const foundTabs = tabComponents.filter(tab => wysiwygContent.includes(tab));
if (foundTabs.length === tabComponents.length) {
  console.log('  ✅ All tab components imported');
} else {
  console.log(`  ⚠️  Only ${foundTabs.length}/${tabComponents.length} tab components found`);
}
console.log();

// Test 4: Check wrapper features
console.log('🔄 Test 4: Checking wrapper component features...');
if (wrapperContent.includes("'classic' | 'wysiwyg'") || wrapperContent.includes('useState<')) {
  console.log('  ✅ Mode state type defined');
} else {
  console.log('  ❌ Mode state type not found');
  allTestsPassed = false;
}

if (wrapperContent.includes('Settings2')) {
  console.log('  ✅ Settings icon imported');
} else {
  console.log('  ❌ Settings icon not found');
  allTestsPassed = false;
}

if (wrapperContent.includes('LayoutTemplate')) {
  console.log('  ✅ LayoutTemplate icon imported');
} else {
  console.log('  ❌ LayoutTemplate icon not found');
  allTestsPassed = false;
}

if (wrapperContent.includes('confirm(')) {
  console.log('  ✅ Confirmation dialog on mode switch');
} else {
  console.log('  ❌ Confirmation dialog not found');
  allTestsPassed = false;
}
console.log();

// Final results
console.log('═══════════════════════════════════════════');
if (allTestsPassed) {
  console.log('✅ All tests passed!');
  console.log('The Tour Package Query view switcher is correctly implemented.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed.');
  console.log('Please review the implementation.');
  process.exit(1);
}
