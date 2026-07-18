import { z } from "zod";
import type { PrismaClient } from "@prisma/client";

export const aiWizardActivitySchema = z
  .object({
    activityTitle: z.string().optional().nullable(),
    activityDescription: z.string().optional().nullable(),
  })
  .passthrough();

export const aiWizardItinerarySchema = z
  .object({
    dayNumber: z.coerce.number().int().min(1).optional(),
    itineraryTitle: z.string().optional().nullable(),
    itineraryDescription: z.string().optional().nullable(),
    mealsIncluded: z.string().optional().nullable(),
    suggestedHotel: z.string().optional().nullable(),
    activities: z.array(aiWizardActivitySchema).optional(),
  })
  .passthrough();

export const aiWizardFlightDetailSchema = z
  .object({
    date: z.string().optional().nullable(),
    flightName: z.string().optional().nullable(),
    flightNumber: z.string().optional().nullable(),
    from: z.string().optional().nullable(),
    to: z.string().optional().nullable(),
    departureTime: z.string().optional().nullable(),
    arrivalTime: z.string().optional().nullable(),
    flightDuration: z.string().optional().nullable(),
    images: z
      .array(
        z.object({
          url: z.string().min(1),
        })
      )
      .optional(),
  })
  .passthrough();

export const aiWizardDraftSchema = z
  .object({
    tourPackageName: z.string().min(1),
    tourCategory: z.string().optional().nullable(),
    tourPackageType: z.string().optional().nullable(),
    numDaysNight: z.string().optional().nullable(),
    transport: z.string().optional().nullable(),
    pickup_location: z.string().optional().nullable(),
    drop_location: z.string().optional().nullable(),
    estimatedBudget: z.any().optional(),
    highlights: z.array(z.string()).optional(),
    itineraries: z.array(aiWizardItinerarySchema).optional(),
    flightDetails: z.array(aiWizardFlightDetailSchema).optional(),
    customerName: z.string().optional().nullable(),
    tourStartsFrom: z.string().optional().nullable(),
    numAdults: z.coerce.number().optional().nullable(),
    numChildren: z.coerce.number().optional().nullable(),
  })
  .passthrough();

export const aiWizardSaveSchema = z.object({
  targetType: z.enum(["tourPackage", "tourPackageQuery"]),
  locationId: z.string().min(1, "Location is required"),
  draft: aiWizardDraftSchema,
});

export type AiWizardDraft = z.infer<typeof aiWizardDraftSchema>;
export type AiWizardTargetType = z.infer<typeof aiWizardSaveSchema>["targetType"];

export function slugifyAiPackageName(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `ai-package-${Date.now().toString(36)}`;
}

export function budgetStringFromDraft(draft: AiWizardDraft): string | null {
  const budget = draft.estimatedBudget;
  if (!budget || typeof budget !== "object") return null;
  const perPerson = "perPerson" in budget ? String((budget as { perPerson?: unknown }).perPerson ?? "") : "";
  const total = "total" in budget ? String((budget as { total?: unknown }).total ?? "") : "";
  return perPerson || total || null;
}

