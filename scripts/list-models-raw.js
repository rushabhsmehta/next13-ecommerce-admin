const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No GEMINI_API_KEY found");
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error("API Error:", json.error);
            } else if (json.models) {
                console.log("Available Models:");
                json.models.forEach(m => console.log(`- ${m.name}`));
            } else {
                console.log("Unexpected response:", json);
            }
        } catch (e) {
            console.error("Parse Error:", e);
            console.log("Raw Data:", data);
        }
    });

}).on('error', (err) => {
    console.error("Request Error:", err);
});
