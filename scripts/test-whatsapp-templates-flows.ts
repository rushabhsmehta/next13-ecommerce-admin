/**
 * Quick Test Script for WhatsApp Templates & Flows
 * 
 * Run this to test the new implementation:
 * npx tsx scripts/test-whatsapp-templates-flows.ts
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testTemplateManagement() {
  console.log('\n📋 Testing Template Management...\n');

  try {
    // 1. List all templates
    console.log('1. Listing all approved templates...');
    const listResponse = await fetch(`${BASE_URL}/api/whatsapp/templates/manage?action=approved`);
    const listData = await listResponse.json();
    console.log(`   ✅ Found ${listData.count} approved templates`);

    // 2. Get analytics
    console.log('\n2. Getting template analytics...');
    const analyticsResponse = await fetch(`${BASE_URL}/api/whatsapp/templates/manage?action=analytics`);
    const analyticsData = await analyticsResponse.json();
    console.log('   ✅ Analytics:', JSON.stringify(analyticsData.analytics, null, 2));

    // 3. Search templates
    console.log('\n3. Searching templates by name...');
    const searchResponse = await fetch(`${BASE_URL}/api/whatsapp/templates/manage?action=search&name=hello`);
    const searchData = await searchResponse.json();
    console.log(`   ✅ Found ${searchData.count} templates matching "hello"`);

    return true;
  } catch (error) {
    console.error('   ❌ Error:', error);
    return false;
  }
}

async function testTemplateCreation() {
  console.log('\n📝 Testing Template Creation...\n');

  try {
    const newTemplate = {
      name: `test_template_${Date.now()}`,
      language: 'en_US',
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: 'This is a test template created at {{1}}. Welcome {{2}}!',
          example: {
            body_text: [[new Date().toISOString(), 'John Doe']],
          },
        },
        {
          type: 'FOOTER',
          text: 'This is an automated test',
        },
      ],
    };

    console.log('Creating template:', newTemplate.name);
    const response = await fetch(`${BASE_URL}/api/whatsapp/templates/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTemplate),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('   ✅ Template created successfully!');
      console.log('   Template ID:', data.data.id);
      console.log('   Status:', data.data.status);
      return data.data.id;
    } else {
      console.log('   ⚠️  Template creation response:', data);
      return null;
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
    return null;
  }
}

async function testTemplatePreview() {
  console.log('\n👁️  Testing Template Preview...\n');

  try {
    // Find a template to preview
    const listResponse = await fetch(`${BASE_URL}/api/whatsapp/templates/manage?action=approved`);
    const listData = await listResponse.json();

    if (listData.data.length === 0) {
      console.log('   ⚠️  No templates available to preview');
      return false;
    }

    const template = listData.data[0];
    console.log(`Previewing template: ${template.name}`);

    const previewResponse = await fetch(`${BASE_URL}/api/whatsapp/templates/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateName: template.name,
        parameters: {
          body: ['John Doe', '12345', '99.99'],
        },
      }),
    });

    const previewData = await previewResponse.json();
    
    if (previewData.success) {
      console.log('   ✅ Preview generated:');
      console.log('\n---BEGIN PREVIEW---');
      console.log(previewData.preview);
      console.log('---END PREVIEW---\n');
      return true;
    } else {
      console.log('   ⚠️  Preview response:', previewData);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
    return false;
  }
}

async function testFlowTemplates() {
  console.log('\n🌊 Testing Flow Templates...\n');

  try {
    const flowConfig = {
      type: 'survey',
      options: {
        flowName: `test_survey_${Date.now()}`,
        questions: [
          {
            id: 'satisfaction',
            question: 'How satisfied are you?',
            type: 'rating',
            required: true,
          },
          {
            id: 'recommend',
            question: 'Would you recommend us?',
            type: 'yes_no',
            required: true,
          },
        ],
      },
      autoPublish: false,
    };

    console.log('Creating survey flow:', flowConfig.options.flowName);
    const response = await fetch(`${BASE_URL}/api/whatsapp/flows/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flowConfig),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log('   ✅ Flow created successfully!');
      console.log('   Flow ID:', data.data.flow_id);
      console.log('   Flow Name:', data.data.flow_name);
      console.log('   Status:', data.data.status);
      return data.data.flow_id;
    } else {
      console.log('   ⚠️  Flow creation response:', data);
      return null;
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
    return null;
  }
}

async function testFlowManagement() {
  console.log('\n🔧 Testing Flow Management...\n');

  try {
    console.log('Listing all flows...');
    const response = await fetch(`${BASE_URL}/api/whatsapp/flows/manage?action=list`);
    const data = await response.json();

    if (data.success) {
      console.log(`   ✅ Found ${data.count} flows`);
      data.data.forEach((flow: any) => {
        console.log(`   - ${flow.name} (${flow.status}) - ${flow.id}`);
      });
      return true;
    } else {
      console.log('   ⚠️  Response:', data);
      return false;
    }
  } catch (error) {
    console.error('   ❌ Error:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 WhatsApp Templates & Flows - Test Suite');
  console.log('==========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('==========================================');

  const results = {
    templateManagement: await testTemplateManagement(),
    templatePreview: await testTemplatePreview(),
    flowManagement: await testFlowManagement(),
    
    // These create real resources, uncomment to test
    // templateCreation: await testTemplateCreation(),
    // flowTemplates: await testFlowTemplates(),
  };

  console.log('\n📊 Test Results');
  console.log('==========================================');
  console.log('Template Management:', results.templateManagement ? '✅' : '❌');
  console.log('Template Preview:', results.templatePreview ? '✅' : '❌');
  console.log('Flow Management:', results.flowManagement ? '✅' : '❌');
  // console.log('Template Creation:', results.templateCreation ? '✅' : '❌');
  // console.log('Flow Templates:', results.flowTemplates ? '✅' : '❌');

  const allPassed = Object.values(results).every(r => r);
  
  console.log('\n==========================================');
  console.log(allPassed ? '✅ All tests passed!' : '⚠️  Some tests failed');
  console.log('==========================================\n');

  return allPassed;
}

// Run tests
runAllTests().catch(console.error);
