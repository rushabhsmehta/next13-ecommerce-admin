/**
 * Test Campaign API
 * 
 * Usage:
 *   node scripts/whatsapp/test-campaign-api.js
 */

const BASE_URL = 'http://localhost:3000';

async function testCampaignAPI() {
  console.log('🧪 Testing WhatsApp Campaign API\n');

  try {
    // Test 1: Create Campaign
    console.log('1️⃣  Creating campaign...');
    const createResponse = await fetch(`${BASE_URL}/api/whatsapp/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Campaign - Bali Promotion',
        description: 'Testing campaign system',
        templateName: 'tour_package_marketing',
        templateLanguage: 'en_US',
        templateVariables: {
          destination: 'Bali',
          price: '₹45,000'
        },
        targetType: 'manual',
        recipients: [
          {
            phoneNumber: '+919978783238',
            name: 'Test User',
            variables: {
              name: 'Test User',
              destination: 'Bali Premium Package',
              price: '₹45,000'
            }
          }
        ],
        rateLimit: 10
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error('❌ Failed to create campaign:', error);
      return;
    }

    const createData = await createResponse.json();
    console.log('✅ Campaign created:', {
      id: createData.campaign.id,
      name: createData.campaign.name,
      status: createData.campaign.status,
      totalRecipients: createData.campaign.totalRecipients
    });

    const campaignId = createData.campaign.id;

    // Test 2: Get Campaign Details
    console.log('\n2️⃣  Fetching campaign details...');
    const getResponse = await fetch(`${BASE_URL}/api/whatsapp/campaigns/${campaignId}`);
    
    if (!getResponse.ok) {
      const error = await getResponse.json();
      console.error('❌ Failed to fetch campaign:', error);
      return;
    }

    const getData = await getResponse.json();
    console.log('✅ Campaign details:', {
      id: getData.campaign.id,
      name: getData.campaign.name,
      status: getData.campaign.status,
      recipientsCount: getData.campaign.recipients.length
    });

    // Test 3: List All Campaigns
    console.log('\n3️⃣  Listing all campaigns...');
    const listResponse = await fetch(`${BASE_URL}/api/whatsapp/campaigns?limit=5`);
    
    if (!listResponse.ok) {
      const error = await listResponse.json();
      console.error('❌ Failed to list campaigns:', error);
      return;
    }

    const listData = await listResponse.json();
    console.log('✅ Campaigns list:', {
      total: listData.pagination.total,
      campaigns: listData.campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status
      }))
    });

    // Test 4: Add More Recipients
    console.log('\n4️⃣  Adding more recipients...');
    const addRecipientsResponse = await fetch(
      `${BASE_URL}/api/whatsapp/campaigns/${campaignId}/recipients`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipients: [
            {
              phoneNumber: '+911234567890',
              name: 'Test User 2',
              variables: {
                name: 'Test User 2',
                destination: 'Bali Standard Package',
                price: '₹35,000'
              }
            }
          ]
        })
      }
    );

    if (!addRecipientsResponse.ok) {
      const error = await addRecipientsResponse.json();
      console.error('❌ Failed to add recipients:', error);
      return;
    }

    const addRecipientsData = await addRecipientsResponse.json();
    console.log('✅ Recipients added:', addRecipientsData);

    // Test 5: Get Recipients List
    console.log('\n5️⃣  Fetching recipients list...');
    const recipientsResponse = await fetch(
      `${BASE_URL}/api/whatsapp/campaigns/${campaignId}/recipients`
    );
    
    if (!recipientsResponse.ok) {
      const error = await recipientsResponse.json();
      console.error('❌ Failed to fetch recipients:', error);
      return;
    }

    const recipientsData = await recipientsResponse.json();
    console.log('✅ Recipients list:', {
      total: recipientsData.pagination.total,
      recipients: recipientsData.recipients.map((r: any) => ({
        phoneNumber: r.phoneNumber,
        status: r.status
      }))
    });

    // Test 6: Get Campaign Stats
    console.log('\n6️⃣  Fetching campaign stats...');
    const statsResponse = await fetch(
      `${BASE_URL}/api/whatsapp/campaigns/${campaignId}/stats`
    );
    
    if (!statsResponse.ok) {
      const error = await statsResponse.json();
      console.error('❌ Failed to fetch stats:', error);
      return;
    }

    const statsData = await statsResponse.json();
    console.log('✅ Campaign stats:', {
      total: statsData.stats.total,
      pending: statsData.stats.pending,
      sent: statsData.stats.sent,
      failed: statsData.stats.failed,
      metrics: statsData.metrics
    });

    // Test 7: Send Campaign (commented out for safety)
    console.log('\n7️⃣  Send campaign (skipped - uncomment to test)');
    console.log('   To send campaign, uncomment the code below');
    
    /*
    console.log('\n7️⃣  Sending campaign...');
    const sendResponse = await fetch(
      `${BASE_URL}/api/whatsapp/campaigns/${campaignId}/send`,
      { method: 'POST' }
    );
    
    if (!sendResponse.ok) {
      const error = await sendResponse.json();
      console.error('❌ Failed to send campaign:', error);
      return;
    }

    const sendData = await sendResponse.json();
    console.log('✅ Campaign sending started:', sendData);
    */

    console.log('\n✅ All tests completed successfully!');
    console.log(`\n📝 Campaign ID for reference: ${campaignId}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testCampaignAPI();
