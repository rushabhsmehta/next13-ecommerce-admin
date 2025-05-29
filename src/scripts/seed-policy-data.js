// Import the Prisma client
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
    "In the Hills, AC Vehicles Will Not Work, So Kindly Do Not Expect An AC Vehicle In The Hills.",
    "Rooms are subject to availability at the time of booking.",
    "Changes may occur in the itinerary due to local conditions, weather, traffic, or operational issues. No compensation will be provided.",
    "In case of unavailability in listed hotels, equivalent alternatives will be arranged.",
    "No refunds for unused nights or early check-outs.",
    "Natural calamities, political unrest, strikes, or other force majeure may affect services. No refunds unless supported by vendors.",
    "Travel may be withheld or canceled due to delayed payments or incomplete documentation.",
    "Sightseeing/transfers may be affected by union/local restrictions; extra charges may apply.",
    "Consult your doctor before travel. We’re not liable for health issues during the trip.",
    "Weather or road conditions in hilly/remote areas may lead to route changes or cancellations without refunds.",
    "Local authorities may impose travel restrictions or diversions; we are not liable for delays or losses due to these."
  ],
  PAYMENT_POLICY: [
    "50% of the total package cost is required at the time of booking confirmation.",
    "Balance 50% must be paid 15 days before arrival.",
    "100% advance required for Air/Rail tickets at the time of booking.",
    "Payments can be made via bank transfer, UPI, or mutually agreed methods.",
    "All payments must be made in INR unless agreed otherwise.",
    "Delay in payment may result in booking cancellations and forfeiture of the advance amount.",
    "GST @5% is applicable on total package cost as per government norms.",
    "If international travel package exceeds ₹7 lakhs/year, TCS @5% applies and is claimable in ITR.",
    "Any tax rate changes by the Government will apply even after booking."
  ],
  USEFUL_TIPS: [
    "For queries regarding cancellations and refunds, please refer to our Cancellation Policy.",
    "Extra charges for A/C if used in hill regions.",
    "Disputes, if any, shall be subject to the exclusive jurisdiction of the courts in Kullu/Manali.",
    "Travel Insurance is highly recommended for cancellations, delays, baggage loss, and medical emergencies."
  ],
  CANCELLATION_POLICY: [
    "30 days or more before arrival: 30% of total package cost will be charged.",
    "15 to 29 days before arrival: 50% of total package cost will be charged.",
    "Less than 15 days before arrival or no-show: No refund applicable.",
    "Refunds, if any, will be processed within 10–15 working days from cancellation request."
  ],
  AIRLINE_CANCELLATION_POLICY: [
    "100% advance payment is required for flight bookings.",
    "Fares are subject to change until ticket issuance.",
    "Cancellations or refunds follow airline or channel partner policies and may include service fees."
  ],
  TERMS_AND_CONDITIONS: [
    "Airline seats and hotel rooms are subject to availability at the time of confirmation.",
    "In case of unavailability in listed hotels, alternative arrangements of similar standard will be made.",
    "There will be no refund for unused services or early check-out.",
    "Any change in tax laws or travel policies post-booking shall apply to the customer."
  ],
  KITCHEN_GROUP_POLICY: [
    "Kitchen services are arranged only if at least 25 persons travel together.",
    "Breakfast and Dinner are provided. Lunch and Hi-Tea are subject to feasibility.",
    "Menu is flexible based on ingredient availability and sourcing.",
    "Kitchen operates until 10:00 PM. Guests should adhere to meal timings.",
    "Final menu decisions rest with the head cook/chef.",
    "Maintain hygiene and discipline in dining/kitchen areas.",
    "Cooking area is restricted to authorized staff only.",
    "Inform dietary needs (e.g., Jain food, allergies) in advance. Fulfillment depends on feasibility.",
    "Guests are requested to avoid food wastage.",
    "In emergency/unforeseen cases, kitchen services may be paused or altered."
  ]
};


// Function to add location-specific policies
function getLocationPolicies(locationLabel) {
  // Base policies (same for all locations)
  const policies = { ...DEFAULT_POLICIES };

  // Customize policies based on location label
  if (locationLabel === 'Himachal Pradesh') {
    policies.IMPORTANT_NOTES.push("Special note for Himachal Pradesh travelers.");
  }

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
      console.log(`Updating policies for location: ${location.label}`);
      
      // Get customized policies based on location label
      const policies = getLocationPolicies(location.label);

      // Update location with new policy data
      await prisma.location.update({
        where: { id: location.id },
        data: {
          inclusions: JSON.stringify(policies.INCLUSIONS),
          exclusions: JSON.stringify(policies.EXCLUSIONS),
          kitchenGroupPolicy: JSON.stringify(policies.KITCHEN_GROUP_POLICY),
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
