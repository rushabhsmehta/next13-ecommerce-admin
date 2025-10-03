import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Checking existing room types...');
    const roomTypes = await prisma.roomType.findMany();
    console.log('Existing Room Types:');
    roomTypes.forEach(rt => {
      console.log(`- ID: ${rt.id}, Name: ${rt.name}, Description: ${rt.description || 'No description'}`);
    });
    
    // Check if "Custom" room type exists
    const customRoomType = roomTypes.find(rt => rt.name.toLowerCase().includes('custom'));
    if (customRoomType) {
      console.log('\nFound existing Custom room type:', customRoomType);
    } else {
      console.log('\nNo existing Custom room type found. Creating one...');
      
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

main();
