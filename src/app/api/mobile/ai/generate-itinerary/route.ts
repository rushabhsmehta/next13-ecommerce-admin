import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const limiter = rateLimit("expensive");

const bodySchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  duration: z.object({
    nights: z.number().min(1).max(30),
    days: z.number().min(1).max(31),
  }),
  groupType: z.enum(["family", "couple", "friends", "solo", "corporate", "seniors"]),
  budgetCategory: z.enum(["budget", "mid-range", "premium", "luxury"]),
  specialRequirements: z.string().optional(),
  targetType: z.enum(["tourPackage", "tourPackageQuery"]).default("tourPackage"),
  customerName: z.string().optional(),
  startDate: z.string().optional(),
  numAdults: z.number().optional(),
  numChildren: z.number().optional(),
});

const SYSTEM_PROMPT = `You are "Aagam AI", an expert travel consultant for Aagam Holidays. Generate detailed, immersive tour itineraries.

## Your Task
Create a complete tour package based on the structured input provided. Output ONLY a valid JSON object.

## Style Guidelines
- Write in professional Indian English (e.g., "favourite", "organisation")
- Be detailed and immersive - avoid generic phrases like "enjoy the day"
- Include specific timings, drive durations, and local experiences
- Mention specific restaurants, viewpoints, or experiences when appropriate

## Output Format (STRICT JSON)
{
  "tourPackageName": "string - Catchy title with destination",
  "tourCategory": "Domestic" or "International",
  "tourPackageType": "string - e.g., Honeymoon, Family, Adventure",
  "numDaysNight": "string - Format: X Nights / Y Days",
  "transport": "string - e.g., Private Cab, Flight + Cab",
  "pickup_location": "string",
  "drop_location": "string",
  "highlights": ["array of 4-6 key highlights"],
  "itineraries": [
    {
      "dayNumber": 1,
      "itineraryTitle": "City A - City B (Theme) (Duration: X hrs)",
      "itineraryDescription": "Rich paragraph 150-200 words describing the day with logistics, experiences, and sensory details",
      "mealsIncluded": "Breakfast & Dinner",
      "suggestedHotel": "Hotel name suggestion based on budget",
      "activities": [
        {
          "activityTitle": "",
          "activityDescription": "i. First activity details...\\nii. Second activity details...\\niii. Third activity... (Each Roman numeral on a new line)"
        }
      ]
    }
  ],
  "estimatedBudget": {
    "perPerson": "Rs. XX,XXX",
    "total": "Rs. X,XX,XXX",
    "note": "Budget breakdown note"
  }
}

## Rules
1. Output ONLY the JSON object - no markdown, no explanations
2. All fields are required
3. Each day must have EXACTLY ONE activity object. Leave activityTitle as empty string. List all activities in activityDescription using Roman numerals (i., ii., iii.) with EACH activity on a NEW LINE (use \\n for newlines).
4. Descriptions should be immersive and specific
5. Consider the budget category when suggesting hotels and experiences`;

export async function POST(req: Request) {
  const limited = limiter.check(req);
  if (limited) return limited;

  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    const guard = await requireMobileAdminPermission(userId, "aiWizards.write");
    if (!guard.ok) return guard.response;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return jsonError("Invalid input", 422, "VALIDATION", parsed.error.flatten());
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[MOBILE_AI_GENERATE] Missing GEMINI_API_KEY");
      return jsonError("Gemini API key is not configured", 500, "NO_GEMINI_KEY");
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const fullPrompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(parsed.data)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const responseText = result.response.text();
    let parsedResponse: any;
    try {
      const sanitizedResponse = responseText.replace(
        /("activityDescription"\s*:\s*")([^"]*?)(")/g,
        (_match: string, prefix: string, content: string, suffix: string) =>
          prefix + content.replace(/\r?\n/g, "\\n") + suffix
      );
      parsedResponse = JSON.parse(sanitizedResponse);
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

    await recordMobileAudit({
      userId,
      entityType: "AiWizard",
      entityId: userId,
      action: "CREATE",
      metadata: {
        targetType: parsed.data.targetType,
        destination: parsed.data.destination,
        model: "gemini-2.5-flash",
      },
    });

    return NextResponse.json({
      success: true,
      data: parsedResponse,
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

function buildUserPrompt(input: z.infer<typeof bodySchema>): string {
  const groupDescriptions: Record<string, string> = {
    family: "a family group with mixed ages",
    couple: "a romantic couple",
    friends: "a group of friends",
    solo: "a solo traveller",
    corporate: "a corporate/business group",
    seniors: "senior citizens who prefer comfortable pace",
  };

  const budgetDescriptions: Record<string, string> = {
    budget: "budget-friendly options (3-star hotels, shared transfers)",
    "mid-range": "comfortable mid-range options (4-star hotels, private transfers)",
    premium: "premium experiences (4-5 star hotels, private vehicles)",
    luxury: "luxury experiences (5-star hotels, premium services, exclusive experiences)",
  };

  let prompt = `Create a ${input.duration.nights} nights / ${input.duration.days} days tour package for ${input.destination}.

Group: ${groupDescriptions[input.groupType]}
Budget: ${budgetDescriptions[input.budgetCategory]}`;

  if (input.specialRequirements) {
    prompt += `\n\nSpecial Requirements: ${input.specialRequirements}`;
  }

  if (input.targetType === "tourPackageQuery" && input.customerName) {
    prompt += `\n\nThis is a personalized quote for: ${input.customerName}`;
    if (input.startDate) prompt += `\nTravel Date: ${input.startDate}`;
    if (input.numAdults) {
      prompt += `\nGroup Size: ${input.numAdults} adults${
        input.numChildren ? `, ${input.numChildren} children` : ""
      }`;
    }
  }

  return prompt;
}

