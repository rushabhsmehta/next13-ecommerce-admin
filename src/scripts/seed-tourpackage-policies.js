// Import the Prisma client
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

// Define default pricing section structure
const DEFAULT_PRICING_SECTION = {
  pricePerAdult: 0,
  pricePerChildWithBed: 0, 
  pricePerChildNoBed: 0,
  pricePerChildWithSeat: 0,
  currency: "INR",
  taxIncluded: true,
  discountAmount: 0,
  totalPrice: 0
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
    
    // Handle case where JSON is a string with comma-separated values
    // This is the key fix for policies appearing as single line in UI
    if (typeof parsed === 'string' && parsed.includes(',')) {
      console.log('Found comma-separated string in JSON:', parsed);
      return parsed.split(',').map(item => item.trim());
    }
    
    if (Array.isArray(parsed)) {
      // Check if we have a single element with commas (common issue)
      if (parsed.length === 1 && typeof parsed[0] === 'string' && parsed[0].includes(',')) {
        console.log('Found array with single comma-separated string:', parsed[0]);
        return parsed[0].split(',').map(item => item.trim());
      }
      return parsed;
    }
    
    return [parsed.toString()];
  } catch (e) {
    // Not valid JSON, continue with other parsing methods
    console.log('JSON parse error:', e.message);
  }

  // Handle HTML content by splitting on common separators
  const htmlString = field.toString();
  
  // Check for HTML list patterns first
  const patterns = [
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
  
  // Try to split by line breaks rather than commas
  const lineBreakPatterns = [
    /\n+/g,           // Standard line breaks
    /<br\s*\/?>/gi,   // HTML line breaks
    /\s*\.\s*(?=[A-Z])/ // Period followed by capital letter (likely new sentence)
  ];
  
  for (const pattern of lineBreakPatterns) {
    if (htmlString.match(pattern)) {
      const lines = htmlString.split(pattern)
        .map(line => line.replace(/<[^>]*>?/gm, '').trim())
        .filter(line => line.length > 0);
      
      if (lines.length > 1) {
        return lines;
      }
    }
  }
  
  // If the string contains periods that might indicate separate items
  if (htmlString.includes('.') && !htmlString.match(/[A-Z]\./g)) {
    const periodSplit = htmlString.split('.')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    if (periodSplit.length > 1) {
      return periodSplit;
    }
  }
  
  // As a last resort, only use comma splitting if it appears to be a list
  // (contains multiple commas and no long phrases between them)
  const commaCount = (htmlString.match(/,/g) || []).length;
  if (commaCount > 1) {
    const avgSegmentLength = htmlString.length / (commaCount + 1);
    // If average segment is short, it's likely a list
    if (avgSegmentLength < 15) {
      return htmlString.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
  }
  
  // If no patterns matched, treat as a single item
  return [htmlString];
}

/**
 * Creates a new pricing section object from tour package data, overwriting any existing data
 * @param {Object} tourPackage - The tour package with pricing information
 * @returns {Object} - Structured pricing section object
 */
function createPricingSection(tourPackage) {
  // Create fresh pricing section with default values
  const pricingSection = { ...DEFAULT_PRICING_SECTION };
  
  // Extract values from individual fields
  if (tourPackage.pricePerAdult) {
    pricingSection.pricePerAdult = parseFloat(tourPackage.pricePerAdult) || 0;
  }
  
  if (tourPackage.pricePerChildOrExtraBed) {
    pricingSection.pricePerChildWithBed = parseFloat(tourPackage.pricePerChildOrExtraBed) || 0;
  }
  
  if (tourPackage.pricePerChild5to12YearsNoBed) {
    pricingSection.pricePerChildNoBed = parseFloat(tourPackage.pricePerChild5to12YearsNoBed) || 0;
  }
  
  if (tourPackage.pricePerChildwithSeatBelow5Years) {
    pricingSection.pricePerChildWithSeat = parseFloat(tourPackage.pricePerChildwithSeatBelow5Years) || 0;
  }
  
  // Calculate total price if individual prices are available
  if (tourPackage.totalPrice) {
    pricingSection.totalPrice = parseFloat(tourPackage.totalPrice) || 0;
  } else {
    // If no explicit total price, calculate from components
    pricingSection.totalPrice = pricingSection.pricePerAdult;
  }
  
  return pricingSection;
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
          if(location.kitchenGroupPolicy) locationPolicies.KITCHEN_GROUP_POLICY = parseTextToArray(location.kitchenGroupPolicy, DEFAULT_POLICIES.KITCHEN_GROUP_POLICY);
          if (location.importantNotes) locationPolicies.IMPORTANT_NOTES = parseTextToArray(location.importantNotes, DEFAULT_POLICIES.IMPORTANT_NOTES);
          if (location.paymentPolicy) locationPolicies.PAYMENT_POLICY = parseTextToArray(location.paymentPolicy, DEFAULT_POLICIES.PAYMENT_POLICY);
          if (location.usefulTip) locationPolicies.USEFUL_TIPS = parseTextToArray(location.usefulTip, DEFAULT_POLICIES.USEFUL_TIPS);
          if (location.cancellationPolicy) locationPolicies.CANCELLATION_POLICY = parseTextToArray(location.cancellationPolicy, DEFAULT_POLICIES.CANCELLATION_POLICY);
          if (location.airlineCancellationPolicy) locationPolicies.AIRLINE_CANCELLATION_POLICY = parseTextToArray(location.airlineCancellationPolicy, DEFAULT_POLICIES.AIRLINE_CANCELLATION_POLICY);
          if (location.termsconditions) locationPolicies.TERMS_AND_CONDITIONS = parseTextToArray(location.termsconditions, DEFAULT_POLICIES.TERMS_AND_CONDITIONS);
        }
      }
        // Process existing policies if they exist or use defaults
      console.log(`Processing policies for tour package: ${tourPackage.id}`);
      
      // Debug log for a single policy to see its format
      console.log(`Example inclusions before processing:`, tourPackage.inclusions);
      
      const inclusions = parseTextToArray(tourPackage.inclusions, locationPolicies.INCLUSIONS);
      const exclusions = parseTextToArray(tourPackage.exclusions, locationPolicies.EXCLUSIONS);
      const kitchenGroupPolicy = parseTextToArray(tourPackage.kitchenGroupPolicy, locationPolicies.KITCHEN_GROUP_POLICY);
      const importantNotes = parseTextToArray(tourPackage.importantNotes, locationPolicies.IMPORTANT_NOTES);
      const paymentPolicy = parseTextToArray(tourPackage.paymentPolicy, locationPolicies.PAYMENT_POLICY);
      const usefulTip = parseTextToArray(tourPackage.usefulTip, locationPolicies.USEFUL_TIPS);
      const cancellationPolicy = parseTextToArray(tourPackage.cancellationPolicy, locationPolicies.CANCELLATION_POLICY);
      const airlineCancellationPolicy = parseTextToArray(tourPackage.airlineCancellationPolicy, locationPolicies.AIRLINE_CANCELLATION_POLICY);
      const termsconditions = parseTextToArray(tourPackage.termsconditions, locationPolicies.TERMS_AND_CONDITIONS);
      
      // Debug log the processed inclusions
      console.log(`Example inclusions after processing:`, inclusions);
      
      // Create brand new pricing section (overwrite existing)
      const pricingSection = createPricingSection(tourPackage);
      console.log(`Created pricing section for ${tourPackage.id}:`, pricingSection);      // Update tour package with new policy data and pricing section
      // JSON.stringify the arrays to ensure proper formatting in the database
      
      // Log one example of the stringified data for debugging
      console.log(`Example of properly formatted inclusions before storing:`, JSON.stringify(inclusions));
      
      const updateData = {
        inclusions: JSON.stringify(inclusions),
        exclusions: JSON.stringify(exclusions),
        kitchenGroupPolicy: JSON.stringify(kitchenGroupPolicy),
        importantNotes: JSON.stringify(importantNotes),
        paymentPolicy: JSON.stringify(paymentPolicy),
        usefulTip: JSON.stringify(usefulTip),
        cancellationPolicy: JSON.stringify(cancellationPolicy),
        airlineCancellationPolicy: JSON.stringify(airlineCancellationPolicy),
        termsconditions: JSON.stringify(termsconditions),
        pricingSection: pricingSection, // pricingSection is already an object, so it's correctly stored as JSON
      };
      
      await prisma.tourPackage.update({
        where: { id: tourPackage.id },
        data: updateData
      });
      
      console.log(`Updated tour package ${tourPackage.id} with properly formatted policy data`);
    }
    
    console.log('Policy data and pricing sections successfully updated for all tour packages!');
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
