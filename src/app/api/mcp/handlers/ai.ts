import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { McpError } from "../lib/errors";
import type { ToolHandlerMap } from "../lib/schemas";

// ── Schemas ──────────────────────────────────────────────────────────────────

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

// ── Handlers ─────────────────────────────────────────────────────────────────

async function generateItinerary(rawParams: unknown) {
  const params = GenerateItinerarySchema.parse(rawParams);
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Generate a detailed ${params.nights}-night/${params.days}-day tour itinerary for ${params.destination}.

Group type: ${params.groupType}
Budget: ${params.budgetCategory}
${params.customerName ? `Customer: ${params.customerName}` : ""}
${params.startDate ? `Start date: ${params.startDate}` : ""}
${params.numAdults ? `Adults: ${params.numAdults}` : ""}
${params.numChildren ? `Children: ${params.numChildren}` : ""}
${params.specialRequirements ? `Special requirements: ${params.specialRequirements}` : ""}

Output ONLY a valid JSON object with this structure:
{
  "tourPackageName": "string",
  "tourCategory": "Domestic" or "International",
  "tourPackageType": "string",
  "numDaysNight": "${params.nights} Nights / ${params.days} Days",
  "transport": "string",
  "pickup_location": "string",
  "drop_location": "string",
  "highlights": ["string"],
  "itineraries": [
    {
      "dayNumber": 1,
      "days": "Day 1",
      "itineraryTitle": "string",
      "itineraryDescription": "string",
      "mealsIncluded": "string",
      "activities": [{ "activityTitle": "string", "activityDescription": "string" }]
    }
  ]
}`;

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
  });

  let text: string;
  try {
    text = result.response.text().replace(/\n/g, " ").trim();
  } catch (e) {
    throw new McpError("Gemini returned an empty or inaccessible response", "AI_GENERATION_FAILED", 502, { cause: String(e) });
  }

  // Strip markdown code fences Gemini sometimes emits despite responseMimeType: "application/json"
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  try {
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("[MCP] generateItinerary: non-JSON from Gemini:", jsonText.slice(0, 300));
    throw new McpError(
      `AI returned malformed JSON. Snippet: ${jsonText.slice(0, 120)}`,
      "AI_PARSE_ERROR", 502, { rawSnippet: jsonText.slice(0, 300) }
    );
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export const aiHandlers: ToolHandlerMap = {
  generate_itinerary: generateItinerary,
};
