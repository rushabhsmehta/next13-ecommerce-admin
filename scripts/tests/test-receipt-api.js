// Test script to verify receipt API with detailed logging
const fetch = require('node-fetch');

async function testReceiptAPI() {
  const testData = {
    customerId: "123e4567-e89b-12d3-a456-426614174000", // UUID format
    receiptType: "customer_payment",
    receiptDate: new Date().toISOString(),
    amount: 1000,
    method: "cash",
    transactionId: "TXN001",
    note: "Test receipt",
    bankAccountId: null,
    cashAccountId: "456e7890-e89b-12d3-a456-426614174001", // UUID format
    images: [],
    tourPackageQueryId: null,
    tdsMasterId: null,
    tdsOverrideRate: null,
    linkTdsTransactionId: null
  };

  console.log('Testing Receipt API with data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    if (!response.ok) {
      console.log('API Error - Status:', response.status);
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Could not parse error response as JSON');
      }
    } else {
      console.log('Success!');
      try {
        const data = JSON.parse(responseText);
        console.log('Response data:', JSON.stringify(data, null, 2));
      } catch {
        console.log('Could not parse success response as JSON');
      }
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

testReceiptAPI();
