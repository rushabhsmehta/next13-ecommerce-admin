import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function seedConfigOptions() {
  try {
    // Seed Meal Plans
    const mealPlans = [
      { name: 'Continental Plan', code: 'CP', description: 'Breakfast Only' },
      { name: 'Modified American Plan', code: 'MAP', description: 'Breakfast + Dinner' },
      { name: 'American Plan', code: 'AP', description: 'All Meals' },
      { name: 'European Plan', code: 'EP', description: 'No Meals' }
    ];
    
    console.log('Seeding meal plans...');
    for (const plan of mealPlans) {
      await prisma.mealPlan.upsert({
        where: { code: plan.code },
        update: {},
        create: plan
      });
    }
    
    // Seed Room Types
    const roomTypes = [
      { name: 'Standard Room', description: 'Basic room with essential amenities' },
      { name: 'Deluxe Room', description: 'Spacious room with upgraded amenities' },
      { name: 'Suite', description: 'Separate living area and bedroom' },
      { name: 'Executive Room', description: 'Premium room with business facilities' },
      { name: 'Family Room', description: 'Designed for families with extra space' }
    ];
    
    console.log('Seeding room types...');
    for (const type of roomTypes) {
      await prisma.roomType.upsert({
        where: { name: type.name },
        update: {},
        create: type
      });
    }
    
    // Seed Occupancy Types
    const occupancyTypes = [
      { name: 'Single', description: 'One person per room', maxPersons: 1 },
      { name: 'Double', description: 'Two persons per room', maxPersons: 2 },
      { name: 'Triple', description: 'Three persons per room', maxPersons: 3 },
      { name: 'Quad', description: 'Four persons per room', maxPersons: 4 },
      { name: 'Child with Bed', description: 'Child with extra bed', maxPersons: 1 },
      { name: 'Child without Bed', description: 'Child sharing parents bed', maxPersons: 1 }
    ];
    
    console.log('Seeding occupancy types...');
    for (const type of occupancyTypes) {
      await prisma.occupancyType.upsert({
        where: { name: type.name },
        update: {},
        create: type
      });
    }
    
    // Seed Vehicle Types
    const vehicleTypes = [
      { name: 'Sedan', description: 'Small family car', capacity: 4 },
      { name: 'SUV', description: 'Sport utility vehicle', capacity: 7 },
      { name: 'Tempo Traveller', description: 'Mini bus for groups', capacity: 12 },
      { name: 'Bus', description: 'Large passenger vehicle', capacity: 40 },
      { name: 'Hatchback', description: 'Compact car', capacity: 4 },
      { name: 'Innova', description: 'Popular midsize MPV', capacity: 7 }
    ];
    
    console.log('Seeding vehicle types...');
    for (const type of vehicleTypes) {
      await prisma.vehicleType.upsert({
        where: { name: type.name },
        update: {},
        create: type
      });
    }
    
    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Error seeding configuration options:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedConfigOptions();
