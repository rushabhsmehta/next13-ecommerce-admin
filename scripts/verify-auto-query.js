
const dotenv = require('dotenv');
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Load env
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.error("No OPENAI_API_KEY found.");
        process.exit(1);
    }

    // Load system prompt from file (manual extraction to ensure we test what's on disk)
    const instructionsPath = path.join(__dirname, '../src/lib/ai/tour-package-instructions.ts');
    const fileContent = fs.readFileSync(instructionsPath, 'utf8');
    const match = fileContent.match(/export const AUTO_QUERY_SYSTEM_PROMPT = String.raw`([\s\S]*?)`;/);
    const systemPrompt = match ? match[1] : "";

    if (!systemPrompt) {
        console.error("Could not load AUTO_QUERY_SYSTEM_PROMPT. Check regex.");
        process.exit(1);
    }

    const openai = new OpenAI({ apiKey });

    console.log("1. Generating Query Blueprint via AI...");
    const prompt = "Plan a 4 day Goa trip for Amit Family (2 Adults, 1 Child) starting Dec 25th. Budget 50k.";

    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
        ],
        temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    // Extract JSON
    const jsonMatch = content.match(/```json\r?\n([\s\S]*?)\r?\n```/);
    if (!jsonMatch) {
        console.error("No JSON found in response");
        console.log(content);
        process.exit(1);
    }

    const data = JSON.parse(jsonMatch[1]);
    console.log("AI Generated:", data.tourPackageQueryName);
    console.log("Customer:", data.customerName, "| Starts:", data.tourStartsFrom);

    // 2. Save to DB (Replicating create-query route logic)
    console.log("2. Saving to database...");

    const location = await prisma.location.findFirst({ where: { isActive: true } });
    if (!location) throw new Error("No location found");

    // Parse Date
    let startDate;
    if (data.tourStartsFrom) {
        startDate = new Date(data.tourStartsFrom);
        if (isNaN(startDate.getTime())) startDate = undefined;
    }

    const query = await prisma.tourPackageQuery.create({
        data: {
            locationId: location.id,
            tourPackageQueryName: data.tourPackageQueryName,
            customerName: data.customerName,
            customerNumber: data.customerNumber,
            tourCategory: data.tourCategory || "Domestic",
            numDaysNight: data.numDaysNight,
            price: String(data.price || "0"),
            totalPrice: String(data.price || "0"),
            transport: data.transport,
            pickup_location: data.pickup_location,
            drop_location: data.drop_location,
            tourStartsFrom: startDate,
            numAdults: String(data.numAdults || "0"),
            numChild5to12: String(data.numChild5to12 || "0"),
            numChild0to5: String(data.numChild0to5 || "0"),
            isArchived: false,
            isFeatured: false,
            assignedTo: "Verify Script",
            // Itineraries
            itineraries: {
                create: data.itineraries.map(day => ({
                    locationId: location.id,
                    dayNumber: day.dayNumber,
                    itineraryTitle: day.itineraryTitle,
                    itineraryDescription: day.itineraryDescription,
                    mealsIncluded: day.mealsIncluded,
                    // Activity Logic
                    activities: day.activities && Array.isArray(day.activities) && day.activities.length > 0 ? {
                        create: [{
                            activityTitle: "Day Highlights",
                            activityDescription: day.activities.map((act, i) =>
                                `${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][i] || (i + 1) + '.'}. ${act}`
                            ).join('<br/>'),
                            locationId: location.id
                        }]
                    } : undefined
                }))
            }
        },
        include: {
            itineraries: {
                include: { activities: true }
            }
        }
    });

    console.log(`\nSUCCESS! Query created with ID: ${query.id}`);
    console.log(`Tour Starts: ${query.tourStartsFrom}`);
    const firstDay = query.itineraries[0];
    if (firstDay && firstDay.activities.length > 0) {
        console.log(`Verified Activity Logic: ${firstDay.activities[0].activityTitle}`);
        console.log(`Desc Sample: ${firstDay.activities[0].activityDescription.substring(0, 50)}...`);
    } else {
        console.error("Refused: No activities created.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
