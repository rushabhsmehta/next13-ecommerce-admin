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
