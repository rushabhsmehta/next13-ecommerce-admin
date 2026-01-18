import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { z } from "zod";
import { handleApi, jsonError } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    currentItinerary: z.record(z.any()), // Accepts the full itinerary object
    userPrompt: z.string().min(1, "Instructions are required"),
});

const SYSTEM_PROMPT = `You are "Aagam AI", an expert travel consultant.
Your task is to MODIFY the provided tour package itinerary based on the user's instructions.

## Inputs
1. Current Itinerary JSON
2. User Instructions for changes

## Rules
1. Return the COMPLETE updated JSON object.
2. Maintain the exact same JSON structure as the input.
3. Apply the user's changes intelligently (e.g., if they say "make it luxury", update hotels to 5-star, transport to premium, and budget).
4. Do NOT remove fields unless explicitly asked.
5. Ensure the "Activities" rule is followed: ONE activity object per day with EMPTY activityTitle. List activities in activityDescription using Roman numerals (i., ii., iii.) with EACH on a NEW LINE (use \\n).
6. Output ONLY valid JSON.

## Output Format (Identical to Input)
{
  "tourPackageName": "...",
  "tourCategory": "...",
  "tourPackageType": "...",
  "numDaysNight": "...",
  "transport": "...",
  "pickup_location": "...",
  "drop_location": "...",
  "highlights": [...],
  "itineraries": [...],
  "estimatedBudget": {...}
}`;

export async function POST(req: Request) {
    return handleApi(async () => {
        const { userId } = auth();
        if (!userId) {
            return jsonError("Unauthenticated", 403, "AUTH");
        }

        const body = await req.json();
        const parsed = bodySchema.safeParse(body);

        if (!parsed.success) {
            return jsonError("Invalid input", 400, "VALIDATION", parsed.error);
        }

        const { currentItinerary, userPrompt } = parsed.data;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return jsonError("Gemini API key is not configured", 500, "NO_GEMINI_KEY");
        }

        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const fullPrompt = `${SYSTEM_PROMPT}

    ## Current Itinerary JSON
    ${JSON.stringify(currentItinerary, null, 2)}

    ## User Instructions
    ${userPrompt}
    
    ## Updated Itinerary JSON
    `;

        console.log("[AI_REFINE] Sending refinement request...");

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    responseMimeType: "application/json",
                },
            });

            const responseText = result.response.text();

            let parsedResponse;
            try {
                parsedResponse = JSON.parse(responseText);
            } catch (e) {
                console.error("[AI_REFINE] Failed to parse response:", responseText);
                return jsonError("Failed to parse AI response", 500, "PARSE_ERROR");
            }

            return NextResponse.json({
                success: true,
                data: parsedResponse,
                usage: {
                    model: "gemini-2.0-flash",
                },
            });

        } catch (error: any) {
            console.error("[AI_REFINE] API Error:", error);
            return jsonError(`refinement failed: ${error.message}`, 500, "AI_ERROR");
        }
    });
}
