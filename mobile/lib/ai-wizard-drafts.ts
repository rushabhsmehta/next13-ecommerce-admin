import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AiItineraryDraft } from "@/lib/ai-wizards";
import type { TourPackageFormInitial } from "@/components/tour-packages/TourPackageForm";
import type { TourPackageItineraryDayInput } from "@/lib/tour-packages";
import type { ItineraryRow } from "@/components/tour-queries/types";

export const AI_DRAFT_KEYS = {
  packageCreate: "aiPackageWizardDraft",
  packageApply: "aiApplyToPackageDraft",
  queryCreate: "autoQueryDraft",
  queryApply: "aiApplyToQueryDraft",
} as const;

export type AiDraftStorageKey = (typeof AI_DRAFT_KEYS)[keyof typeof AI_DRAFT_KEYS];

export interface StoredAiDraft {
  timestamp: string;
  locationId: string;
  data: AiItineraryDraft & { locationId?: string };
}

function mapActivities(
  activities: AiItineraryDraft["itineraries"] extends (infer D)[] | undefined
    ? D extends { activities?: infer A }
      ? A
      : never
    : never
): { activityTitle: string; activityDescription: string }[] {
  if (!Array.isArray(activities) || activities.length === 0) return [];

  const first = activities[0] as
    | { activityTitle?: string | null; activityDescription?: string | null }
    | string
    | undefined;

  if (typeof first === "object" && first && "activityDescription" in first) {
    return [
      {
        activityTitle: first.activityTitle ?? "",
        activityDescription: first.activityDescription ?? "",
      },
    ];
  }

  if (typeof first === "string") {
    return activities.map((act) => ({
      activityTitle: String(act),
      activityDescription: "",
    }));
  }

  return [];
}

export function mapAiDraftToPackageItineraries(
  data: AiItineraryDraft,
  locationId: string
): TourPackageItineraryDayInput[] {
  return (data.itineraries ?? []).map((day, index) => ({
    dayNumber: day.dayNumber ?? index + 1,
    itineraryTitle: day.itineraryTitle ?? `Day ${index + 1}`,
    itineraryDescription: day.itineraryDescription ?? "",
    mealsIncluded: day.mealsIncluded ?? "",
  }));
}

export function mapAiDraftToQueryItineraries(
  data: AiItineraryDraft,
  locationId: string
): ItineraryRow[] {
  return (data.itineraries ?? []).map((day, index) => ({
    dayNumber: day.dayNumber ?? index + 1,
    days: String(day.dayNumber ?? index + 1),
    locationId,
    hotelId: null,
    itineraryTitle: day.itineraryTitle ?? "",
    itineraryDescription: day.itineraryDescription ?? "",
    mealsIncluded: day.mealsIncluded ?? "",
    roomAllocations: [],
    transportDetails: [],
  }));
}

const DEFAULT_POLICIES = {
  inclusions: [] as string[],
  exclusions: [] as string[],
  importantNotes: [] as string[],
};

export function mapAiDraftToPackageInitial(
  stored: StoredAiDraft,
  locationLabel = ""
): Partial<TourPackageFormInitial> {
  const { data, locationId } = stored;
  const budget =
    data.estimatedBudget && typeof data.estimatedBudget === "object"
      ? String(
          (data.estimatedBudget as { perPerson?: string; total?: string }).total ??
            (data.estimatedBudget as { perPerson?: string }).perPerson ??
            ""
        )
      : "";

  return {
    locationId,
    locationLabel,
    tourPackageName: data.tourPackageName ?? "",
    tourCategory: data.tourCategory ?? "Domestic",
    tourPackageType: data.tourPackageType ?? "General",
    numDaysNight: data.numDaysNight ?? "",
    transport: data.transport ?? "",
    pickup_location: data.pickup_location ?? "",
    drop_location: data.drop_location ?? "",
    price: budget,
    itineraries: mapAiDraftToPackageItineraries(data, locationId),
    images: [],
    pricingSection: [],
    inclusions: DEFAULT_POLICIES.inclusions,
    exclusions: DEFAULT_POLICIES.exclusions,
    importantNotes: DEFAULT_POLICIES.importantNotes,
    paymentPolicy: [],
    usefulTip: [],
    cancellationPolicy: [],
    airlineCancellationPolicy: [],
    termsconditions: [],
    kitchenGroupPolicy: [],
  };
}

export interface AiQueryDraftInitial {
  tourPackageQueryName: string;
  customerName: string;
  numAdults: string;
  numChild512: string;
  tourStartsFrom: string;
  locationId: string;
  transport: string;
  pickupLocation: string;
  dropLocation: string;
  itineraries: ItineraryRow[];
  policies: Record<string, string>;
}

export function mapAiDraftToQueryInitial(
  stored: StoredAiDraft
): AiQueryDraftInitial {
  const { data, locationId } = stored;
  const start =
    data.tourStartsFrom != null
      ? String(data.tourStartsFrom).substring(0, 10)
      : "";

  return {
    tourPackageQueryName: data.tourPackageName ?? "",
    customerName: data.customerName ?? "",
    numAdults: data.numAdults != null ? String(data.numAdults) : "",
    numChild512: data.numChildren != null ? String(data.numChildren) : "",
    tourStartsFrom: start,
    locationId,
    transport: data.transport ?? "",
    pickupLocation: data.pickup_location ?? "",
    dropLocation: data.drop_location ?? "",
    itineraries: mapAiDraftToQueryItineraries(data, locationId),
    policies: {},
  };
}

export async function storeAiDraft(
  key: AiDraftStorageKey,
  payload: { locationId: string; data: AiItineraryDraft }
): Promise<void> {
  const stored: StoredAiDraft = {
    timestamp: new Date().toISOString(),
    locationId: payload.locationId,
    data: { ...payload.data, locationId: payload.locationId },
  };
  await AsyncStorage.setItem(key, JSON.stringify(stored));
}

export async function consumeAiDraft(
  key: AiDraftStorageKey
): Promise<StoredAiDraft | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  await AsyncStorage.removeItem(key);
  try {
    return JSON.parse(raw) as StoredAiDraft;
  } catch {
    return null;
  }
}

export async function peekAiDraft(key: AiDraftStorageKey): Promise<StoredAiDraft | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAiDraft;
  } catch {
    return null;
  }
}
