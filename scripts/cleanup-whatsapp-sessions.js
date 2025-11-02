const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function cleanupSessions() {
  try {
    console.log('🧹 Cleaning up WhatsApp sessions...\n');
    
    // Check current sessions
    const totalSessions = await prisma.whatsAppSession.count();
    console.log(`📊 Total sessions: ${totalSessions.toLocaleString()}\n`);
    
    if (totalSessions === 0) {
      console.log('✅ No sessions to clean');
      return;
    }
    
    // Delete sessions older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log('Deleting sessions older than 30 days...');
    const oldSessions = await prisma.whatsAppSession.deleteMany({
      where: {
        updatedAt: { lt: thirtyDaysAgo }
      }
    });
    console.log(`✅ Deleted ${oldSessions.count} old sessions\n`);
    
    // Delete sessions older than 7 days in batches
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log('Deleting sessions older than 7 days in batches...');
    let batchCount = 0;
    let totalDeleted = 0;
    
    while (true) {
      const batch = await prisma.whatsAppSession.findMany({
        where: {
          updatedAt: { lt: sevenDaysAgo }
        },
        take: 100,
        select: { id: true }
      });
      
      if (batch.length === 0) break;
      
      const deleted = await prisma.$transaction(
        batch.map(session =>
          prisma.whatsAppSession.delete({
            where: { id: session.id }
          })
        )
      );
      
      batchCount++;
      totalDeleted += deleted.length;
      console.log(`  Batch ${batchCount}: Deleted ${deleted.length} sessions (Total: ${totalDeleted})`);
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Deleted ${totalDeleted} sessions (7+ days old)\n`);
    
    // Show remaining count
    const remaining = await prisma.whatsAppSession.count();
    console.log(`📊 Remaining sessions: ${remaining}`);
    
    // If still too many, delete more aggressively
    if (remaining > 100) {
      console.log('\n⚠️  Still have >100 sessions. Deleting all sessions older than 24 hours...');
      
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      let aggressiveCount = 0;
      while (true) {
        const batch = await prisma.whatsAppSession.findMany({
          where: {
            updatedAt: { lt: oneDayAgo }
          },
          take: 100,
          select: { id: true }
        });
        
        if (batch.length === 0) break;
        
        const deleted = await prisma.$transaction(
          batch.map(session =>
            prisma.whatsAppSession.delete({
              where: { id: session.id }
            })
          )
        );
        
        aggressiveCount += deleted.length;
        console.log(`  Aggressive cleanup: ${aggressiveCount} deleted...`);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`\n✅ Aggressive cleanup complete: ${aggressiveCount} sessions deleted\n`);
    }
    
    // Final count
    const final = await prisma.whatsAppSession.count();
    console.log(`\n📊 Final session count: ${final}`);
    console.log('✅ Cleanup complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSessions();
