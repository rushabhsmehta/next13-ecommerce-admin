#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { PrismaClient: WhatsAppPrisma } = require('@prisma/whatsapp-client');

const whatsappPrisma = new WhatsAppPrisma();

function normalizeContactAddress(address) {
  if (!address) return null;
  
  let normalized = address;
  
  // Strip WhatsApp prefix if present
  if (normalized.startsWith('whatsapp:')) {
    normalized = normalized.substring(9);
  }
  
  // Already in E.164 format
  if (normalized.startsWith('+')) {
    return normalized;
  }
  
  // Add + for E.164 format
  if (/^\d+$/.test(normalized)) {
    return '+' + normalized;
  }
  
  return null;
}

async function listRespondedContacts() {
  try {
    console.log('\n📋 CONTACTS WHO HAVE SENT RESPONSES\n');
    console.log('═'.repeat(80));
    
    // Get all messages with customer info
    const allMessages = await whatsappPrisma.whatsAppMessage.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        whatsappCustomer: {
          select: {
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
          }
        }
      }
    });

    // Group by contact and filter for those with inbound messages
    const contactMap = {};
    
    allMessages.forEach(msg => {
      // Only process inbound messages (responses)
      if (msg.direction !== 'inbound' && msg.direction !== 'in') {
        return;
      }

      const normalizedFrom = normalizeContactAddress(msg.from);
      const contactPhone = normalizedFrom;

      if (!contactPhone) {
        return;
      }

      if (!contactMap[contactPhone]) {
        const customer = msg.whatsappCustomer;
        const customerName = customer 
          ? `${customer.firstName}${customer.lastName ? ' ' + customer.lastName : ''}`
          : contactPhone;

        contactMap[contactPhone] = {
          phone: contactPhone,
          name: customerName,
          email: customer?.email || 'N/A',
          messages: [],
          firstResponseAt: new Date(msg.createdAt),
          lastResponseAt: new Date(msg.createdAt)
        };
      }

      contactMap[contactPhone].messages.push({
        text: msg.message?.substring(0, 60) || '[No content]',
        time: new Date(msg.createdAt),
        status: msg.status
      });

      // Update timestamps
      const msgTime = new Date(msg.createdAt);
      if (msgTime < contactMap[contactPhone].firstResponseAt) {
        contactMap[contactPhone].firstResponseAt = msgTime;
      }
      if (msgTime > contactMap[contactPhone].lastResponseAt) {
        contactMap[contactPhone].lastResponseAt = msgTime;
      }
    });

    // Convert to array and sort by last response time (most recent first)
    const respondedContacts = Object.values(contactMap)
      .sort((a, b) => b.lastResponseAt - a.lastResponseAt);

    console.log(`\n✅ Total Contacts with Responses: ${respondedContacts.length}\n`);

    // Display contacts
    respondedContacts.forEach((contact, idx) => {
      console.log(`[${idx + 1}] ${contact.name}`);
      console.log(`    📱 Phone: ${contact.phone}`);
      console.log(`    📧 Email: ${contact.email}`);
      console.log(`    💬 Messages: ${contact.messages.length}`);
      console.log(`    ⏰ First Response: ${contact.firstResponseAt.toLocaleString('en-IN')}`);
      console.log(`    ⏰ Last Response: ${contact.lastResponseAt.toLocaleString('en-IN')}`);
      console.log(`    📝 Recent Messages:`);
      
      contact.messages.slice(0, 3).forEach((msg, msgIdx) => {
        console.log(`       [${msgIdx + 1}] "${msg.text}" (${msg.time.toLocaleString('en-IN')})`);
      });
      
      if (contact.messages.length > 3) {
        console.log(`       ... and ${contact.messages.length - 3} more messages`);
      }
      console.log();
    });

    // Summary statistics
    console.log('═'.repeat(80));
    console.log('\n📊 SUMMARY STATISTICS:\n');
    
    const totalResponses = respondedContacts.reduce((sum, c) => sum + c.messages.length, 0);
    const avgResponsesPerContact = (totalResponses / respondedContacts.length).toFixed(1);
    
    console.log(`  Total Unique Contacts with Responses: ${respondedContacts.length}`);
    console.log(`  Total Response Messages: ${totalResponses}`);
    console.log(`  Average Responses per Contact: ${avgResponsesPerContact}`);
    console.log(`  Most Active Contact: ${respondedContacts[0].name} (${respondedContacts[0].messages.length} responses)`);
    
    if (respondedContacts.length > 1) {
      console.log(`  Second Active Contact: ${respondedContacts[1].name} (${respondedContacts[1].messages.length} responses)`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await whatsappPrisma.$disconnect();
  }
}

listRespondedContacts();
