import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api-response";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { buildRefineSystemPrompt, REFINE_TEMPERATURE } from "@/lib/ai/itinerary-generation-prompts";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  currentItinerary: z.record(z.any()),
  userPrompt: z.string().min(1, "Instructions are required"),
});

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    const guard = await requireMobileAdminPermission(userId, "aiWizards.write");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError("Invalid input", 400, "VALIDATION", parsed.error.flatten());
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonError("Gemini API key is not configured", 500, "NO_GEMINI_KEY");
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const fullPrompt = `${buildRefineSystemPrompt()}

## Current Itinerary JSON
${JSON.stringify(parsed.data.currentItinerary, null, 2)}

## User Instructions (change ONLY what is requested here)
${parsed.data.userPrompt}

## Updated Itinerary JSON`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: REFINE_TEMPERATURE,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    let parsedResponse: Record<string, unknown>;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      console.error("[MOBILE_AI_REFINE_PARSE]", responseText, error);
      return jsonError("Failed to parse AI response", 500, "PARSE_ERROR");
    }

    await recordMobileAudit({
      userId,
      entityType: "AiWizard",
      entityId: userId,
      action: "UPDATE",
      metadata: {
        model: "gemini-2.0-flash",
        promptLength: parsed.data.userPrompt.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: parsedResponse,
      usage: { model: "gemini-2.0-flash" },
    });
  } catch (error: any) {
    console.error("[MOBILE_AI_REFINE]", error);
    return jsonError(`refinement failed: ${error?.message ?? "Unknown error"}`, 500, "AI_ERROR");
  }
}
