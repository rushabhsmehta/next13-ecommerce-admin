const { PrismaClient } = require('@prisma/whatsapp-client');
const prisma = new PrismaClient();

async function checkCampaign() {
  try {
    const campaign = await prisma.whatsAppCampaign.findUnique({
      where: { id: '51f580d8-6ac9-4a3b-a9ce-e6bc333fea65' },
      select: { 
        rateLimit: true, 
        name: true,
        status: true
      }
    });
    
    console.log('Campaign Details:');
    console.log('Name:', campaign.name);
    console.log('Status:', campaign.status);
    console.log('Rate Limit (per minute):', campaign.rateLimit);
    
    if (campaign.rateLimit) {
      const perSecond = Math.floor(campaign.rateLimit / 60);
      console.log('Rate Limit (per second):', perSecond);
    } else {
      console.log('Rate Limit: NULL (will use default)');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaign();
