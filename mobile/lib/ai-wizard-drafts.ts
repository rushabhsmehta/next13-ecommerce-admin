import { NativeModules } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AiItineraryDraft } from "@/lib/ai-wizards";
import { buildTourQueryName } from "@/lib/tour-query-label";

const SECURE_DRAFT_PREFIX = "ai-draft:";

function asyncStorageNativeAvailable(): boolean {
  return NativeModules.RNCAsyncStorage != null;
}

async function readDraftRaw(key: string): Promise<string | null> {
  if (asyncStorageNativeAvailable()) {
    try {
      const { default: AsyncStorage } = await import(
        "@react-native-async-storage/async-storage"
      );
      return await AsyncStorage.getItem(key);
    } catch {
      // Fall through to SecureStore.
    }
  }
  try {
    return await SecureStore.getItemAsync(`${SECURE_DRAFT_PREFIX}${key}`);
  } catch {
    return null;
  }
}

async function writeDraftRaw(key: string, value: string): Promise<boolean> {
  if (asyncStorageNativeAvailable()) {
    try {
      const { default: AsyncStorage } = await import(
        "@react-native-async-storage/async-storage"
      );
      await AsyncStorage.setItem(key, value);
      return true;
    } catch {
      // Fall through to SecureStore.
    }
  }
  try {
    await SecureStore.setItemAsync(`${SECURE_DRAFT_PREFIX}${key}`, value);
    return true;
  } catch {
    return false;
  }
}

async function deleteDraftRaw(key: string): Promise<void> {
  if (asyncStorageNativeAvailable()) {
    try {
      const { default: AsyncStorage } = await import(
        "@react-native-async-storage/async-storage"
      );
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      // Fall through to SecureStore.
    }
  }
  try {
    await SecureStore.deleteItemAsync(`${SECURE_DRAFT_PREFIX}${key}`);
  } catch {
    // Nothing persisted.
  }
}
import type { TourPackageFormInitial } from "@/components/tour-packages/TourPackageForm";
import type { TourPackageItineraryDayInput } from "@/lib/tour-packages";
import type { FlightDetailRow, ItineraryRow } from "@/components/tour-queries/types";

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

function clip(value: string | null | undefined, max: number): string {
  const text = value ?? "";
  return text.length > max ? text.slice(0, max) : text;
}

export function mapAiDraftToPackageItineraries(
  data: AiItineraryDraft,
  _locationId: string
): TourPackageItineraryDayInput[] {
  return (data.itineraries ?? []).map((day, index) => ({
    dayNumber: day.dayNumber ?? index + 1,
    itineraryTitle: clip(day.itineraryTitle ?? `Day ${index + 1}`, 500) || `Day ${index + 1}`,
    itineraryDescription: clip(day.itineraryDescription, 5000),
    mealsIncluded: clip(day.mealsIncluded, 200),
    activities: (day.activities ?? []).map((activity) => ({
      activityTitle: clip(activity.activityTitle, 5000),
      activityDescription: clip(activity.activityDescription, 10000),
      activityImages: activity.activityImages ?? [],
    })),
  }));
}

export function mapAiDraftToQueryItineraries(
  data: AiItineraryDraft,
  locationId: string
): ItineraryRow[] {
  return (data.itineraries ?? []).map((day, index) => ({
    id: `ai-draft-day-${index + 1}`,
    dayNumber: day.dayNumber ?? index + 1,
    days: String(day.dayNumber ?? index + 1),
    locationId,
    hotelId: null,
    itineraryTitle: day.itineraryTitle ?? "",
    itineraryDescription: day.itineraryDescription ?? "",
    mealsIncluded: day.mealsIncluded ?? "",
    roomAllocations: [],
    transportDetails: [],
    activities: (day.activities ?? []).map((activity) => ({
      activityTitle: activity.activityTitle ?? "",
      activityDescription: activity.activityDescription ?? "",
      activityImages: activity.activityImages ?? [],
    })),
  }));
}

function mapAiDraftToFlightDetails(data: AiItineraryDraft): FlightDetailRow[] {
  return (data.flightDetails ?? []).map((flight, index) => ({
    id: `ai-draft-flight-${index + 1}`,
    date: flight.date ?? "",
    flightName: flight.flightName ?? "",
    flightNumber: flight.flightNumber ?? "",
    from: flight.from ?? "",
    to: flight.to ?? "",
    departureTime: flight.departureTime ?? "",
    arrivalTime: flight.arrivalTime ?? "",
    flightDuration: flight.flightDuration ?? "",
    images: (flight.images ?? [])
      .map((img) => ({ url: String(img?.url ?? "") }))
      .filter((img) => img.url.trim().length > 0),
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
  flightDetails: FlightDetailRow[];
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
    tourPackageQueryName:
      buildTourQueryName(data.customerName, data.tourPackageName) ||
      data.tourPackageName ||
      "",
    customerName: data.customerName ?? "",
    numAdults: data.numAdults != null ? String(data.numAdults) : "",
    numChild512: data.numChildren != null ? String(data.numChildren) : "",
    tourStartsFrom: start,
    locationId,
    transport: data.transport ?? "",
    pickupLocation: data.pickup_location ?? "",
    dropLocation: data.drop_location ?? "",
    flightDetails: mapAiDraftToFlightDetails(data),
    itineraries: mapAiDraftToQueryItineraries(data, locationId),
    policies: {},
  };
}

/** In-memory handoff so React Strict Mode remounts still see a just-consumed draft. */
const draftHandoffCache = new Map<AiDraftStorageKey, StoredAiDraft>();

export async function storeAiDraft(
  key: AiDraftStorageKey,
  payload: { locationId: string; data: AiItineraryDraft }
): Promise<void> {
  draftHandoffCache.delete(key);
  const stored: StoredAiDraft = {
    timestamp: new Date().toISOString(),
    locationId: payload.locationId,
    data: { ...payload.data, locationId: payload.locationId },
  };
  await writeDraftRaw(key, JSON.stringify(stored));
}

/**
 * Moves a draft from persistent storage into an in-memory handoff cache, then
 * deletes the persisted copy. Safe to call multiple times (e.g. Strict Mode /
 * effect re-runs): later calls return the cached draft until acknowledged.
 */
export async function consumeAiDraft(
  key: AiDraftStorageKey
): Promise<StoredAiDraft | null> {
  const cached = draftHandoffCache.get(key);
  if (cached) return cached;

  const raw = await readDraftRaw(key);
  if (!raw) return null;
  await deleteDraftRaw(key);
  try {
    const parsed = JSON.parse(raw) as StoredAiDraft;
    draftHandoffCache.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/** Clears the in-memory handoff after the draft has been applied to form state. */
export function acknowledgeAiDraft(key: AiDraftStorageKey): void {
  draftHandoffCache.delete(key);
}

export async function peekAiDraft(key: AiDraftStorageKey): Promise<StoredAiDraft | null> {
  const cached = draftHandoffCache.get(key);
  if (cached) return cached;
  const raw = await readDraftRaw(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAiDraft;
  } catch {
    return null;
  }
}
