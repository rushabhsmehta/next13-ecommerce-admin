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

// Main function to update all tour packages with policy data
async function seedTourPackagePolicies() {
  try {
    // Get all tour packages
    const tourPackages = await prisma.tourPackage.findMany();
    console.log(`Found ${tourPackages.length} tour packages to update`);
    
    // Update each tour package with policy data
    for (const tourPackage of tourPackages) {
      console.log(`Updating policies for tour package: ${tourPackage.tourPackageName} (${tourPackage.id})`);
      
      // Get location-specific policies if available
      let locationPolicies = { ...DEFAULT_POLICIES };
      
      if (tourPackage.locationId) {
        const location = await prisma.location.findUnique({
          where: { id: tourPackage.locationId }
        });
        
        if (location) {
          // Override default policies with location policies if they exist
          if (location.inclusions) locationPolicies.INCLUSIONS = parseTextToArray(location.inclusions, DEFAULT_POLICIES.INCLUSIONS);
          if (location.exclusions) locationPolicies.EXCLUSIONS = parseTextToArray(location.exclusions, DEFAULT_POLICIES.EXCLUSIONS);
          if (location.importantNotes) locationPolicies.IMPORTANT_NOTES = parseTextToArray(location.importantNotes, DEFAULT_POLICIES.IMPORTANT_NOTES);
          if (location.paymentPolicy) locationPolicies.PAYMENT_POLICY = parseTextToArray(location.paymentPolicy, DEFAULT_POLICIES.PAYMENT_POLICY);
          if (location.usefulTip) locationPolicies.USEFUL_TIPS = parseTextToArray(location.usefulTip, DEFAULT_POLICIES.USEFUL_TIPS);
          if (location.cancellationPolicy) locationPolicies.CANCELLATION_POLICY = parseTextToArray(location.cancellationPolicy, DEFAULT_POLICIES.CANCELLATION_POLICY);
          if (location.airlineCancellationPolicy) locationPolicies.AIRLINE_CANCELLATION_POLICY = parseTextToArray(location.airlineCancellationPolicy, DEFAULT_POLICIES.AIRLINE_CANCELLATION_POLICY);
          if (location.termsconditions) locationPolicies.TERMS_AND_CONDITIONS = parseTextToArray(location.termsconditions, DEFAULT_POLICIES.TERMS_AND_CONDITIONS);
        }
      }
      
      // Process existing policies if they exist or use defaults
      const inclusions = parseTextToArray(tourPackage.inclusions, locationPolicies.INCLUSIONS);
      const exclusions = parseTextToArray(tourPackage.exclusions, locationPolicies.EXCLUSIONS);
      const importantNotes = parseTextToArray(tourPackage.importantNotes, locationPolicies.IMPORTANT_NOTES);
      const paymentPolicy = parseTextToArray(tourPackage.paymentPolicy, locationPolicies.PAYMENT_POLICY);
      const usefulTip = parseTextToArray(tourPackage.usefulTip, locationPolicies.USEFUL_TIPS);
      const cancellationPolicy = parseTextToArray(tourPackage.cancellationPolicy, locationPolicies.CANCELLATION_POLICY);
      const airlineCancellationPolicy = parseTextToArray(tourPackage.airlineCancellationPolicy, locationPolicies.AIRLINE_CANCELLATION_POLICY);
      const termsconditions = parseTextToArray(tourPackage.termsconditions, locationPolicies.TERMS_AND_CONDITIONS);
      
      // Update tour package with new policy data
      await prisma.tourPackage.update({
        where: { id: tourPackage.id },
        data: {
          inclusions: JSON.stringify(inclusions),
          exclusions: JSON.stringify(exclusions),
          importantNotes: JSON.stringify(importantNotes),
          paymentPolicy: JSON.stringify(paymentPolicy),
          usefulTip: JSON.stringify(usefulTip),
          cancellationPolicy: JSON.stringify(cancellationPolicy),
          airlineCancellationPolicy: JSON.stringify(airlineCancellationPolicy),
          termsconditions: JSON.stringify(termsconditions),
        }
      });
    }
    
    console.log('Policy data successfully updated for all tour packages!');
  } catch (error) {
    console.error('Error seeding tour package policy data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding function
seedTourPackagePolicies()
  .then(() => console.log('Done updating tour packages!'))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
