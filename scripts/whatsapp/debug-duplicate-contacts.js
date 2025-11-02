#!/usr/bin/env node

/**
 * Debug duplicate contacts - check why +919978783238 appears twice
 */

const { PrismaClient } = require('@prisma/whatsapp-client');

async function debugDuplicates() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking for duplicate contacts from +919978783238...\n');

    // Get all messages for this number
    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        OR: [
          { from: { contains: '919978783238' } },
          { to: { contains: '919978783238' } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    console.log(`Found ${messages.length} messages\n`);

    // Group by exact phone number value
    const phoneVariations = new Map();

    messages.forEach(msg => {
      const contactPhone = msg.direction === 'inbound' ? msg.from : msg.to;
      
      if (!phoneVariations.has(contactPhone)) {
        phoneVariations.set(contactPhone, []);
      }
      phoneVariations.get(contactPhone).push({
        id: msg.id,
        direction: msg.direction,
        message: msg.message.substring(0, 50),
        createdAt: msg.createdAt,
        from: msg.from,
        to: msg.to
      });
    });

    console.log('📊 Phone number variations found:\n');
    console.log('═══════════════════════════════════════════════════════════');
    
    phoneVariations.forEach((msgs, phone) => {
      console.log(`\n📞 Phone: "${phone}"`);
      console.log(`   Character codes: [${Array.from(phone).map(c => c.charCodeAt(0)).join(', ')}]`);
      console.log(`   Messages: ${msgs.length}`);
      console.log('   ─────────────────────────────────────────────────────');
      msgs.forEach(msg => {
        console.log(`   ${msg.direction === 'inbound' ? '📨 IN ' : '📤 OUT'} | ${msg.createdAt.toLocaleTimeString()} | ${msg.message}`);
        console.log(`      FROM: "${msg.from}" → TO: "${msg.to}"`);
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🎯 Analysis:');
    
    if (phoneVariations.size > 1) {
      console.log(`❌ PROBLEM: Found ${phoneVariations.size} different phone number variations!`);
      console.log('\nPhone numbers stored as:');
      Array.from(phoneVariations.keys()).forEach((phone, idx) => {
        console.log(`   ${idx + 1}. "${phone}" (length: ${phone.length})`);
      });
      console.log('\n💡 Solution: These should all be the same! Check your message sending code.');
    } else {
      console.log(`✅ Phone number is consistent: "${Array.from(phoneVariations.keys())[0]}"`);
      console.log('   The duplicate contacts issue is NOT from phone number variations.');
      console.log('   Check the UI grouping logic or contact ID generation.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDuplicates();
