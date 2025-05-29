const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define default policy data
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

/**
 * Parses a policy field that could be HTML text, array, or JSON string into an array format
 * @param {any} field - The policy field to parse
 * @param {string[]} defaultValue - Default value if parsing fails
 * @returns {string[]} - Parsed array of policy items
 */
function parseTextToArray(field, defaultValue) {
  // If it's already an array, return it
  if (Array.isArray(field)) {
    return field;
  }
  
  // If it's null or undefined, return default
  if (!field) {
    return defaultValue;
  }
  
  // Try parsing as JSON (for fields that were already converted)
  try {
    const parsed = JSON.parse(field);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [parsed.toString()];
  } catch (e) {
    // Not valid JSON, try to convert HTML to array items
  }

  // Handle HTML content by splitting on common separators
  const htmlString = field.toString();
  
  // Common patterns for list items in the HTML
  const patterns = [
    /(<br\s*\/?>|\n)+/g, // Line breaks
    /<li>(.*?)<\/li>/g,  // List items
    /✔\s+(.*?)(?=✔|$)/g, // Checkmark bullet points
    /➤\s+(.*?)(?=➤|$)/g, // Triangle bullet points
    /∎\s+(.*?)(?=∎|$)/g, // Square bullet points
    /-\s+(.*?)(?=-|$)/g  // Dash bullet points
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const matches = Array.from(htmlString.matchAll(pattern));
    if (matches.length > 0) {
      return matches.map(match => {
        // Clean up the extracted item
        let item = match[1] || match[0];
        // Remove HTML tags
        item = item.replace(/<[^>]*>?/gm, '');
        // Trim whitespace
        item = item.trim();
        // Add back the bullet point for consistency
        if (pattern.toString().includes('✔')) {
          item = '✔ ' + item;
        } else if (pattern.toString().includes('➤')) {
          item = '➤ ' + item;
        } else if (pattern.toString().includes('∎')) {
          item = '∎ ' + item;
        }
        return item;
      }).filter(item => item.length > 0);
    }
  }
  
  // If no patterns matched, split by lines and clean up
  const lines = htmlString.split(/(<br\s*\/?>|\n)+/)
    .map(line => line.replace(/<[^>]*>?/gm, '').trim())
    .filter(line => line.length > 0);
  
  return lines.length > 0 ? lines : defaultValue;
}

