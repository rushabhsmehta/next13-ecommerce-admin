const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log('Script started...');

// Define the default pricing section structure
const DEFAULT_PRICING_SECTION = [
  {
    name: "Per Person Cost",
    price: "",
    description: ""
  },
  {
    name: "Per Couple Cost",
    price: "",
    description: ""
  },
  {
    name: "Per Person With Extra Bed/Mattress",
    price: "",
    description: ""
  },
  {
    name: "Child with Mattress (5 to 11)",
    price: "",
    description: ""
  },
  {
    name: "Child without Mattress (5 to 11)",
    price: "",
    description: ""
  },
  {
    name: "Child below 5 years (With Seat - Parents Sharing Bed)",
    price: "",
    description: ""
  },
  {
    name: "Child below 5 years Without Seat (Parents Sharing Bed)",
    price: "",
    description: "Complimentary"
  },
  {
    name: "Air Fare",
    price: "",
    description: ""
  }
];

// Helper function to check if existing pricingSection has valid content
const hasValidPricingSection = (pricingSection) => {
  if (!pricingSection) {
    console.log('No pricing section found');
    return false;
  }
  
  // If it's already a string, try to parse it
  if (typeof pricingSection === 'string') {
    try {
      const parsed = JSON.parse(pricingSection);
      // Check if it's a non-empty array with the expected structure
      const isValid = Array.isArray(parsed) && parsed.length > 0;
      console.log(`Parsed pricing section is ${isValid ? 'valid' : 'invalid'}`);
      return isValid;
    } catch (e) {
      console.log(`Error parsing pricing section: ${e.message}`);
      return false;
    }
  }
  
  // If it's an array, check if it has content
  const isValid = Array.isArray(pricingSection) && pricingSection.length > 0;
  console.log(`Array pricing section is ${isValid ? 'valid' : 'invalid'}`);
  return isValid;
};

// Main function to update pricing sections
async function updatePricingSections() {
  try {
    console.log('Starting database update...');
    
    
    // 1. Update TourPackage records
    console.log('Updating TourPackage records...');
    let tourPackages;
    try {
      tourPackages = await prisma.tourPackage.findMany();
      console.log(`Found ${tourPackages.length} tour packages`);
    } catch (fetchError) {
      console.error('Error fetching tour packages:', fetchError);
      return;
    }
    
    let tourPackageUpdateCount = 0;
    
    for (const tp of tourPackages) {
      console.log(`Checking tour package ${tp.id}...`);
      
      if (!hasValidPricingSection(tp.pricingSection)) {
        console.log(`Updating tour package ${tp.id} with default pricing section...`);
        try {
          await prisma.tourPackage.update({
            where: { id: tp.id },
            data: {
              pricingSection: JSON.stringify(DEFAULT_PRICING_SECTION)
            }
          });
          tourPackageUpdateCount++;
          console.log(`Successfully updated TourPackage: ${tp.id}`);
        } catch (updateError) {
          console.error(`Error updating tour package ${tp.id}:`, updateError);
        }
      } else {
        console.log(`Tour package ${tp.id} already has valid pricing section`);
      }
    }
    
    // 2. Update TourPackageQuery records
    
    console.log(`Update complete!`);
    console.log(`Updated ${tourPackageUpdateCount} tour packages.`);
    
  } catch (error) {
    console.error('Error in updatePricingSections function:', error);
  } finally {
    try {
      await prisma.$disconnect();
      console.log('Disconnected from database');
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
  }
}

// Execute the update function
console.log('About to call updatePricingSections...');
updatePricingSections()
  .then(() => {
    console.log('Script completed successfully.');
    process.exit(0);  // Add explicit exit
  })
  .catch(error => {
    console.error('Script failed with error:', error);
    process.exit(1);  // Add explicit exit with error code
  });
