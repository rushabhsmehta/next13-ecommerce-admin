// Script to check conversations for a specific phone number
// Run: node scripts/tests/check-phone-messages.js

const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { PrismaClient: WhatsAppPrisma } = require('@prisma/whatsapp-client');

async function checkConversations() {
  try {
    const phoneNumber = '+919978783238';
    const normalizedPhone = '919978783238';
    
    console.log('\n📱 Checking conversations for:', phoneNumber);
    console.log('━'.repeat(80));

    const whatsappPrisma = new WhatsAppPrisma();
    
    // Search for messages with this phone number
    const messages = await whatsappPrisma.whatsAppMessage.findMany({
      where: {
        OR: [
          { from: { contains: normalizedPhone } },
          { to: { contains: normalizedPhone } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        whatsappCustomer: true,
      },
    });

    console.log(`✓ Found ${messages.length} messages for this phone number\n`);

    if (messages.length === 0) {
      console.log('❌ No messages found for this phone number!');
      await whatsappPrisma.$disconnect();
      return;
    }

    // Group by contact and count directions
    const contactMap = {};
    
    messages.forEach(msg => {
      const from = msg.from?.replace(/whatsapp:/i, '') || 'unknown';
      const to = msg.to?.replace(/whatsapp:/i, '') || 'unknown';
      const contact = msg.direction === 'inbound' ? from : to;
      
      if (!contactMap[contact]) {
        contactMap[contact] = {
          phone: contact,
          outbound: [],
          inbound: [],
          outboundCount: 0,
          inboundCount: 0,
          totalCount: 0,
        };
      }
      
      if (msg.direction === 'outbound' || msg.direction === 'out') {
        contactMap[contact].outbound.push(msg);
        contactMap[contact].outboundCount++;
      } else if (msg.direction === 'inbound' || msg.direction === 'in') {
        contactMap[contact].inbound.push(msg);
        contactMap[contact].inboundCount++;
      }
      contactMap[contact].totalCount++;
    });

    console.log(`📊 Grouped into ${Object.keys(contactMap).length} contacts:\n`);

    // Display summary
    Object.entries(contactMap).forEach(([phone, data]) => {
      console.log(`👤 Contact: ${phone}`);
      console.log(`   📤 Sent (outbound): ${data.outboundCount}`);
      console.log(`   📨 Received (inbound): ${data.inboundCount}`);
      console.log(`   📊 Total: ${data.totalCount}`);
      console.log('');
    });

    console.log('━'.repeat(80));
    console.log('\n📋 DETAILED SENT MESSAGES (Direction = "outbound"):\n');

    const allOutbound = messages.filter(m => m.direction === 'outbound' || m.direction === 'out');
    
    if (allOutbound.length === 0) {
      console.log('❌ NO SENT MESSAGES FOUND!');
      console.log('\n⚠️  This explains why sent messages are not showing in the chat!\n');
    } else {
      console.log(`✓ Total sent messages: ${allOutbound.length}\n`);
      
      allOutbound.forEach((msg, idx) => {
        const time = new Date(msg.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        console.log(`[${idx + 1}] ${time}`);
        console.log(`    To: ${msg.to}`);
        console.log(`    Status: ${msg.status}`);
        console.log(`    Message: ${msg.message ? msg.message.substring(0, 80) : '[No text - ' + (msg.metadata?.whatsappType || 'unknown') + ']'}`);
        if (msg.metadata?.templateName) {
          console.log(`    Template: ${msg.metadata.templateName}`);
        }
        console.log('');
      });
    }

    console.log('━'.repeat(80));
    console.log('\n📋 DETAILED RECEIVED MESSAGES (Direction = "inbound"):\n');

    const allInbound = messages.filter(m => m.direction === 'inbound' || m.direction === 'in');
    
    if (allInbound.length === 0) {
      console.log('❌ NO RECEIVED MESSAGES FOUND!');
    } else {
      console.log(`✓ Total received messages: ${allInbound.length}\n`);
      
      allInbound.slice(0, 20).forEach((msg, idx) => {
        const time = new Date(msg.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
        console.log(`[${idx + 1}] ${time}`);
        console.log(`    From: ${msg.from}`);
        console.log(`    Message: ${msg.message ? msg.message.substring(0, 80) : '[Media]'}`);
        console.log('');
      });
      
      if (allInbound.length > 20) {
        console.log(`... and ${allInbound.length - 20} more received messages`);
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

checkConversations();
