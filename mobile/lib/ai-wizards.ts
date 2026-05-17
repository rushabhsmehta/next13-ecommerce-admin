import type { AuthenticatedRequest } from "@/lib/associate-inquiries";

export type AiTargetType = "tourPackage" | "tourPackageQuery";
export type AiGroupType = "family" | "couple" | "friends" | "solo" | "corporate" | "seniors";
export type AiBudgetCategory = "budget" | "mid-range" | "premium" | "luxury";

export interface AiLocationOption {
  id: string;
  label: string;
  slug?: string | null;
}

export interface AiGenerateInput {
  destination: string;
  duration: { nights: number; days: number };
  groupType: AiGroupType;
  budgetCategory: AiBudgetCategory;
  specialRequirements?: string;
  targetType: AiTargetType;
  customerName?: string;
  startDate?: string;
  numAdults?: number;
  numChildren?: number;
}

export interface AiItineraryActivity {
  activityTitle?: string | null;
  activityDescription?: string | null;
}

export interface AiItineraryDay {
  dayNumber?: number;
  itineraryTitle?: string | null;
  itineraryDescription?: string | null;
  mealsIncluded?: string | null;
  suggestedHotel?: string | null;
  activities?: AiItineraryActivity[];
}

export interface AiItineraryDraft {
  tourPackageName: string;
  tourCategory?: string | null;
  tourPackageType?: string | null;
  numDaysNight?: string | null;
  transport?: string | null;
  pickup_location?: string | null;
  drop_location?: string | null;
  highlights?: string[];
  itineraries?: AiItineraryDay[];
  estimatedBudget?: { perPerson?: string; total?: string; note?: string } | Record<string, unknown>;
  customerName?: string | null;
  tourStartsFrom?: string | null;
  numAdults?: number | null;
  numChildren?: number | null;
}

export interface AiResponse {
  success: boolean;
  data: AiItineraryDraft;
  usage?: { model?: string };
}

function makeIdempotencyKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function createAiWizardsClient(authRequest: AuthenticatedRequest) {
  return {
    listLocations(): Promise<AiLocationOption[]> {
      return authRequest<{ locations: AiLocationOption[] }>("/api/mobile/ai/locations", {
        retries: 1,
      }).then((res) => res.locations);
    },

    generate(input: AiGenerateInput): Promise<AiResponse> {
      return authRequest<AiResponse>("/api/mobile/ai/generate-itinerary", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("ai-generate") },
      });
    },

    refine(currentItinerary: AiItineraryDraft, userPrompt: string): Promise<AiResponse> {
      return authRequest<AiResponse>("/api/mobile/ai/refine-itinerary", {
        method: "POST",
        body: { currentItinerary, userPrompt },
        headers: { "Idempotency-Key": makeIdempotencyKey("ai-refine") },
      });
    },

    saveDraft(input: {
      targetType: AiTargetType;
      locationId: string;
      draft: AiItineraryDraft;
    }): Promise<{ success: boolean; targetType: AiTargetType; id: string }> {
      return authRequest("/api/mobile/ai/save-draft", {
        method: "POST",
        body: input,
        headers: { "Idempotency-Key": makeIdempotencyKey("ai-save") },
      });
    },
  };
}

export type AiWizardsClient = ReturnType<typeof createAiWizardsClient>;

