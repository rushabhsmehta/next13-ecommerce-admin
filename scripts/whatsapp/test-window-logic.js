/**
 * Test the 24-hour window logic locally
 * This simulates checking if a customer is within the messaging window
 */

// Simulate database query results
const testCases = [
  {
    name: "Customer messaged 2 hours ago",
    lastInboundMessage: {
      id: "test-1",
      message: "Hello, interested in tour packages",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      direction: "inbound",
      from: "whatsapp:919978783238"
    },
    expectedCanMessage: true,
    expectedHoursRemaining: 22
  },
  {
    name: "Customer messaged 23 hours ago",
    lastInboundMessage: {
      id: "test-2",
      message: "Looking for Bali packages",
      createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
      direction: "inbound",
      from: "whatsapp:919978783238"
    },
    expectedCanMessage: true,
    expectedHoursRemaining: 1
  },
  {
    name: "Customer messaged 25 hours ago",
    lastInboundMessage: {
      id: "test-3",
      message: "Price inquiry",
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      direction: "inbound",
      from: "whatsapp:919978783238"
    },
    expectedCanMessage: false,
    expectedHoursRemaining: 0
  },
  {
    name: "No messages from customer",
    lastInboundMessage: null,
    expectedCanMessage: false,
    expectedHoursRemaining: undefined
  }
];

// Replicate the logic from our API endpoint
function checkMessagingWindow(lastInboundMessage) {
  if (!lastInboundMessage) {
    return {
      canMessage: false,
    };
  }

  const now = new Date();
  const lastMessageTime = new Date(lastInboundMessage.createdAt);
  const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = 24 - hoursSinceLastMessage;

  return {
    canMessage: hoursSinceLastMessage < 24,
    lastInboundMessage,
    hoursRemaining: hoursRemaining > 0 ? hoursRemaining : 0,
  };
}

console.log('\n🧪 Testing 24-Hour Messaging Window Logic\n');
console.log('═'.repeat(60));

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(60));
  
  if (testCase.lastInboundMessage) {
    const timeSince = (Date.now() - testCase.lastInboundMessage.createdAt.getTime()) / (1000 * 60 * 60);
    console.log(`  Last message: ${timeSince.toFixed(1)} hours ago`);
    console.log(`  Message: "${testCase.lastInboundMessage.message}"`);
  } else {
    console.log('  Last message: None');
  }
  
  const result = checkMessagingWindow(testCase.lastInboundMessage);
  
  console.log(`\n  Result:`);
  console.log(`    Can Message: ${result.canMessage ? '✅ YES' : '❌ NO'}`);
  if (result.hoursRemaining !== undefined) {
    console.log(`    Hours Remaining: ${result.hoursRemaining.toFixed(1)}`);
  }
  
  // Validate results
  const canMessageCorrect = result.canMessage === testCase.expectedCanMessage;
  const hoursCorrect = testCase.expectedHoursRemaining !== undefined 
    ? Math.abs((result.hoursRemaining || 0) - testCase.expectedHoursRemaining) < 0.1
    : true;
  
  if (canMessageCorrect && hoursCorrect) {
    console.log(`\n  ✅ PASS`);
    passed++;
  } else {
    console.log(`\n  ❌ FAIL`);
    console.log(`    Expected canMessage: ${testCase.expectedCanMessage}, got: ${result.canMessage}`);
    if (testCase.expectedHoursRemaining !== undefined) {
      console.log(`    Expected ~${testCase.expectedHoursRemaining}h, got: ${result.hoursRemaining?.toFixed(1)}h`);
    }
    failed++;
  }
});

console.log('\n' + '═'.repeat(60));
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
  console.log('✅ All tests passed! The 24-hour window logic is working correctly.\n');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the logic.\n');
  process.exit(1);
}
