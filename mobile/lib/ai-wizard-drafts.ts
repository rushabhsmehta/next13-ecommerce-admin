import * as SecureStore from "expo-secure-store";
import type { AiItineraryDraft } from "@/lib/ai-wizards";
import { buildTourQueryName } from "@/lib/tour-query-label";
import type { TourPackageItineraryDayInput } from "@/lib/tour-packages";
import type { FlightDetailRow, ItineraryRow } from "@/components/tour-queries/types";

/** Avoid importing TourPackageForm (circular) — keep seed shape local. */
export type AiPackageFormSeed = {
  locationId: string;
  locationLabel: string;
  tourPackageName: string;
  tourPackageType: string;
  tourCategory: string;
  numDaysNight: string;
  transport: string;
  pickup_location: string;
  drop_location: string;
  price: string;
  itineraries: TourPackageItineraryDayInput[];
  images: { url: string }[];
  pricingSection: { name: string; price?: string | null; description?: string | null }[];
  inclusions: string[];
  exclusions: string[];
  importantNotes: string[];
  paymentPolicy: string[];
  usefulTip: string[];
  cancellationPolicy: string[];
  airlineCancellationPolicy: string[];
  termsconditions: string[];
  kitchenGroupPolicy: string[];
};

const SECURE_DRAFT_PREFIX = "ai-draft:";

type DraftAsyncStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/** Cached probe — never re-import after a failed native check (import throws fatally on some RN builds). */
let asyncStorageCache: DraftAsyncStorage | null | undefined;

/**
 * AsyncStorage's JS module throws at import-time when the native module is missing,
 * and on bridgeless RN that can destroy the React host even inside try/catch.
 * Only import when TurboModuleRegistry / NativeModules reports the native module.
 */
function hasNativeAsyncStorage(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RN = require("react-native") as {
      NativeModules?: { RNCAsyncStorage?: unknown };
      TurboModuleRegistry?: { get?: (name: string) => unknown };
    };
    if (RN.TurboModuleRegistry?.get?.("RNCAsyncStorage")) return true;
    if (RN.NativeModules?.RNCAsyncStorage) return true;
    return false;
  } catch {
    return false;
  }
}

async function getAsyncStorage(): Promise<DraftAsyncStorage | null> {
  if (asyncStorageCache !== undefined) return asyncStorageCache;
  if (!hasNativeAsyncStorage()) {
    asyncStorageCache = null;
    return null;
  }
  try {
    const mod = await import("@react-native-async-storage/async-storage");
    const storage = (mod.default ?? null) as DraftAsyncStorage | null;
    asyncStorageCache = storage;
    return storage;
  } catch {
    asyncStorageCache = null;
    return null;
  }
}

async function readDraftRaw(key: string): Promise<string | null> {
  const asyncStorage = await getAsyncStorage();
  if (asyncStorage) {
    try {
      const value = await asyncStorage.getItem(key);
      if (value != null) return value;
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
  const asyncStorage = await getAsyncStorage();
  if (asyncStorage) {
    try {
      await asyncStorage.setItem(key, value);
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
  const asyncStorage = await getAsyncStorage();
  if (asyncStorage) {
    try {
      await asyncStorage.removeItem(key);
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

function clip(value: string | null | undefined, max: number): string {
  const text = value ?? "";
  return text.length > max ? text.slice(0, max) : text;
}

/** Normalize AI activity shapes (objects, strings, title/description aliases). */
export function normalizeAiActivities(
  activities: unknown
): NonNullable<TourPackageItineraryDayInput["activities"]> {
  if (!Array.isArray(activities) || activities.length === 0) return [];

  return activities.flatMap((act, index) => {
    if (typeof act === "string") {
      const title = act.trim();
      if (!title) return [];
      return [
        {
          activityTitle: clip(title, 5000),
          activityDescription: "",
          activityImages: [] as { url: string }[],
        },
      ];
    }
    if (!act || typeof act !== "object") return [];
    const row = act as Record<string, unknown>;
    const title = String(
      row.activityTitle ?? row.title ?? row.name ?? `Activity ${index + 1}`
    ).trim();
    const description = String(
      row.activityDescription ?? row.description ?? ""
    );
    const images = Array.isArray(row.activityImages)
      ? row.activityImages
          .map((img) => {
            if (typeof img === "string") return { url: img.trim() };
            if (img && typeof img === "object" && "url" in img) {
              return { url: String((img as { url?: unknown }).url ?? "").trim() };
            }
            return { url: "" };
          })
          .filter((img) => img.url.length > 0)
      : [];

    if (!title && !description.trim()) return [];
    return [
      {
        activityTitle: clip(title || `Activity ${index + 1}`, 5000),
        activityDescription: clip(description, 10000),
        activityImages: images,
      },
    ];
  });
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
    activities: normalizeAiActivities(day.activities),
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
    activities: normalizeAiActivities(day.activities).map((activity) => ({
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
): Partial<AiPackageFormSeed> {
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

/** In-memory handoff so navigation + Strict Mode remounts keep the draft. */
const draftHandoffCache = new Map<AiDraftStorageKey, StoredAiDraft>();

/** Synchronous read of the in-memory handoff (same JS session after storeAiDraft). */
export function getAiDraftHandoff(key: AiDraftStorageKey): StoredAiDraft | null {
  return draftHandoffCache.get(key) ?? null;
}

/**
 * Stores draft in memory immediately (required for same-session Create flow),
 * then best-effort persists. Large AI itineraries often exceed SecureStore limits;
 * memory handoff ensures Create new package still receives itineraries/activities.
 */
export async function storeAiDraft(
  key: AiDraftStorageKey,
  payload: { locationId: string; data: AiItineraryDraft }
): Promise<boolean> {
  const stored: StoredAiDraft = {
    timestamp: new Date().toISOString(),
    locationId: payload.locationId,
    data: { ...payload.data, locationId: payload.locationId },
  };
  draftHandoffCache.set(key, stored);
  // Persist in background so navigation is not blocked by large AsyncStorage writes.
  void writeDraftRaw(key, JSON.stringify(stored))
    .then((persisted) => {
      if (!persisted) {
        console.warn(
          `[ai-wizard-drafts] Persistence failed for ${key}; using in-memory handoff only`
        );
      }
    })
    .catch(() => {
      /* never let persistence reject kill the JS runtime */
    });
  return true;
}

/**
 * Reads draft from memory first, then storage. Safe to call multiple times
 * (Strict Mode / effect re-runs) until acknowledgeAiDraft().
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

/** Clears the in-memory handoff after the draft has been applied/saved. */
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
