const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace non-alphanumeric characters with hyphens
    .replace(/(^-|-$)/g, '');     // Remove leading or trailing hyphens
}

async function updateSlugs() {
  try {
    // Retrieve all TourPackages
    const tourPackages = await prisma.tourPackage.findMany();

    // Loop through each package and update slug
    for (const package of tourPackages) {
      const slug = generateSlug(package.tourPackageName);

      await prisma.tourPackage.update({
        where: { id: package.id },
        data: { slug },
      });

      console.log(`Updated package ${package.id} with slug ${slug}`);
    }
  } catch (error) {
    console.error('Error updating slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSlugs();
