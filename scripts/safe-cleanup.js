const { PrismaClient } = require('@prisma/whatsapp-client');

async function safeCleanup() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
  });
  
  try {
    console.log('🔄 Waiting for database to be available...\n');
    
    // Wait and retry connection
    let connected = false;
    for (let i = 0; i < 10; i++) {
      try {
        await prisma.$connect();
        console.log('✅ Database connected!\n');
        connected = true;
        break;
      } catch (e) {
        console.log(`Attempt ${i + 1}/10: Waiting for database...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    
    if (!connected) {
      console.log('\n❌ Database not available. Click RESTART in Railway dashboard first.\n');
      return;
    }
    
    console.log('🧹 Starting aggressive cleanup...\n');
    
    // Delete analytics in very small batches
    console.log('1️⃣ Clearing analytics (slow and safe)...');
    let analyticsDeleted = 0;
    for (let i = 0; i < 100; i++) {
      try {
        const batch = await prisma.whatsAppAnalyticsEvent.findMany({
          take: 10,
          select: { id: true }
        });
        
        if (batch.length === 0) break;
        
        for (const item of batch) {
          try {
            await prisma.whatsAppAnalyticsEvent.delete({ where: { id: item.id } });
            analyticsDeleted++;
            if (analyticsDeleted % 50 === 0) {
              console.log(`   Deleted ${analyticsDeleted} analytics events...`);
            }
          } catch (e) {
            // Skip if fails
          }
          await new Promise(r => setTimeout(r, 10));
        }
      } catch (e) {
        break;
      }
    }
    console.log(`   ✅ Deleted ${analyticsDeleted} analytics events\n`);
    
    // Delete old messages
    console.log('2️⃣ Clearing old messages...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // Keep 7 days instead of 1
    
    let messagesDeleted = 0;
    for (let i = 0; i < 50; i++) {
      try {
        const batch = await prisma.whatsAppMessage.findMany({
          where: { createdAt: { lt: sevenDaysAgo } },
          take: 10,
          select: { id: true }
        });
        
        if (batch.length === 0) break;
        
        for (const item of batch) {
          try {
            await prisma.whatsAppMessage.delete({ where: { id: item.id } });
            messagesDeleted++;
          } catch (e) {}
          await new Promise(r => setTimeout(r, 10));
        }
      } catch (e) {
        break;
      }
    }
    console.log(`   ✅ Deleted ${messagesDeleted} messages\n`);
    
    // Delete old sessions
    console.log('3️⃣ Clearing old sessions...');
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    let sessionsDeleted = 0;
    for (let i = 0; i < 50; i++) {
      try {
        const batch = await prisma.whatsAppSession.findMany({
          where: { updatedAt: { lt: twoHoursAgo } },
          take: 10,
          select: { id: true }
        });
        
        if (batch.length === 0) break;
        
        for (const item of batch) {
          try {
            await prisma.whatsAppSession.delete({ where: { id: item.id } });
            sessionsDeleted++;
          } catch (e) {}
          await new Promise(r => setTimeout(r, 10));
        }
      } catch (e) {
        break;
      }
    }
    console.log(`   ✅ Deleted ${sessionsDeleted} sessions\n`);
    
    console.log('✅ CLEANUP COMPLETE!\n');
    console.log(`Total freed:`);
    console.log(`  - Analytics: ${analyticsDeleted}`);
    console.log(`  - Messages: ${messagesDeleted}`);
    console.log(`  - Sessions: ${sessionsDeleted}\n`);
    console.log('🚀 You should have space now. Deploy your code to disable analytics.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 If database is still crashed, click RESTART in Railway dashboard first.\n');
  } finally {
    await prisma.$disconnect();
  }
}

safeCleanup();
