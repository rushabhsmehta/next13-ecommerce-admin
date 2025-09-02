const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRoomTypes() {
  try {
    const roomTypes = await prisma.roomType.findMany();
    console.log('Existing Room Types:');
    roomTypes.forEach(rt => {
      console.log(`- ID: ${rt.id}, Name: ${rt.name}, Description: ${rt.description}`);
    });
    
    // Check if "Custom" room type exists
    const customRoomType = roomTypes.find(rt => rt.name.toLowerCase().includes('custom'));
    if (customRoomType) {
      console.log('\nFound existing Custom room type:', customRoomType);
    } else {
      console.log('\nNo existing Custom room type found. Will create one.');
      
      // Create a custom room type
      const newCustomRoomType = await prisma.roomType.create({
        data: {
          name: 'Custom',
          description: 'Used when room type is manually entered',
          isActive: true
        }
      });
      
      console.log('Created Custom room type:', newCustomRoomType);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoomTypes();
