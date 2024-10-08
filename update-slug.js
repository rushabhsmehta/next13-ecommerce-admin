const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTotalPriceStyling() {
  try {
    // Retrieve all TourPackages
    const tourPackages = await prisma.tourPackage.findMany();

    // Loop through each package and update totalPrice styling
    for (const pkg of tourPackages) {
      let updatedContent = pkg.totalPrice;

      // Add border-right to the relevant <td> elements
      updatedContent = updatedContent.replace(
        /<td([^>]*)>([^<]*)<\/td>/g,
        (match, p1, p2) => {
          if (p2.includes('₹')) {
            return `<td${p1} style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd;">${p2}</td>`;
          } else {
            return `<td${p1} style="padding: 12px 15px; font-size: 13px; color: #555; border-bottom: 1px solid #ddd; border-right: 1px solid #ddd;">${p2}</td>`;
          }
        }
      );

      // Update the tourPackage with the modified content
      await prisma.tourPackage.update({
        where: { id: pkg.id },
        data: { totalPrice: updatedContent },
      });
    }
    console.log('TotalPrice styling updated successfully.');
  } catch (error) {
    console.error('Error updating totalPrice styling:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTotalPriceStyling();