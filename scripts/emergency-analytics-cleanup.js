const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function emergencyAnalyticsCleanup() {
  try {
    console.log('🚨 EMERGENCY: Deleting ALL analytics events\n');
    
    // Count first
    const total = await prisma.whatsAppAnalyticsEvent.count();
    console.log(`📊 Total analytics events: ${total}\n`);
    
    if (total === 0) {
      console.log('✅ No events to delete');
      return;
    }
    
    console.log('Deleting in batches...\n');
    
    let batchNum = 1;
    let totalDeleted = 0;
    
    while (true) {
      try {
        const batch = await prisma.whatsAppAnalyticsEvent.findMany({
          take: 50,
          select: { id: true }
        });
        
        if (batch.length === 0) break;
        
        // Delete one by one to avoid table lock
        for (const event of batch) {
          await prisma.whatsAppAnalyticsEvent.delete({
            where: { id: event.id }
          });
          totalDeleted++;
        }
        
        console.log(`Batch ${batchNum}: Deleted ${batch.length} events (Total: ${totalDeleted}/${total})`);
        batchNum++;
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));
        
      } catch (error) {
        console.error(`Error in batch ${batchNum}:`, error.message);
        break;
      }
    }
    
    console.log(`\n✅ Deleted ${totalDeleted} analytics events\n`);
    
    const remaining = await prisma.whatsAppAnalyticsEvent.count();
    console.log(`📊 Remaining: ${remaining}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

emergencyAnalyticsCleanup();
