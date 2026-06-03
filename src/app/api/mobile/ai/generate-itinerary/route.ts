import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
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

export const dynamic = "force-dynamic";

const limiter = rateLimit("expensive");

export async function POST(req: Request) {
  const limited = limiter.check(req);
  if (limited) return limited;

  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    const guard = await requireMobileAdminPermission(userId, "aiWizards.write");
    if (!guard.ok) return guard.response;

    const parsed = itineraryGenerationBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError("Invalid input", 422, "VALIDATION", parsed.error.flatten());
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[MOBILE_AI_GENERATE] Missing GEMINI_API_KEY");
      return jsonError("Gemini API key is not configured", 500, "NO_GEMINI_KEY");
    }

    const strictSource = hasPastedSourceContent(parsed.data.specialRequirements);
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const fullPrompt = `${buildGenerationSystemPrompt(strictSource)}\n\n${buildGenerationUserPrompt(parsed.data)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: strictSource ? GENERATION_TEMPERATURE_STRICT : GENERATION_TEMPERATURE_CREATIVE,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    let parsedResponse: Record<string, unknown>;
    try {
      parsedResponse = JSON.parse(sanitizeActivityDescriptionJson(responseText));
    } catch (error) {
      console.error("[MOBILE_AI_GENERATE_PARSE]", error);
      return jsonError("Failed to parse AI response", 500, "PARSE_ERROR");
    }

    if (parsed.data.targetType === "tourPackageQuery") {
      parsedResponse.customerName = parsed.data.customerName || "";
      parsedResponse.tourStartsFrom = parsed.data.startDate || null;
      parsedResponse.numAdults = parsed.data.numAdults || 2;
      parsedResponse.numChildren = parsed.data.numChildren || 0;
    }

    const fidelityWarnings = buildFidelityWarnings(parsed.data.specialRequirements, parsedResponse);
    if (fidelityWarnings.length > 0) {
      console.warn("[MOBILE_AI_GENERATE] Fidelity warnings:", fidelityWarnings);
    }

    await recordMobileAudit({
      userId,
      entityType: "AiWizard",
      entityId: userId,
      action: "CREATE",
      metadata: {
        targetType: parsed.data.targetType,
        destination: parsed.data.destination,
        model: "gemini-2.5-flash",
        strictSource,
      },
    });

    return NextResponse.json({
      success: true,
      data: parsedResponse,
      strictSource,
      fidelityWarnings,
      usage: { model: "gemini-2.5-flash" },
    });
  } catch (error: any) {
    console.error("[MOBILE_AI_GENERATE]", error);
    const message = String(error?.message ?? "");
    const isRateLimit =
      error?.status === 429 ||
      message.includes("429") ||
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("rate");
    if (isRateLimit) {
      return jsonError("Gemini API rate limit reached. Please wait a moment and try again.", 429, "RATE_LIMITED");
    }
    return jsonError(`AI Generation failed: ${message || "Unknown error"}`, 500, "AI_ERROR");
  }
}
