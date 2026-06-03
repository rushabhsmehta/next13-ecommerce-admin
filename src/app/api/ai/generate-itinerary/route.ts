import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { handleApi, jsonError } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import {
    buildFidelityWarnings,
    buildGenerationSystemPrompt,
    buildGenerationUserPrompt,
    GENERATION_TEMPERATURE_CREATIVE,
    GENERATION_TEMPERATURE_STRICT,
    hasPastedSourceContent,
    itineraryGenerationBodySchema,
    sanitizeActivityDescriptionJson,
} from "@/lib/ai/itinerary-generation-prompts";

const limiter = rateLimit('expensive');

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    const limited = limiter.check(req);
    if (limited) return limited;

    return handleApi(async () => {
        const { userId } = await auth();
        if (!userId) {
            return jsonError("Unauthenticated", 403, "AUTH");
        }

        const parsed = itineraryGenerationBodySchema.parse(await req.json());

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("[AI_GENERATE] Missing GEMINI_API_KEY");
            return jsonError("Gemini API key is not configured", 500, "NO_GEMINI_KEY");
        }

        const strictSource = hasPastedSourceContent(parsed.specialRequirements);
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const fullPrompt = `${buildGenerationSystemPrompt(strictSource)}\n\n${buildGenerationUserPrompt(parsed)}`;

        console.log("[AI_GENERATE] Sending request to Gemini...", { strictSource });

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    temperature: strictSource ? GENERATION_TEMPERATURE_STRICT : GENERATION_TEMPERATURE_CREATIVE,
                    responseMimeType: "application/json",
                },
            });

            const responseText = result.response.text();

            let parsedResponse;
            try {
                parsedResponse = JSON.parse(sanitizeActivityDescriptionJson(responseText));
            } catch (e) {
                console.error("[AI_GENERATE] Failed to parse Gemini response:", e);
                console.error("[AI_GENERATE] Raw response:", responseText);
                return jsonError("Failed to parse AI response", 500, "PARSE_ERROR");
            }

            if (parsed.targetType === "tourPackageQuery") {
                parsedResponse.customerName = parsed.customerName || "";
                parsedResponse.tourStartsFrom = parsed.startDate || null;
                parsedResponse.numAdults = parsed.numAdults || 2;
                parsedResponse.numChildren = parsed.numChildren || 0;
            }

            const fidelityWarnings = buildFidelityWarnings(parsed.specialRequirements, parsedResponse);
            if (fidelityWarnings.length > 0) {
                console.warn("[AI_GENERATE] Fidelity warnings:", fidelityWarnings);
            }

            return NextResponse.json({
                success: true,
                data: parsedResponse,
                strictSource,
                fidelityWarnings,
                usage: {
                    model: "gemini-2.5-flash",
                },
            });

        } catch (error: any) {
            console.error("[AI_GENERATE] Gemini API Error:", error);
            const isRateLimit = error?.status === 429 || error?.message?.includes("429") || error?.message?.toLowerCase().includes("quota") || error?.message?.toLowerCase().includes("rate");
            if (isRateLimit) {
                return jsonError("Gemini API rate limit reached. Please wait a moment and try again.", 429, "RATE_LIMITED");
            }
            return jsonError(`AI Generation failed: ${error.message}`, 500, "AI_ERROR");
        }
    });
}
