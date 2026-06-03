import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { handleApi, jsonError } from "@/lib/api-response";
import {
    buildRefineSystemPrompt,
    REFINE_TEMPERATURE,
} from "@/lib/ai/itinerary-generation-prompts";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    currentItinerary: z.record(z.any()),
    userPrompt: z.string().min(1, "Instructions are required"),
});

export async function POST(req: Request) {
    return handleApi(async () => {
        const { userId } = await auth();
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

        const fullPrompt = `${buildRefineSystemPrompt()}

## Current Itinerary JSON
${JSON.stringify(currentItinerary, null, 2)}

## User Instructions (change ONLY what is requested here)
${userPrompt}

## Updated Itinerary JSON
`;

        console.log("[AI_REFINE] Sending refinement request...");

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: REFINE_TEMPERATURE,
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
