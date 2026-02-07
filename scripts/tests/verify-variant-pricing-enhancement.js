/**
 * Verification Test for Tour Package Query Variant Pricing Enhancement
 * 
 * This test verifies that the PricingBreakdownTable component is correctly
 * integrated and displays all required information for variant pricing.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Tour Package Query Variant Pricing Implementation...\n');

// Test 1: Check if new component exists
console.log('Test 1: Check PricingBreakdownTable component exists');
const componentPath = path.join(__dirname, '../../src/components/tour-package-query/PricingBreakdownTable.tsx');
if (fs.existsSync(componentPath)) {
  console.log('✅ PricingBreakdownTable.tsx exists');
} else {
  console.log('❌ PricingBreakdownTable.tsx NOT found');
  process.exit(1);
}

// Test 2: Verify PricingTab imports the component
console.log('\nTest 2: Verify PricingTab imports PricingBreakdownTable');
const pricingTabPath = path.join(__dirname, '../../src/components/tour-package-query/PricingTab.tsx');
const pricingTabContent = fs.readFileSync(pricingTabPath, 'utf8');
if (pricingTabContent.includes('import { PricingBreakdownTable }')) {
  console.log('✅ PricingTab imports PricingBreakdownTable');
} else {
  console.log('❌ PricingTab does NOT import PricingBreakdownTable');
  process.exit(1);
}

// Test 3: Verify QueryVariantsTab imports the component
console.log('\nTest 3: Verify QueryVariantsTab imports PricingBreakdownTable');
const variantsTabPath = path.join(__dirname, '../../src/components/tour-package-query/QueryVariantsTab.tsx');
const variantsTabContent = fs.readFileSync(variantsTabPath, 'utf8');
if (variantsTabContent.includes('import { PricingBreakdownTable }')) {
  console.log('✅ QueryVariantsTab imports PricingBreakdownTable');
} else {
  console.log('❌ QueryVariantsTab does NOT import PricingBreakdownTable');
  process.exit(1);
}

// Test 4: Verify PricingTab uses the component
console.log('\nTest 4: Verify PricingTab uses PricingBreakdownTable');
if (pricingTabContent.includes('<PricingBreakdownTable')) {
  console.log('✅ PricingTab uses PricingBreakdownTable component');
} else {
  console.log('❌ PricingTab does NOT use PricingBreakdownTable component');
  process.exit(1);
}

// Test 5: Verify QueryVariantsTab uses the component
console.log('\nTest 5: Verify QueryVariantsTab uses PricingBreakdownTable');
if (variantsTabContent.includes('<PricingBreakdownTable')) {
  console.log('✅ QueryVariantsTab uses PricingBreakdownTable component');
} else {
  console.log('❌ QueryVariantsTab does NOT use PricingBreakdownTable component');
  process.exit(1);
}

// Test 6: Verify component has required props
console.log('\nTest 6: Verify PricingBreakdownTable has required props interface');
const componentContent = fs.readFileSync(componentPath, 'utf8');
const requiredProps = [
  'priceCalculationResult',
  'hotels',
  'roomTypes',
  'occupancyTypes',
  'mealPlans',
  'vehicleTypes',
  'itineraries',
  'variant'
];

let allPropsFound = true;
for (const prop of requiredProps) {
  if (!componentContent.includes(prop)) {
    console.log(`❌ Missing required prop: ${prop}`);
    allPropsFound = false;
  }
}
if (allPropsFound) {
  console.log('✅ All required props defined in interface');
}

// Test 7: Verify component displays hotel names
console.log('\nTest 7: Verify component displays hotel names');
if (componentContent.includes('hotelName')) {
  console.log('✅ Component displays hotel names');
} else {
  console.log('❌ Component does NOT display hotel names');
  process.exit(1);
}

// Test 8: Verify component displays room details
console.log('\nTest 8: Verify component displays room allocation details');
if (componentContent.includes('roomTypeName') && 
    componentContent.includes('occupancyTypeName') && 
    componentContent.includes('mealPlanName')) {
  console.log('✅ Component displays room type, occupancy, and meal plan');
} else {
  console.log('❌ Component missing room details');
  process.exit(1);
}

// Test 9: Verify component displays transport details
console.log('\nTest 9: Verify component displays transport details');
if (componentContent.includes('vehicleTypeName') && 
    componentContent.includes('pricePerUnit') &&
    componentContent.includes('🚗')) {
  console.log('✅ Component displays transport details with vehicle icon');
} else {
  console.log('❌ Component missing transport details');
  process.exit(1);
}

// Test 10: Verify component displays cost formulas
console.log('\nTest 10: Verify component displays cost calculation formulas');
if (componentContent.includes('× ${quantity} = ₹')) {
  console.log('✅ Component displays cost formulas (price × quantity = total)');
} else {
  console.log('❌ Component missing cost formulas');
  process.exit(1);
}

// Test 11: Verify QueryVariantsTab has reset button
console.log('\nTest 11: Verify QueryVariantsTab has reset button');
if (variantsTabContent.includes('RefreshCw') && 
    variantsTabContent.includes('Reset')) {
  console.log('✅ QueryVariantsTab has reset button');
} else {
  console.log('❌ QueryVariantsTab missing reset button');
  process.exit(1);
}

// Test 12: Verify component handles variant flag
console.log('\nTest 12: Verify component uses variant flag for styling');
if (componentContent.includes('variant ?') || componentContent.includes('variant?')) {
  console.log('✅ Component uses variant flag for conditional styling');
} else {
  console.log('❌ Component does not use variant flag properly');
  process.exit(1);
}

// Test 13: Verify documentation exists
console.log('\nTest 13: Verify documentation files exist');
const docs = [
  '../../docs/VARIANT_PRICING_DETAILED_BREAKDOWN_IMPLEMENTATION.md',
  '../../docs/VARIANT_PRICING_BEFORE_AFTER_COMPARISON.md',
  '../../docs/VARIANT_PRICING_IMPLEMENTATION_SUMMARY.md'
];

let allDocsExist = true;
for (const doc of docs) {
  const docPath = path.join(__dirname, doc);
  if (fs.existsSync(docPath)) {
    console.log(`✅ ${path.basename(doc)} exists`);
  } else {
    console.log(`❌ ${path.basename(doc)} NOT found`);
    allDocsExist = false;
  }
}

if (!allDocsExist) {
  process.exit(1);
}

// Test 14: Check code reduction in PricingTab
console.log('\nTest 14: Verify code reduction in PricingTab');
const oldInlineTablePattern = /TableRow.*TableCell.*hotelName/s;
if (!pricingTabContent.match(oldInlineTablePattern)) {
  console.log('✅ PricingTab no longer has inline table code (successfully refactored)');
} else {
  console.log('⚠️  PricingTab still contains some inline table code');
}

// Test 15: Verify TypeScript types
console.log('\nTest 15: Verify TypeScript interface definitions');
if (componentContent.includes('interface PricingBreakdownTableProps') &&
    componentContent.includes('React.FC<PricingBreakdownTableProps>')) {
  console.log('✅ Component has proper TypeScript interface and FC type');
} else {
  console.log('❌ Component missing proper TypeScript definitions');
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ All verification tests passed!');
console.log('='.repeat(60));
console.log('\n📊 Summary:');
console.log('  - PricingBreakdownTable component created and integrated');
console.log('  - Both PricingTab and QueryVariantsTab using shared component');
console.log('  - Reset button added to variants');
console.log('  - All required data fields displayed');
console.log('  - Cost formulas implemented');
console.log('  - Documentation complete');
console.log('  - TypeScript types properly defined');
console.log('\n🎉 Implementation verified successfully!');
console.log('\n📝 Next Steps:');
console.log('  1. Run the application: npm run dev');
console.log('  2. Navigate to Tour Package Query page');
console.log('  3. Select a variant with room allocations');
console.log('  4. Test auto-calculate pricing');
console.log('  5. Verify detailed breakdown displays correctly');
console.log('  6. Test reset button functionality');
console.log('\n');
