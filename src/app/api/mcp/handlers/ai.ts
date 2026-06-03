import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { McpError } from "../lib/errors";
import type { ToolHandlerMap } from "../lib/schemas";
import {
  buildFidelityWarnings,
  buildGenerationSystemPrompt,
  buildGenerationUserPrompt,
  GENERATION_TEMPERATURE_CREATIVE,
  GENERATION_TEMPERATURE_STRICT,
  hasPastedSourceContent,
  sanitizeActivityDescriptionJson,
  type ItineraryGenerationInput,
} from "@/lib/ai/itinerary-generation-prompts";

const GenerateItinerarySchema = z.object({
  destination: z.string().min(1),
  nights: z.number().int().min(1).max(30),
  days: z.number().int().min(1).max(31),
  groupType: z.enum(["family", "couple", "friends", "solo", "corporate", "seniors"]),
  budgetCategory: z.enum(["budget", "mid-range", "premium", "luxury"]),
  specialRequirements: z.string().optional(),
  customerName: z.string().optional(),
  startDate: z.string().optional(),
  numAdults: z.number().int().min(0).optional(),
  numChildren: z.number().int().min(0).optional(),
});

async function generateItinerary(rawParams: unknown) {
  const params = GenerateItinerarySchema.parse(rawParams);
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const input: ItineraryGenerationInput = {
    destination: params.destination,
    duration: { nights: params.nights, days: params.days },
    groupType: params.groupType,
    budgetCategory: params.budgetCategory,
    specialRequirements: params.specialRequirements,
    targetType: "tourPackage",
    customerName: params.customerName,
    startDate: params.startDate,
    numAdults: params.numAdults,
    numChildren: params.numChildren,
  };

  const strictSource = hasPastedSourceContent(input.specialRequirements);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const fullPrompt = `${buildGenerationSystemPrompt(strictSource)}\n\n${buildGenerationUserPrompt(input)}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: strictSource ? GENERATION_TEMPERATURE_STRICT : GENERATION_TEMPERATURE_CREATIVE,
      responseMimeType: "application/json",
    },
  });

  let text: string;
  try {
    text = result.response.text().trim();
  } catch (e) {
    throw new McpError("Gemini returned an empty or inaccessible response", "AI_GENERATION_FAILED", 502, { cause: String(e) });
  }

  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(sanitizeActivityDescriptionJson(jsonText));
    const warnings = buildFidelityWarnings(params.specialRequirements, parsed);
    if (warnings.length > 0) {
      (parsed as Record<string, unknown>)._fidelityWarnings = warnings;
    }
    return parsed;
  } catch (e) {
    console.error("[MCP] generateItinerary: non-JSON from Gemini:", jsonText.slice(0, 300));
    throw new McpError(
      `AI returned malformed JSON. Snippet: ${jsonText.slice(0, 120)}`,
      "AI_PARSE_ERROR", 502, { rawSnippet: jsonText.slice(0, 300) }
    );
  }
}

export const aiHandlers: ToolHandlerMap = {
  generate_itinerary: generateItinerary,
};
