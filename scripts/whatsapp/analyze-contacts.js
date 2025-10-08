#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function analyzeContacts() {
  const prisma = new PrismaClient();

  try {
    console.log('\n🔍 Analyzing WhatsApp Messages for Duplicate Contacts\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get all messages
    const allMessages = await prisma.whatsAppMessage.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total messages in database: ${allMessages.length}\n`);

    // Analyze how contacts are being generated
    const contactMap = {};

    allMessages.forEach(msg => {
      // This mimics your UI logic
      const contactPhone = msg.direction === 'inbound' ? msg.from : msg.to;
      
      if (!contactPhone || contactPhone === 'business') return;

      if (!contactMap[contactPhone]) {
        contactMap[contactPhone] = {
          phone: contactPhone,
          messages: [],
          inbound: 0,
          outbound: 0
        };
      }

      contactMap[contactPhone].messages.push({
        id: msg.id,
        direction: msg.direction,
        message: msg.message.substring(0, 50),
        createdAt: msg.createdAt
      });

      if (msg.direction === 'inbound') {
        contactMap[contactPhone].inbound++;
      } else {
        contactMap[contactPhone].outbound++;
      }
    });

    console.log(`📞 Unique contacts found: ${Object.keys(contactMap).length}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    Object.entries(contactMap).forEach(([phone, data]) => {
      console.log(`\n📱 Contact: ${phone}`);
      console.log(`   Total messages: ${data.messages.length} (${data.inbound} in, ${data.outbound} out)`);
      console.log(`   Latest message: ${data.messages[0].createdAt.toLocaleString()}`);
      console.log(`   First 3 messages:`);
      data.messages.slice(0, 3).forEach(msg => {
        const arrow = msg.direction === 'inbound' ? '📨' : '📤';
        console.log(`   ${arrow} ${msg.createdAt.toLocaleTimeString()} - ${msg.message}`);
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🎯 Expected behavior:');
    console.log('   Each unique phone number should appear ONCE in the contact list');
    console.log('   All messages for that number should be grouped together\n');

    // Check for the specific issue with +919978783238
    const problematicPhone = Object.keys(contactMap).find(p => p.includes('919978783238'));
    if (problematicPhone) {
      console.log(`\n⚠️  Checking +919978783238 specifically:`);
      console.log(`   Stored as: "${problematicPhone}"`);
      console.log(`   Character count: ${problematicPhone.length}`);
      console.log(`   Should appear as: 1 contact with ${contactMap[problematicPhone].messages.length} messages`);
      console.log(`   Currently showing as: 3 separate contacts in UI (BUG!)\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeContacts();
