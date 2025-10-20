#!/usr/bin/env node

/**
 * List all available WhatsApp templates
 */

require('dotenv').config();

const BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN;
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';

console.log('📋 Fetching WhatsApp Templates');
console.log('═══════════════════════════════════════════════════════════\n');

async function listTemplates() {
  const url = `https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates`;
  
  console.log(`Fetching from: ${url}\n`);

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
      
      data.data.forEach((template, index) => {
        console.log(`Template #${index + 1}:`);
        console.log(`  Name: ${template.name}`);
        console.log(`  Status: ${template.status}`);
        console.log(`  Language: ${template.language}`);
        console.log(`  Category: ${template.category}`);
        console.log(`  ID: ${template.id}`);
        
        if (template.components && template.components.length > 0) {
          console.log(`  Components:`);
          template.components.forEach(comp => {
            console.log(`    - ${comp.type}${comp.text ? ': ' + comp.text.substring(0, 50) + '...' : ''}`);
          });
        }
        
        console.log('');
      });
      
      console.log('\nFull Response:');
      console.log(JSON.stringify(data, null, 2));
      
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

// Fetch templates

listTemplates();
