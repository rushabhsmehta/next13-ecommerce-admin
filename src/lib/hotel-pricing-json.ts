import { z } from 'zod';

// ===== TypeScript Interfaces =====

export interface JsonExportMetadata {
  exportedAt: string;
  locationId: string;
  locationName: string;
  hotelId: string;
  hotelName: string;
}

export interface JsonReferenceData {
  roomTypes: Array<{ id: string; name: string }>;
  occupancyTypes: Array<{ id: string; name: string; maxPersons: number }>;
  mealPlans: Array<{ id: string; code: string; name: string }>;
}

export interface JsonPricingEntry {
  startDate: string;
  endDate: string;
  roomTypeId: string;
  occupancyTypeId: string;
  mealPlanId?: string | null;
  price: number;
  isActive: boolean;
}

export interface JsonExportFormat {
  version: string;
  metadata: JsonExportMetadata;
  referenceData: JsonReferenceData;
  pricingEntries: JsonPricingEntry[];
}

export interface ImportValidationError {
  type: 'syntax' | 'validation' | 'business';
  severity: 'error' | 'warning';
  entryIndex?: number;
  field?: string;
  message: string;
  value?: any;
}

export interface ImportPreviewEntry {
  index: number;
  roomTypeName: string;
  occupancyTypeName: string;
  mealPlanCode?: string;
  startDate: string;
  endDate: string;
  price: number;
  action: 'create' | 'update';
  status: 'valid' | 'error' | 'warning';
  messages: string[];
}

export interface ImportPreview {
  summary: {
    totalEntries: number;
    newEntries: number;
    updates: number;
    errors: number;
    warnings: number;
  };
  entries: ImportPreviewEntry[];
  errors: ImportValidationError[];
  warnings: string[];
}

// ===== Zod Validation Schemas =====

const pricingEntrySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  roomTypeId: z.string().min(1, "Room type ID is required"),
  occupancyTypeId: z.string().min(1, "Occupancy type ID is required"),
  mealPlanId: z.string().optional().nullable(),
  price: z.number().min(0, "Price must be non-negative"),
  isActive: z.boolean().default(true)
}).refine(
  (data) => data.startDate <= data.endDate,
  { message: "End date must be on or after start date", path: ["endDate"] }
);

export const importPayloadSchema = z.object({
  version: z.string(),
  metadata: z.object({
    hotelId: z.string().min(1, "Hotel ID is required"),
    locationId: z.string().optional(),
  }),
  pricingEntries: z.array(pricingEntrySchema).min(1, "At least one pricing entry is required")
});

// ===== AI Prompt Generation =====

export function generateAiPrompt(
  hotelId: string,
  hotelName: string,
  locationId: string,
  locationName: string,
  referenceData: JsonReferenceData
): string {
  return `You are helping convert hotel pricing data into a structured JSON format for import into a hotel management system.

TARGET HOTEL INFORMATION:
- Hotel ID: ${hotelId}
- Hotel Name: ${hotelName}
- Location ID: ${locationId}
- Location: ${locationName}

REQUIRED JSON STRUCTURE:
{
  "version": "1.0",
  "metadata": {
    "hotelId": "${hotelId}",
    "locationId": "${locationId}"
  },
  "pricingEntries": [
    {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "roomTypeId": "<ID from list below>",
      "occupancyTypeId": "<ID from list below>",
      "mealPlanId": "<ID from list below or null>",
      "price": <number>,
      "isActive": true
    }
  ]
}

AVAILABLE ROOM TYPES:
${referenceData.roomTypes.map(rt => `- ID: ${rt.id}, Name: ${rt.name}`).join('\n')}

AVAILABLE OCCUPANCY TYPES:
${referenceData.occupancyTypes.map(ot => `- ID: ${ot.id}, Name: ${ot.name} (${ot.maxPersons} persons)`).join('\n')}

AVAILABLE MEAL PLANS (Optional):
${referenceData.mealPlans.map(mp => `- ID: ${mp.id}, Code: ${mp.code}, Name: ${mp.name}`).join('\n')}

VALIDATION RULES:
1. All dates must be in YYYY-MM-DD format
2. startDate must be <= endDate
3. price must be a non-negative number (in INR)
4. roomTypeId and occupancyTypeId are REQUIRED - use exact IDs from the lists above
5. mealPlanId is OPTIONAL - use exact ID from the list above or set to null
6. isActive should be true for active pricing, false for inactive

INSTRUCTIONS:
1. Extract all pricing periods from the provided data
2. Match room types and occupancy types to the IDs above (use exact matches)
3. Convert dates to YYYY-MM-DD format
4. Ensure all prices are numeric values
5. Return ONLY the JSON, no additional text

Please convert the pricing data to the JSON format specified above.`;
}
