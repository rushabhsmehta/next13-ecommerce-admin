#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function normalizeDatabase() {
  const prisma = new PrismaClient();

  try {
    console.log('\n🔧 Normalizing Phone Numbers in Database\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Get all messages
    const messages = await prisma.whatsAppMessage.findMany();
    console.log(`📊 Found ${messages.length} messages to normalize\n`);

    // Normalize phone number function
    const normalizePhone = (phone) => {
      if (!phone || phone === 'business') return phone;
      
      // Remove 'whatsapp:' prefix
      let normalized = phone.replace(/^whatsapp:/, '');
      
      // Remove spaces and trim
      normalized = normalized.replace(/\s+/g, '').trim();
      
      // Ensure it starts with +
      if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
      }
      
      return normalized;
    };

    let updatedCount = 0;

    // Update each message
    for (const msg of messages) {
      const normalizedFrom = normalizePhone(msg.from);
      const normalizedTo = normalizePhone(msg.to);
      
      // Only update if something changed
      if (normalizedFrom !== msg.from || normalizedTo !== msg.to) {
        await prisma.whatsAppMessage.update({
          where: { id: msg.id },
          data: {
            from: normalizedFrom,
            to: normalizedTo
          }
        });
        
        console.log(`✓ Updated message ${msg.id}:`);
        console.log(`  FROM: "${msg.from}" → "${normalizedFrom}"`);
        console.log(`  TO:   "${msg.to}" → "${normalizedTo}"`);
        console.log('');
        
        updatedCount++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`\n✅ COMPLETE!`);
    console.log(`   Updated: ${updatedCount} messages`);
    console.log(`   Skipped: ${messages.length - updatedCount} (already normalized)\n`);
    
    // Show unique phone numbers after normalization
    const updatedMessages = await prisma.whatsAppMessage.findMany();
    const uniqueNumbers = new Set();
    
    updatedMessages.forEach(msg => {
      if (msg.direction === 'inbound') {
        uniqueNumbers.add(msg.from);
      } else {
        uniqueNumbers.add(msg.to);
      }
    });
    
    console.log(`📞 Unique contacts after normalization: ${uniqueNumbers.size}`);
    Array.from(uniqueNumbers).forEach(num => {
      if (num && num !== 'business') {
        const count = updatedMessages.filter(m => 
          (m.direction === 'inbound' && m.from === num) || 
          (m.direction === 'outbound' && m.to === num)
        ).length;
        console.log(`   ${num} (${count} messages)`);
      }
    });
    
    console.log('\n🎉 Database normalized! Refresh your UI to see the changes.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeDatabase();