export function dateOrNullFromDraft(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function buildItineraryCreates(locationId: string, draft: AiWizardDraft) {
  return (draft.itineraries ?? []).map((itinerary, index) => ({
    locationId,
    dayNumber: itinerary.dayNumber ?? index + 1,
    days: String(itinerary.dayNumber ?? index + 1),
    itineraryTitle: itinerary.itineraryTitle ?? `Day ${index + 1}`,
    itineraryDescription: itinerary.itineraryDescription ?? "",
    mealsIncluded: itinerary.mealsIncluded ?? null,
    activities: (itinerary.activities ?? []).length
      ? {
          create: itinerary.activities!.map((activity) => ({
            locationId,
            activityTitle: activity.activityTitle ?? "",
            activityDescription: activity.activityDescription ?? "",
          })),
        }
      : undefined,
  }));
}

function flightDetailHasContent(flight: AiWizardDraft["flightDetails"] extends (infer F)[] | undefined ? F : never) {
  return Boolean(
    flight &&
      [
        flight.date,
        flight.flightName,
        flight.flightNumber,
        flight.from,
        flight.to,
        flight.departureTime,
        flight.arrivalTime,
        flight.flightDuration,
      ].some((value) => String(value ?? "").trim().length > 0)
  ) || Boolean(flight?.images?.some((image) => image.url.trim().length > 0));
}

export function buildFlightDetailCreates(draft: AiWizardDraft) {
  return (draft.flightDetails ?? [])
    .filter(flightDetailHasContent)
    .map((flight) => {
      const imageRows = (flight.images ?? [])
        .map((image) => ({ url: image.url.trim() }))
        .filter((image) => image.url.length > 0);

      return {
        date: flight.date?.trim() || null,
        flightName: flight.flightName?.trim() || null,
        flightNumber: flight.flightNumber?.trim() || null,
        from: flight.from?.trim() || null,
        to: flight.to?.trim() || null,
        departureTime: flight.departureTime?.trim() || null,
        arrivalTime: flight.arrivalTime?.trim() || null,
        flightDuration: flight.flightDuration?.trim() || null,
        images: imageRows.length ? { create: imageRows } : undefined,
      };
    });
}

type SaveAiWizardDraftInput = z.infer<typeof aiWizardSaveSchema>;

export async function saveAiWizardDraft(
  db: PrismaClient,
  input: SaveAiWizardDraftInput
): Promise<{ id: string; targetType: AiWizardTargetType }> {
  const { targetType, locationId, draft } = input;
  const price = budgetStringFromDraft(draft);
  const itineraryRows = buildItineraryCreates(locationId, draft);
  const flightRows = buildFlightDetailCreates(draft);

  if (targetType === "tourPackage") {
    const saved = await db.tourPackage.create({
      data: {
        locationId,
        tourPackageName: draft.tourPackageName,
        tourCategory: draft.tourCategory || "Domestic",
        tourPackageType: draft.tourPackageType || "AI Draft",
        numDaysNight: draft.numDaysNight ?? null,
        transport: draft.transport ?? null,
        pickup_location: draft.pickup_location ?? null,
        drop_location: draft.drop_location ?? null,
        price,
        slug: slugifyAiPackageName(draft.tourPackageName),
        isFeatured: false,
        isArchived: false,
        itineraries: itineraryRows.length ? { create: itineraryRows } : undefined,
        flightDetails: flightRows.length ? { create: flightRows } : undefined,
      },
      select: { id: true },
    });
    return { id: saved.id, targetType };
  }

  const clientName = String(draft.customerName ?? "").trim();
  const packageOrQueryName = String(draft.tourPackageName ?? "").trim();
  const tourPackageQueryName =
    clientName &&
    packageOrQueryName &&
    !packageOrQueryName.toLowerCase().startsWith(clientName.toLowerCase())
      ? `${clientName} - ${packageOrQueryName}`
      : packageOrQueryName || clientName;

  const saved = await db.tourPackageQuery.create({
    data: {
      locationId,
      tourPackageQueryName,
      customerName: draft.customerName || null,
      tourCategory: draft.tourCategory || "Domestic",
      tourPackageQueryType: draft.tourPackageType || "AI Draft",
      numDaysNight: draft.numDaysNight ?? null,
      transport: draft.transport ?? null,
      pickup_location: draft.pickup_location ?? null,
      drop_location: draft.drop_location ?? null,
      price,
      totalPrice: price,
      tourStartsFrom: dateOrNullFromDraft(draft.tourStartsFrom),
      numAdults: draft.numAdults != null ? String(draft.numAdults) : null,
      numChild5to12: draft.numChildren != null ? String(draft.numChildren) : null,
      isFeatured: false,
      isArchived: false,
      itineraries: itineraryRows.length ? { create: itineraryRows } : undefined,
      flightDetails: flightRows.length ? { create: flightRows } : undefined,
    },
    select: { id: true },
  });
  return { id: saved.id, targetType };
}
