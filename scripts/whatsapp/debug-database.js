#!/usr/bin/env node

const { PrismaClient } = require('@prisma/whatsapp-client');

async function checkDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('\n🔍 DATABASE ANALYSIS - WhatsApp Messages\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    const messages = await prisma.whatsAppMessage.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 30
    });

    console.log(`📊 Total messages (last 30): ${messages.length}\n`);

    // Group by unique combinations to find duplicates
    const groupedByPhone = {};
    
    messages.forEach(msg => {
      const key = msg.direction === 'inbound' ? msg.from : msg.to;
      
      if (!groupedByPhone[key]) {
        groupedByPhone[key] = [];
      }
      
      groupedByPhone[key].push({
        id: msg.id,
        direction: msg.direction,
        message: msg.message.substring(0, 60),
        from: msg.from,
        to: msg.to,
        status: msg.status,
        createdAt: msg.createdAt.toLocaleString()
      });
    });

    console.log(`📞 Unique phone numbers: ${Object.keys(groupedByPhone).length}\n`);
    console.log('═══════════════════════════════════════════════════════════\n');

    Object.entries(groupedByPhone).forEach(([phone, msgs]) => {
      console.log(`\n📱 CONTACT: "${phone}"`);
      console.log(`   Length: ${phone.length} chars`);
      console.log(`   Hex: ${Buffer.from(phone).toString('hex')}`);
      console.log(`   Messages: ${msgs.length}\n`);
      
      msgs.slice(0, 5).forEach(msg => {
        const arrow = msg.direction === 'inbound' ? '📨 IN ' : '📤 OUT';
        const tick = msg.status === 'read' ? '✓✓ blue' : msg.status === 'delivered' ? '✓✓ gray' : msg.status === 'sent' ? '✓ gray' : '🕐 pending';
        console.log(`   ${arrow} | ${tick} | ${msg.createdAt}`);
        console.log(`      FROM: "${msg.from}"`);
        console.log(`      TO: "${msg.to}"`);
        console.log(`      MSG: ${msg.message}`);
        console.log('');
      });
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n🔍 DUPLICATE CONTACT ANALYSIS:\n');

    // Check for phone number variations that might look the same
    const phoneVariations = {};
    Object.keys(groupedByPhone).forEach(phone => {
      const normalized = phone.toLowerCase().replace(/\s+/g, '').trim();
      if (!phoneVariations[normalized]) {
        phoneVariations[normalized] = [];
      }
      phoneVariations[normalized].push(phone);
    });

    Object.entries(phoneVariations).forEach(([normalized, variations]) => {
      if (variations.length > 1) {
        console.log(`⚠️  FOUND VARIATIONS for: ${normalized}`);
        variations.forEach(v => {
          console.log(`   - "${v}" (${groupedByPhone[v].length} messages)`);
        });
        console.log('');
      }
    });

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n💡 SOLUTION:\n');
    console.log('If you see multiple phone number variations above,');
    console.log('that\'s why you have duplicate contacts in the UI!\n');
    console.log('The normalization code should fix this.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
