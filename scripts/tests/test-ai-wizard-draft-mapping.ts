/**
 * Test AI Wizard Draft Data Mapping
 *
 * Uses the shared mapAiActivitiesForWebForm helper (same as web forms).
 * Run: npx ts-node --transpile-only --compiler-options "{\"module\":\"commonjs\",\"moduleResolution\":\"node\"}" scripts/tests/test-ai-wizard-draft-mapping.ts
 */

import { mapAiActivitiesForWebForm } from "../../src/lib/ai/map-ai-activities";

console.log("🧪 Testing AI Wizard Draft Data Mapping\n");

const aiGeneratedData = {
  tourPackageName: "Magical Bali Escape",
  tourCategory: "International",
  tourPackageType: "Honeymoon",
  numDaysNight: "5 Nights / 6 Days",
  transport: "Private Car",
  pickup_location: "Denpasar Airport",
  drop_location: "Denpasar Airport",
  highlights: ["Ubud Rice Terraces", "Beach Resorts", "Temple Tours"],
  customerName: "John Doe",
  tourStartsFrom: "2024-03-15",
  numAdults: 2,
  numChildren: 1,
  itineraries: [
    {
      dayNumber: 1,
      itineraryTitle: "Arrival at Bali",
      itineraryDescription: "Arrive at Denpasar Airport and transfer to Ubud hotel.",
      mealsIncluded: "Dinner",
      suggestedHotel: "Ubud Palace Resort",
      activities: [
        {
          activityTitle: "Airport transfer",
          activityDescription:
            "Arrival at Denpasar Airport and transfer to Ubud hotel.",
        },
        {
          activityTitle: "Rice Terraces",
          activityDescription: "Visit Tegalalang Rice Terraces and enjoy the scenery.",
        },
        {
          activityTitle: "Tirta Empul",
          activityDescription: "Explore Tirta Empul Temple and witness the holy spring.",
        },
      ],
    },
    {
      dayNumber: 2,
      itineraryTitle: "Beach Day at Seminyak",
      itineraryDescription: "Relax on the beautiful beaches of Seminyak.",
      mealsIncluded: "Breakfast, Lunch",
      suggestedHotel: "Seminyak Beach Resort",
      activities: [
        {
          activityTitle: "Beach yoga",
          activityDescription: "Morning beach yoga session.",
        },
        {
          activityTitle: "Water sports",
          activityDescription: "Water sports activities.",
        },
      ],
    },
  ],
};

function mapAIDataToFormValues(data: typeof aiGeneratedData, locationId = "location123") {
  return {
    tourPackageQueryName: data.tourPackageName || "",
    customerName: data.customerName || "",
    tourCategory: data.tourCategory || "Domestic",
    numDaysNight: data.numDaysNight || "",
    transport: data.transport || "",
    pickup_location: data.pickup_location || "",
    drop_location: data.drop_location || "",
    locationId,
    numAdults: String(data.numAdults || ""),
    numChild5to12: String(data.numChildren || ""),
    tourStartsFrom: data.tourStartsFrom ? new Date(data.tourStartsFrom) : undefined,
    itineraries: Array.isArray(data.itineraries)
      ? data.itineraries.map((day) => ({
          dayNumber: day.dayNumber,
          itineraryTitle: day.itineraryTitle || "",
          itineraryDescription: day.itineraryDescription || "",
          mealsIncluded: day.mealsIncluded ? day.mealsIncluded.split(",") : [],
          activities: mapAiActivitiesForWebForm(day.activities),
          itineraryImages: [],
          hotelId: "",
          locationId,
          roomAllocations: [],
          transportDetails: [],
        }))
      : [],
  };
}

let failed = 0;
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`);
  } else {
    console.error(`  ❌ ${message}`);
    failed += 1;
  }
}

const result = mapAIDataToFormValues(aiGeneratedData);

console.log("✅ Basic Fields Mapping:");
console.log(`  Tour Name: ${result.tourPackageQueryName}`);
console.log(`  Customer: ${result.customerName}`);
console.log(`  Category: ${result.tourCategory}`);
console.log(`  Duration: ${result.numDaysNight}`);
console.log(`  Transport: ${result.transport}`);
console.log(`  Adults: ${result.numAdults}`);
console.log(`  Children: ${result.numChild5to12}`);
console.log("");

console.log("✅ Itineraries Mapping:");
console.log(`  Number of days: ${result.itineraries.length}`);
result.itineraries.forEach((itinerary) => {
  console.log(`\n  Day ${itinerary.dayNumber}:`);
  console.log(`    Title: ${itinerary.itineraryTitle}`);
  console.log(`    Activities count: ${itinerary.activities.length}`);
  itinerary.activities.forEach((activity, i) => {
    console.log(`    [${i + 1}] ${activity.activityTitle}: ${activity.activityDescription}`);
  });
});

assert(result.itineraries[0]?.activities.length === 3, "day 1 has 3 discrete activities");
assert(result.itineraries[1]?.activities.length === 2, "day 2 has 2 discrete activities");

console.log("\n🔒 Security Test: XSS Prevention");
const maliciousData = {
  ...aiGeneratedData,
  itineraries: [
    {
      dayNumber: 1,
      itineraryTitle: "Test Day",
      itineraryDescription: "Test description",
      mealsIncluded: "Breakfast",
      suggestedHotel: "",
      activities: [
        {
          activityTitle: "",
          activityDescription:
            "i. Normal activity\nii. <script>alert('XSS')</script>\niii. Another activity",
        },
      ],
    },
  ],
};

const securityResult = mapAIDataToFormValues(maliciousData);
const secureActivity =
  securityResult.itineraries[0]?.activities[0]?.activityDescription ?? "";
const isSecure =
  secureActivity.includes("&lt;script&gt;") && !secureActivity.includes("<script>");
assert(isSecure, "HTML properly escaped");

console.log("\n🐛 Regression: titled activities with empty descriptions");
const titledEmptyDesc = mapAiActivitiesForWebForm([
  { activityTitle: "Airport pickup", activityDescription: "" },
  { activityTitle: "City walk", activityDescription: "" },
]);
assert(titledEmptyDesc.length === 2, "must not return [] for titled empty-description activities");
assert(
  titledEmptyDesc[0]?.activityTitle === "Airport pickup",
  "first titled activity preserved"
);

if (failed > 0) {
  console.error(`\n❌ ${failed} assertion(s) failed`);
  process.exit(1);
}

console.log("\n🎉 Test Complete!");