// Main function to update all tour package queries with policy data
async function seedTourPackageQueryPolicies() {
  try {
    // Get all tour package queries
    const queries = await prisma.tourPackageQuery.findMany();
    console.log(`Found ${queries.length} tour package queries to update`);
    
    // Update each tour package query with policy data
    for (const query of queries) {
      console.log(`Updating policies for tour package query: ${query.tourPackageQueryName} (${query.id})`);
      
      // Get location-specific policies if available
      let locationPolicies = { ...DEFAULT_POLICIES };
      
      if (query.locationId) {
        const location = await prisma.location.findUnique({
          where: { id: query.locationId }
        });
        
        if (location) {
          // Override default policies with location policies if they exist
          if (location.inclusions) locationPolicies.INCLUSIONS = parseTextToArray(location.inclusions, DEFAULT_POLICIES.INCLUSIONS);
          if (location.exclusions) locationPolicies.EXCLUSIONS = parseTextToArray(location.exclusions, DEFAULT_POLICIES.EXCLUSIONS);
          if (location.kitchenGroupPolicy) locationPolicies.KITCHEN_GROUP_POLICY = parseTextToArray(location.kitchenGroupPolicy, DEFAULT_POLICIES.KITCHEN_GROUP_POLICY);
          if (location.importantNotes) locationPolicies.IMPORTANT_NOTES = parseTextToArray(location.importantNotes, DEFAULT_POLICIES.IMPORTANT_NOTES);
          if (location.paymentPolicy) locationPolicies.PAYMENT_POLICY = parseTextToArray(location.paymentPolicy, DEFAULT_POLICIES.PAYMENT_POLICY);
          if (location.usefulTip) locationPolicies.USEFUL_TIPS = parseTextToArray(location.usefulTip, DEFAULT_POLICIES.USEFUL_TIPS);
          if (location.cancellationPolicy) locationPolicies.CANCELLATION_POLICY = parseTextToArray(location.cancellationPolicy, DEFAULT_POLICIES.CANCELLATION_POLICY);
          if (location.airlineCancellationPolicy) locationPolicies.AIRLINE_CANCELLATION_POLICY = parseTextToArray(location.airlineCancellationPolicy, DEFAULT_POLICIES.AIRLINE_CANCELLATION_POLICY);
          if (location.termsconditions) locationPolicies.TERMS_AND_CONDITIONS = parseTextToArray(location.termsconditions, DEFAULT_POLICIES.TERMS_AND_CONDITIONS);
        }
      }
        // Also check if there's a template tour package
      if (query.tourPackageTemplate) {
        const templatePackage = await prisma.tourPackage.findUnique({
          where: { id: query.tourPackageTemplate }
        });
        
        if (templatePackage) {
          // Override with template package policies if they exist
          if (templatePackage.inclusions) locationPolicies.INCLUSIONS = parseTextToArray(templatePackage.inclusions, locationPolicies.INCLUSIONS);
          if (templatePackage.exclusions) locationPolicies.EXCLUSIONS = parseTextToArray(templatePackage.exclusions, locationPolicies.EXCLUSIONS);
          if (templatePackage.kitchenGroupPolicy) locationPolicies.KITCHEN_GROUP_POLICY = parseTextToArray(templatePackage.kitchenGroupPolicy, locationPolicies.KITCHEN_GROUP_POLICY);
          if (templatePackage.importantNotes) locationPolicies.IMPORTANT_NOTES = parseTextToArray(templatePackage.importantNotes, locationPolicies.IMPORTANT_NOTES);
          if (templatePackage.paymentPolicy) locationPolicies.PAYMENT_POLICY = parseTextToArray(templatePackage.paymentPolicy, locationPolicies.PAYMENT_POLICY);
          if (templatePackage.usefulTip) locationPolicies.USEFUL_TIPS = parseTextToArray(templatePackage.usefulTip, locationPolicies.USEFUL_TIPS);
          if (templatePackage.cancellationPolicy) locationPolicies.CANCELLATION_POLICY = parseTextToArray(templatePackage.cancellationPolicy, locationPolicies.CANCELLATION_POLICY);
          if (templatePackage.airlineCancellationPolicy) locationPolicies.AIRLINE_CANCELLATION_POLICY = parseTextToArray(templatePackage.airlineCancellationPolicy, locationPolicies.AIRLINE_CANCELLATION_POLICY);
          if (templatePackage.termsconditions) locationPolicies.TERMS_AND_CONDITIONS = parseTextToArray(templatePackage.termsconditions, locationPolicies.TERMS_AND_CONDITIONS);
        }
      }
        // Process existing policies if they exist or use defaults
      const inclusions = parseTextToArray(query.inclusions, locationPolicies.INCLUSIONS);
      const exclusions = parseTextToArray(query.exclusions, locationPolicies.EXCLUSIONS);
      const kitchenGroupPolicy = parseTextToArray(query.kitchenGroupPolicy, locationPolicies.KITCHEN_GROUP_POLICY);
      const importantNotes = parseTextToArray(query.importantNotes, locationPolicies.IMPORTANT_NOTES);
      const paymentPolicy = parseTextToArray(query.paymentPolicy, locationPolicies.PAYMENT_POLICY);
      const usefulTip = parseTextToArray(query.usefulTip, locationPolicies.USEFUL_TIPS);
      const cancellationPolicy = parseTextToArray(query.cancellationPolicy, locationPolicies.CANCELLATION_POLICY);
      const airlineCancellationPolicy = parseTextToArray(query.airlineCancellationPolicy, locationPolicies.AIRLINE_CANCELLATION_POLICY);
      const termsconditions = parseTextToArray(query.termsconditions, locationPolicies.TERMS_AND_CONDITIONS);
      
      // Update tour package query with new policy data
      await prisma.tourPackageQuery.update({
        where: { id: query.id },
        data: {
          inclusions: JSON.stringify(inclusions),
          exclusions: JSON.stringify(exclusions),
          kitchenGroupPolicy: JSON.stringify(kitchenGroupPolicy),
          importantNotes: JSON.stringify(importantNotes),
          paymentPolicy: JSON.stringify(paymentPolicy),
          usefulTip: JSON.stringify(usefulTip),
          cancellationPolicy: JSON.stringify(cancellationPolicy),
          airlineCancellationPolicy: JSON.stringify(airlineCancellationPolicy),
          termsconditions: JSON.stringify(termsconditions),
        }
      });
    }
    
    console.log('Policy data successfully updated for all tour package queries!');
  } catch (error) {
    console.error('Error seeding tour package query policy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedTourPackageQueryPolicies()
  .then(() => console.log('Done updating tour package queries!'))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
