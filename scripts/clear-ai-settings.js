
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local', override: true });
const prisma = new PrismaClient();

async function main() {
    console.log("Clearing systemInstruction from AI Settings...");

    // Update all records to have null/empty systemInstruction so they use the code default
    const result = await prisma.aiSettings.updateMany({
        data: {
            systemInstruction: "" // Empty string to trigger fallback or clean state
        }
    });

    console.log(`Updated ${result.count} records.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
