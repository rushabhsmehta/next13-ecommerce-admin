// Import the singleton Prisma client using CommonJS syntax
const prisma = require('../../lib/prismadb');

async function seedConfigData() {
  try {
    console.log('Seeding configuration data...');

    // Seed Meal Plans
    const mealPlans = [
      { name: 'Continental Plan', code: 'CP', description: 'Breakfast Only' },
      { name: 'Modified American Plan', code: 'MAP', description: 'Breakfast and Dinner' },
      { name: 'American Plan', code: 'AP', description: 'Breakfast, Lunch, and Dinner' },
      { name: 'European Plan', code: 'EP', description: 'Room Only' },
    ];

    for (const mealPlan of mealPlans) {
      await prisma.mealPlan.upsert({
        where: { code: mealPlan.code },
        update: {},
        create: mealPlan,
      });
    }

    // Seed Room Types
    const roomTypes = [
      { name: 'Standard Room', description: 'Basic room with standard amenities' },
      { name: 'Deluxe Room', description: 'Spacious room with premium amenities' },
      { name: 'Suite', description: 'Luxurious room with separate living area' },
      { name: 'Family Room', description: 'Room suitable for families' },
    ];

    for (const roomType of roomTypes) {
      await prisma.roomType.upsert({
        where: { name: roomType.name },
        update: {},
        create: roomType,
      });
    }

    // Seed Occupancy Types
    const occupancyTypes = [
      { name: 'Single', description: 'Single occupancy', maxPersons: 1 },
      { name: 'Double', description: 'Double occupancy', maxPersons: 2 },
      { name: 'Triple', description: 'Triple occupancy', maxPersons: 3 },
      { name: 'Quad', description: 'Quadruple occupancy', maxPersons: 4 },
    ];

    for (const occupancyType of occupancyTypes) {
      await prisma.occupancyType.upsert({
        where: { name: occupancyType.name },
        update: {},
        create: occupancyType,
      });
    }    // Seed Vehicle Types
    const vehicleTypes = [
      { name: 'Sedan', description: 'Comfortable car for up to 4 passengers' },
      { name: 'SUV', description: 'Spacious vehicle for up to 7 passengers' },
      { name: 'Tempo Traveller', description: 'Mini-bus for up to 12 passengers' },
      { name: 'Bus', description: 'Large bus for group travel' },
    ];

    for (const vehicleType of vehicleTypes) {
      await prisma.vehicleType.upsert({
        where: { name: vehicleType.name },
        update: {},
        create: vehicleType,
      });
    }

    console.log('Configuration data seeded successfully!');
  } catch (error) {
    console.error('Error seeding configuration data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedConfigData();
