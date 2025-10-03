// Test script for WhatsApp Template functionality
// Run with: node test-whatsapp-templates.js

const fetch = require('node-fetch');

async function testWhatsAppTemplates() {
  console.log('🧪 Testing WhatsApp Template functionality...\n');

  const baseUrl = 'http://localhost:3000';

  // Test 1: Get all templates
  console.log('1. Fetching all templates...');
  try {
    const response = await fetch(`${baseUrl}/api/whatsapp/templates`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Found ${data.count} templates:`);
      data.templates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name}`);
        console.log(`      Body: ${template.body.substring(0, 50)}...`);
        console.log(`      Variables: [${template.variables.join(', ')}]`);
        console.log(`      ID: ${template.id}\n`);
      });
    } else {
      console.log('❌ Failed to fetch templates');
    }
  } catch (error) {
    console.log('❌ Error fetching templates:', error.message);
  }

  // Test 2: Create a new template
  console.log('2. Creating a new template...');
  try {
    const newTemplate = {
      name: 'Test Template ' + Date.now(),
      body: 'Hello {{name}}, welcome to {{company}}! Your account number is {{accountNumber}}.',
      variables: ['name', 'company', 'accountNumber']
    };

    const response = await fetch(`${baseUrl}/api/whatsapp/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTemplate),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Template created successfully!');
      console.log(`   Template ID: ${result.template.id}`);
      console.log(`   Template Name: ${result.template.name}`);
    } else {
      console.log('❌ Failed to create template:', result.error);
    }
  } catch (error) {
    console.log('❌ Error creating template:', error.message);
  }

  // Test 3: Test template message sending (commented out to avoid actual sending)
  console.log('\n3. Template message sending test (commented out)...');
  console.log('   To test sending, uncomment the code below and provide:');
  console.log('   - A valid phone number');
  console.log('   - A template ID from the list above');

  /*
  try {
    const templateTest = {
      to: '+1234567890', // Replace with a valid WhatsApp number
      templateId: 'template-id-here', // Use one from the list above
      variables: {
        name: 'John Doe',
        company: 'Your Company',
        accountNumber: '12345'
      }
    };

    const response = await fetch(`${baseUrl}/api/whatsapp/send-template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateTest),
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Template message sent successfully!');
      console.log(`   Message SID: ${result.messageSid}`);
      console.log(`   Processed Message: ${result.processedMessage}`);
    } else {
      console.log('❌ Failed to send template message:', result.error);
    }
  } catch (error) {
    console.log('❌ Error sending template message:', error.message);
  }
  */

  console.log('\n🎉 WhatsApp Template test completed!');
  console.log('📱 Access the template interface at: http://localhost:3000/settings/whatsapp');
}

testWhatsAppTemplates().catch(console.error);
