const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No GEMINI_API_KEY found in .env");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // For listing models, we don't need a specific model instance, but the SDK structure 
    // currently doesn't expose listModels directly on the main class in all versions.
    // We can try to use the model manager if available or just check known models.
    // Actually, allow's try to infer from a simple generation attempts or just print helpful info.
    // Newer SDKs might support checking models differently.

    // Checking documentation approach:
    // There isn't a direct "listModels" helper in the high-level node SDK easily accessible 
    // without digging into the response of a failed call usually.
    // However, I will try to use the `gemini-pro` model which is the safe default 
    // and print if it works.

    console.log("Testing gemini-pro...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await model.generateContent("Hello");
        console.log("gemini-pro works!");
    } catch (e) {
        console.log("gemini-pro failed:", e.message);
    }

    console.log("\nTesting gemini-1.5-flash...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash works!");
    } catch (e) {
        console.log("gemini-1.5-flash failed:", e.message);
    }

    console.log("\nTesting gemini-1.5-flash-001 (specific version)...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001" });
        const result = await model.generateContent("Hello");
        console.log("gemini-1.5-flash-001 works!");
    } catch (e) {
        console.log("gemini-1.5-flash-001 failed:", e.message);
    }
}

listModels();
