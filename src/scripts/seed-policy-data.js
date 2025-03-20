const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define default policy data for locations
const DEFAULT_POLICIES = {
  INCLUSIONS: [
    "Accommodation in preferred Hotel",
    "Meal As Per Plan",
    "All Transfers & Sightseeing By Private Vehicle",
    "All Toll, Tax, Parking, Driver's Allowance"
  ],
  EXCLUSIONS: [
    "Air Fare / Train Fare",
    "Heater Charges If Applicable",
    "Coolie / Porter Charges",
    "Camera Charges",
    "Donations At Temples",
    "Extended Stay Or Travelling Due To Any Reason",
    "Any Meals Other Than Those Specified In Tour Cost Includes",
    "Expenses Of Personal Nature Such As Tips, Telephone Calls, Laundry, Liquor Etc",
    "Any Other Item Not Specified In 'Tour Cost Includes'"
  ],
  IMPORTANT_NOTES: [
    "Rooms Are Subject To Availability.",
    "Expense Caused By Factors Beyond Our Control Like Delays Of Trains And Flights, Road Blocks, Vehicle Malfunctions, Political Disturbance, Etc.",
    "In The Hills, AC Vehicles Will Not Work, So Kindly Do Not Expect An AC Vehicle In The Hills."
  ],
  PAYMENT_POLICY: [
    "100% Air/Railfare At The Time Of Booking.",
    "50% Advance At The Time Of Booking.",
    "Balance Payment Must Be 20 Days Before Departure."
  ],
  USEFUL_TIPS: [
    "For queries regarding cancellations and refunds, please refer to our Cancellation Policy.",
    "Extra Charges for A/C if running in Hills.",
    "Disputes, if any, shall be subject to the exclusive jurisdiction of the courts in Kullu/ Manali."
  ],
  CANCELLATION_POLICY: [
    "Air/Rail Fare: As Per Airlines/Rail Policy",
    "Land Package:",
    "- Before 30 Days Of Departure 20% Will Be Refundable",
    "- Before 29 To 14 Days Of Departure 10% Will Be Refundable",
    "- Before 14 Days Of Departure No Refund."
  ],
  AIRLINE_CANCELLATION_POLICY: [
    "As per Airline Policy"
  ],
  TERMS_AND_CONDITIONS: [
    "Airline seats and hotel rooms are subject to availability at the time of confirmation.",
    "In case of unavailability in the listed hotels, arrangement for an alternate accommodation will be made in a hotel of similar standard.",
    "There will be no refund for unused nights or early check-out."
  ]
};

// Function to add location-specific policies
function getLocationPolicies(locationName) {
  // Base policies (same for all locations)
  const policies = { ...DEFAULT_POLICIES };
    
  return policies;
}

// Main function to update all locations with policy data
async function seedPolicyData() {
  try {
    // Get all locations
    const locations = await prisma.location.findMany();
    console.log(`Found ${locations.length} locations to update`);
    
    // Update each location with policy data
    for (const location of locations) {
      console.log(`Updating policies for location: ${location.name}`);
      
      // Get customized policies based on location name
      const policies = getLocationPolicies(location.name);
      
      // Update location with new policy data
      await prisma.location.update({
        where: { id: location.id },
        data: {
          inclusions: JSON.stringify(policies.INCLUSIONS),
          exclusions: JSON.stringify(policies.EXCLUSIONS),
          importantNotes: JSON.stringify(policies.IMPORTANT_NOTES),
          paymentPolicy: JSON.stringify(policies.PAYMENT_POLICY),
          usefulTip: JSON.stringify(policies.USEFUL_TIPS),
          cancellationPolicy: JSON.stringify(policies.CANCELLATION_POLICY),
          airlineCancellationPolicy: JSON.stringify(policies.AIRLINE_CANCELLATION_POLICY),
          termsconditions: JSON.stringify(policies.TERMS_AND_CONDITIONS),
        }
      });
    }
    
    console.log('Policy data successfully updated for all locations!');
  } catch (error) {
    console.error('Error seeding policy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedPolicyData()
  .then(() => console.log('Done!'))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
