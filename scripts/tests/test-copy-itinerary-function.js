#!/usr/bin/env node

/**
 * Test script to verify the copyDayToClipboard function logic
 * Tests the text formatting that would be copied to clipboard
 */

// Mock function to strip HTML tags
const stripHtml = (html) => {
  // Simplified version for Node.js (in browser uses DOM)
  return html.replace(/<[^>]*>/g, '').trim();
};

// Mock function to build copy text (same logic as in the component)
const buildCopyText = (itinerary) => {
  const dayTitle = stripHtml(itinerary.itineraryTitle || '');
  const dayDescription = stripHtml(itinerary.itineraryDescription || '');
  
  let textToCopy = `Day Title: ${dayTitle}\n\n`;
  textToCopy += `Day Description: ${dayDescription}\n\n`;
  
  // Add activities
  if (itinerary.activities && itinerary.activities.length > 0) {
    textToCopy += 'Activities:\n';
    itinerary.activities.forEach((activity, index) => {
      const activityTitle = stripHtml(activity.activityTitle || '');
      const activityDescription = stripHtml(activity.activityDescription || '');
      textToCopy += `\nActivity ${index + 1}:\n`;
      textToCopy += `  Title: ${activityTitle}\n`;
      textToCopy += `  Description: ${activityDescription}\n`;
    });
  }
  
  return textToCopy;
};

// Test data
const testItinerary = {
  itineraryTitle: '<h2>Day 1: Arrival in Paris</h2>',
  itineraryDescription: '<p>Welcome to Paris! Transfer to hotel and enjoy the evening at leisure.</p>',
  activities: [
    {
      activityTitle: '<h3>Eiffel Tower Visit</h3>',
      activityDescription: '<p>Visit the iconic <strong>Eiffel Tower</strong> and enjoy panoramic views of Paris.</p>'
    },
    {
      activityTitle: '<h3>Seine River Cruise</h3>',
      activityDescription: '<p>Enjoy a relaxing <em>cruise</em> along the Seine River.</p>'
    }
  ]
};

const testItineraryNoActivities = {
  itineraryTitle: '<h2>Day 2: Free Day</h2>',
  itineraryDescription: '<p>Explore Paris at your own pace.</p>',
  activities: []
};

// Run tests
console.log('🧪 Testing copyDayToClipboard text generation\n');

console.log('Test 1: Itinerary with activities');
console.log('=' .repeat(50));
const result1 = buildCopyText(testItinerary);
console.log(result1);
console.log('=' .repeat(50));

// Verify HTML tags are stripped
if (result1.includes('<') || result1.includes('>')) {
  console.error('❌ FAILED: HTML tags not properly stripped');
  process.exit(1);
}

// Verify structure
if (!result1.includes('Day Title:') || !result1.includes('Day Description:') || !result1.includes('Activities:')) {
  console.error('❌ FAILED: Missing expected sections');
  process.exit(1);
}

if (!result1.includes('Activity 1:') || !result1.includes('Activity 2:')) {
  console.error('❌ FAILED: Activities not properly formatted');
  process.exit(1);
}

console.log('✅ Test 1 passed\n');

console.log('Test 2: Itinerary without activities');
console.log('=' .repeat(50));
const result2 = buildCopyText(testItineraryNoActivities);
console.log(result2);
console.log('=' .repeat(50));

// Verify no activities section when empty
if (result2.includes('Activities:')) {
  console.error('❌ FAILED: Activities section should not appear when empty');
  process.exit(1);
}

console.log('✅ Test 2 passed\n');

console.log('🎉 All tests passed!');
process.exit(0);
