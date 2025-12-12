
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local', override: true });
const prisma = new PrismaClient();

async function main() {
    console.log("Testing Activity Consolidation Logic...");

    // 1. Find a location to attach to
    const location = await prisma.location.findFirst();
    if (!location) {
        console.error("No location found to test with.");
        return;
    }

    // 2. Mock Data mimicking the AI output
    const day = {
        dayNumber: 999, // Test day
        itineraryTitle: "Test Day: Logic Check (Duration: 1hr)",
        itineraryDescription: "Testing the single activity creation logic.",
        mealsIncluded: "None",
        activities: [
            "First verified activity",
            "Second verified activity",
            "Third verified activity"
        ]
    };

    // 3. Execute the EXACT logic from the route
    console.log("Creating Test Package...");
    const packageId = "test-pkg-" + Date.now();

    const tourPackage = await prisma.tourPackage.create({
        data: {
            locationId: location.id,
            tourPackageName: "Activity Logic Test Package",
            slug: packageId,
            itineraries: {
                create: {
                    locationId: location.id,
                    dayNumber: day.dayNumber,
                    itineraryTitle: day.itineraryTitle,
                    itineraryDescription: day.itineraryDescription,
                    mealsIncluded: day.mealsIncluded,
                    // --- TARGET LOGIC START ---
                    activities: day.activities && Array.isArray(day.activities) && day.activities.length > 0 ? {
                        create: [{
                            activityTitle: "Day Highlights",
                            activityDescription: day.activities.map((act, i) =>
                                `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || (i + 1) + '.'}. ${act}`
                            ).join('<br/>'),
                            locationId: location.id
                        }]
                    } : undefined
                    // --- TARGET LOGIC END ---
                }
            }
        },
        include: {
            itineraries: {
                include: {
                    activities: true
                }
            }
        }
    });

    // 4. Verify
    const createdItinerary = tourPackage.itineraries[0];
    const activities = createdItinerary.activities;

    console.log(`\nCreated Itinerary ID: ${createdItinerary.id}`);
    console.log(`Activity Count: ${activities.length} (Expected: 1)`);

    if (activities.length === 1) {
        const act = activities[0];
        console.log(`Activity Title: "${act.activityTitle}" (Expected: "Day Highlights")`);
        console.log(`Activity Description:\n${act.activityDescription}`);

        // Assertions
        const expectedDesc = "I. First verified activity<br/>II. Second verified activity<br/>III. Third verified activity";
        if (act.activityDescription === expectedDesc) {
            console.log("\n✅ SUCCESS: Description format matches perfectly.");
        } else {
            console.error("\n❌ FAILED: Description mismatches.");
            console.log("Expected:", expectedDesc);
        }
    } else {
        console.error("\n❌ FAILED: Incorrect number of activities created.");
    }

    // Cleanup
    console.log("\nCleaning up test data...");
    await prisma.tourPackage.delete({ where: { id: tourPackage.id } });
    console.log("Cleanup done.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
