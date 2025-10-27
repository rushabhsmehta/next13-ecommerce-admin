const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateCampaignRate() {
  try {
    // Update this specific campaign to use optimized rate (4800 per minute = 80 per second)
    const updated = await prisma.whatsAppCampaign.update({
      where: { id: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65' },
      data: { 
        rateLimit: 4800  // 80 messages per second * 60 = 4800 per minute
      },
      select: {
        name: true,
        rateLimit: true
      }
    });
    
    console.log('✅ Campaign updated successfully!');
    console.log('Name:', updated.name);
    console.log('New Rate Limit:', updated.rateLimit, 'per minute');
    console.log('That is:', Math.floor(updated.rateLimit / 60), 'messages per second');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateCampaignRate();
