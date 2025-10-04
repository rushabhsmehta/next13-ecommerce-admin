#!/usr/bin/env node

/**
 * Get specific template details: kashmirtest
 * Business ID from URL: 125911992150856
 */

require('dotenv').config();

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const BUSINESS_ACCOUNT_ID = '125911992150856'; // From your screenshot URL

console.log('📋 Fetching kashmirtest Template Details');
console.log('═══════════════════════════════════════════════════════════\n');

async function getTemplateDetails() {
  // Try to get all templates with filters
  const url = `https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,language,category,components&limit=50`;
  
  console.log(`Fetching from Business Account: ${BUSINESS_ACCOUNT_ID}\n`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    console.log('📥 Response:');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    if (response.ok && data.data) {
      console.log(`✅ Found ${data.data.length} template(s)\n`);
      
      // Filter for kashmirtest
      const kashmirTemplate = data.data.find(t => t.name === 'kashmirtest');
      
      if (kashmirTemplate) {
        console.log('🎯 Found kashmirtest template!\n');
        console.log('Template Details:');
        console.log(`  Name: ${kashmirTemplate.name}`);
        console.log(`  Status: ${kashmirTemplate.status}`);
        console.log(`  Language: ${kashmirTemplate.language}`);
        console.log(`  Category: ${kashmirTemplate.category}`);
        console.log(`  ID: ${kashmirTemplate.id}`);
        console.log('');
        
        if (kashmirTemplate.components) {
          console.log('Components:');
          kashmirTemplate.components.forEach((comp, i) => {
            console.log(`  ${i + 1}. Type: ${comp.type}`);
            if (comp.text) console.log(`     Text: ${comp.text}`);
            if (comp.format) console.log(`     Format: ${comp.format}`);
            if (comp.buttons) {
              console.log(`     Buttons:`);
              comp.buttons.forEach((btn, j) => {
                console.log(`       ${j + 1}. ${btn.type}: ${btn.text || btn.url || 'N/A'}`);
              });
            }
          });
        }
        
        console.log('\n\n⚠️  IMPORTANT:');
        console.log(`Status is: ${kashmirTemplate.status}`);
        
        if (kashmirTemplate.status === 'PENDING' || kashmirTemplate.status === 'REJECTED' || kashmirTemplate.status.includes('pending')) {
          console.log('❌ This template is NOT approved yet!');
          console.log('   You cannot send messages with pending/rejected templates.');
          console.log('   Wait for Meta to approve it (usually 24-48 hours).');
        } else if (kashmirTemplate.status === 'APPROVED') {
          console.log('✅ Template is approved! You can use it.');
          console.log(`   Language code to use: ${kashmirTemplate.language}`);
        }
        
        console.log('\n\nFull Template JSON:');
        console.log(JSON.stringify(kashmirTemplate, null, 2));
        
      } else {
        console.log('❌ kashmirtest template not found in the list!\n');
        console.log('Available templates:');
        data.data.forEach(t => {
          console.log(`  - ${t.name} (${t.language}) - Status: ${t.status}`);
        });
      }
      
    } else {
      console.log('❌ FAILED to fetch templates\n');
      console.log('Error Details:');
      if (data.error) {
        console.log(`  Code: ${data.error.code}`);
        console.log(`  Message: ${data.error.message}`);
        console.log(`  Type: ${data.error.type}`);
      }
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.log('❌ ERROR during request:');
    console.log(error.message);
    console.log('\nStack trace:');
    console.log(error.stack);
  }
}

// Check configuration first
if (!ACCESS_TOKEN) {
  console.log('❌ Missing META_WHATSAPP_ACCESS_TOKEN environment variable!');
  process.exit(1);
}

// Fetch template details
getTemplateDetails();
