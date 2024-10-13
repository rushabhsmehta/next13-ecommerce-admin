const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateLocationsToTitleCase() {
  try {
    // Retrieve all locations
    const locations = await prisma.location.findMany();

    // Function to convert a string to Title Case
    const toTitleCase = (str) => {
      return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
      });
    };

    // Loop through each location and update the label to Title Case
    for (const location of locations) {
      const updatedLabel = toTitleCase(location.label);

      // Update the location in the database
      await prisma.location.update({
        where: { id: location.id },
        data: { label: updatedLabel },
      });
    }

    console.log('Location labels updated successfully.');
  } catch (error) {
    console.error('Error updating location labels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateLocationsToTitleCase();