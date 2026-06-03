import { z } from "zod";

/** True when the user supplied pasted source text (special requirements / itinerary paste). */
export function hasPastedSourceContent(text?: string | null): boolean {
  return Boolean(text?.trim());
}

export const GENERATION_TEMPERATURE_CREATIVE = 0.7;
export const GENERATION_TEMPERATURE_STRICT = 0.15;
export const REFINE_TEMPERATURE = 0.2;

const generationBodyFields = {
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
};

export const itineraryGenerationBodySchema = z.object(generationBodyFields);
export type ItineraryGenerationInput = z.infer<typeof itineraryGenerationBodySchema>;

const JSON_OUTPUT_SCHEMA = `{
  "tourPackageName": "string",
  "tourCategory": "Domestic" or "International",
  "tourPackageType": "string",
  "numDaysNight": "string - Format: X Nights / Y Days",
  "transport": "string",
  "pickup_location": "string",
  "drop_location": "string",
  "highlights": ["array of key highlights from source only; omit or empty array if none in source"],
  "itineraries": [
    {
      "dayNumber": 1,
      "itineraryTitle": "string",
      "itineraryDescription": "string",
      "mealsIncluded": "string",
      "suggestedHotel": "string",
      "activities": [
        {
          "activityTitle": "",
          "activityDescription": "i. First activity...\\nii. Second... (Roman numerals, each on new line with \\\\n)"
        }
      ]
    }
  ],
  "estimatedBudget": {
    "perPerson": "string",
    "total": "string",
    "note": "string"
  }
}`;

const ACTIVITY_RULE =
  "Each day must have EXACTLY ONE activity object. Leave activityTitle as empty string. List all activities in activityDescription using Roman numerals (i., ii., iii.) with EACH activity on a NEW LINE (use \\n for newlines).";

export const STRICT_SOURCE_FIDELITY_RULES = `
## SOURCE FIDELITY MODE (mandatory when pasted content is provided)
The user pasted authoritative source text below. Your job is to **structure and transcribe** it into JSON — not to redesign the trip.

### Non-negotiable rules
1. **No invention**: Do not add days, nights, cities, hotels, meals, activities, prices, highlights, or transport that are not in the pasted content.
2. **No deletion**: Do not omit, merge, or skip any day, activity, hotel stay, meal, or inclusion from the pasted content.
3. **No rewriting**: Keep titles, descriptions, hotel names, and activity wording as close to the source as possible. Only fix obvious typos or split text into JSON fields.
4. **Literal mapping**: Every itinerary day in the output must correspond to a day in the source, in the same order, with the same dayNumber sequence starting at 1.
5. **Conflict resolution**: If destination, duration, group, or budget hints conflict with the pasted content, **the pasted content wins**.
6. **Highlights & budget**: Only populate highlights and estimatedBudget from the paste. If not stated, use an empty highlights array and omit or use empty strings for budget fields.
7. **Meals & hotels**: Copy meal and hotel strings exactly as written in the source for that day.
8. **Activities**: Extract every listed activity for each day; do not summarize multiple bullets into one unless the source is a single line.

If the pasted content is incomplete for a required JSON field, use an empty string rather than guessing.
`;

export const CREATIVE_GENERATION_RULES = `
## Creative generation (no pasted source)
Generate a complete tour package from the structured inputs. Be specific and professional, but you may propose hotels and experiences appropriate to the budget category.

## Style (only when no pasted source)
- Professional Indian English
- Include timings and local detail where helpful
- Avoid empty phrases like "enjoy the day"
`;

export function buildGenerationSystemPrompt(strictSource: boolean): string {
  const modeBlock = strictSource ? STRICT_SOURCE_FIDELITY_RULES : CREATIVE_GENERATION_RULES;
  return `You are "Aagam AI" for Aagam Holidays. Output ONLY a valid JSON object — no markdown, no commentary.

## Output schema (strict)
${JSON_OUTPUT_SCHEMA}

## Format rules
1. Output ONLY the JSON object
2. All top-level fields are required (use "" or [] when unknown in strict mode)
3. ${ACTIVITY_RULE}
4. ${strictSource ? "Follow SOURCE FIDELITY MODE rules above." : "Consider budget category for hotels and transport suggestions."}

${modeBlock}`;
}

export function buildRefineSystemPrompt(): string {
  return `You are "Aagam AI" for Aagam Holidays. You will receive the current itinerary JSON and user instructions.

## Task
Return the COMPLETE updated JSON with the **same structure** as the input.

## Rules (strict)
1. Change **only** what the user explicitly asks to change. Leave every other field and day unchanged.
2. Do not "improve", rephrase, or enrich content the user did not mention.
3. Do not add or remove days, activities, hotels, or meals unless the user explicitly requests it.
4. Do not remove JSON fields unless the user explicitly asks.
5. ${ACTIVITY_RULE}
6. Output ONLY valid JSON.

## Output schema
Same keys as the input itinerary object (tourPackageName, tourCategory, tourPackageType, numDaysNight, transport, pickup_location, drop_location, highlights, itineraries, estimatedBudget, and any query-specific fields present).`;
}

const groupDescriptions: Record<ItineraryGenerationInput["groupType"], string> = {
  family: "a family group with mixed ages",
  couple: "a romantic couple",
  friends: "a group of friends",
  solo: "a solo traveller",
  corporate: "a corporate/business group",
  seniors: "senior citizens who prefer comfortable pace",
};

const budgetDescriptions: Record<ItineraryGenerationInput["budgetCategory"], string> = {
  budget: "budget-friendly options (3-star hotels, shared transfers)",
  "mid-range": "comfortable mid-range options (4-star hotels, private transfers)",
  premium: "premium experiences (4-5 star hotels, private vehicles)",
  luxury: "luxury experiences (5-star hotels, premium services, exclusive experiences)",
};

export function buildGenerationUserPrompt(input: ItineraryGenerationInput): string {
  const pasted = input.specialRequirements?.trim();
  const strictSource = hasPastedSourceContent(pasted);

  let prompt = strictSource
    ? `Structure the pasted itinerary below into the required JSON. Do not add creative content.\n\nDestination context: ${input.destination}\nDuration hint (use only if paste does not specify): ${input.duration.nights} nights / ${input.duration.days} days\nGroup: ${groupDescriptions[input.groupType]}\nBudget hint (use only for fields missing in paste): ${budgetDescriptions[input.budgetCategory]}`
    : `Create a ${input.duration.nights} nights / ${input.duration.days} days tour package for ${input.destination}.

Group: ${groupDescriptions[input.groupType]}
Budget: ${budgetDescriptions[input.budgetCategory]}`;

  if (pasted) {
    prompt += `

--- PASTED SOURCE (authoritative — do not add, remove, or rewrite beyond JSON structuring) ---
${pasted}
--- END PASTED SOURCE ---`;
  }

  if (input.targetType === "tourPackageQuery" && input.customerName) {
    prompt += `\n\nQuote metadata (do not override pasted itinerary content):`;
    prompt += `\nCustomer: ${input.customerName}`;
    if (input.startDate) prompt += `\nTravel Date: ${input.startDate}`;
    if (input.numAdults) {
      prompt += `\nGroup Size: ${input.numAdults} adults${
        input.numChildren ? `, ${input.numChildren} children` : ""
      }`;
    }
  }

  return prompt;
}

/** Rough count of "Day N" markers in pasted text for post-generation sanity checks. */
export function countDaysInPastedSource(text: string): number | null {
  const matches = text.match(/\bday\s*(\d+)\b/gi);
  if (!matches || matches.length === 0) return null;
  const numbers = matches.map((m) => {
    const n = m.match(/\d+/);
    return n ? parseInt(n[0], 10) : 0;
  });
  return Math.max(...numbers, matches.length);
}

export function getItineraryDayCount(data: { itineraries?: unknown[] }): number {
  return Array.isArray(data.itineraries) ? data.itineraries.length : 0;
}

export function buildFidelityWarnings(
  pastedSource: string | undefined,
  generated: { itineraries?: unknown[] }
): string[] {
  const warnings: string[] = [];
  if (!hasPastedSourceContent(pastedSource)) return warnings;

  const expectedDays = countDaysInPastedSource(pastedSource!);
  const actualDays = getItineraryDayCount(generated);
  if (expectedDays !== null && actualDays > 0 && expectedDays !== actualDays) {
    warnings.push(
      `Day count mismatch: pasted source suggests ${expectedDays} day(s) but output has ${actualDays}. Review before saving.`
    );
  }
  return warnings;
}

export function sanitizeActivityDescriptionJson(responseText: string): string {
  return responseText.replace(
    /("activityDescription"\s*:\s*")([^"]*?)(")/g,
    (_match: string, prefix: string, content: string, suffix: string) =>
      prefix + content.replace(/\r?\n/g, "\\n") + suffix
  );
}
