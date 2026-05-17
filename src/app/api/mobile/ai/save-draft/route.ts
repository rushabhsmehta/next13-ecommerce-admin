import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireMobileAdminPermission } from "@/app/api/mobile/lib/assert-mobile-admin-permission";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const activitySchema = z
  .object({
    activityTitle: z.string().optional().nullable(),
    activityDescription: z.string().optional().nullable(),
  })
  .passthrough();

const itinerarySchema = z
  .object({
    dayNumber: z.coerce.number().int().min(1).optional(),
    itineraryTitle: z.string().optional().nullable(),
    itineraryDescription: z.string().optional().nullable(),
    mealsIncluded: z.string().optional().nullable(),
    suggestedHotel: z.string().optional().nullable(),
    activities: z.array(activitySchema).optional(),
  })
  .passthrough();

const draftSchema = z
  .object({
    tourPackageName: z.string().min(1),
    tourCategory: z.string().optional().nullable(),
    tourPackageType: z.string().optional().nullable(),
    numDaysNight: z.string().optional().nullable(),
    transport: z.string().optional().nullable(),
    pickup_location: z.string().optional().nullable(),
    drop_location: z.string().optional().nullable(),
    estimatedBudget: z.any().optional(),
    itineraries: z.array(itinerarySchema).optional(),
    customerName: z.string().optional().nullable(),
    tourStartsFrom: z.string().optional().nullable(),
    numAdults: z.coerce.number().optional().nullable(),
    numChildren: z.coerce.number().optional().nullable(),
  })
  .passthrough();

const saveSchema = z.object({
  targetType: z.enum(["tourPackage", "tourPackageQuery"]),
  locationId: z.string().min(1, "Location is required"),
  draft: draftSchema,
});

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || `ai-package-${Date.now().toString(36)}`;
}

function budgetString(draft: z.infer<typeof draftSchema>): string | null {
  const budget = draft.estimatedBudget;
  if (!budget || typeof budget !== "object") return null;
  const perPerson = "perPerson" in budget ? String((budget as any).perPerson ?? "") : "";
  const total = "total" in budget ? String((budget as any).total ?? "") : "";
  return perPerson || total || null;
}

function dateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function itineraryCreates(locationId: string, draft: z.infer<typeof draftSchema>) {
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

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized", code: "AUTH" }, { status: 401 });
    }
    const guard = await requireMobileAdminPermission(userId, "aiWizards.write");
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    if (!key) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required", code: "IDEMPOTENCY_REQUIRED" },
        { status: 400 }
      );
    }

    const prior = await findPriorIdempotentEntityId("AiWizardSave", key);
    if (prior) {
      return NextResponse.json({ success: true, id: prior, idempotentReplay: true });
    }

    const parsed = saveSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid AI save payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const location = await prismadb.location.findUnique({
      where: { id: parsed.data.locationId },
      select: { id: true },
    });
    if (!location) {
      return NextResponse.json({ error: "Location not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const { targetType, locationId, draft } = parsed.data;
    const price = budgetString(draft);

    const saved =
      targetType === "tourPackage"
        ? await prismadb.tourPackage.create({
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
              slug: slugify(draft.tourPackageName),
              isFeatured: false,
              isArchived: false,
              itineraries: itineraryCreates(locationId, draft).length
                ? { create: itineraryCreates(locationId, draft) }
                : undefined,
            },
            select: { id: true, tourPackageName: true },
          })
        : await prismadb.tourPackageQuery.create({
            data: {
              locationId,
              tourPackageQueryName: draft.tourPackageName,
              customerName: draft.customerName || null,
              tourCategory: draft.tourCategory || "Domestic",
              tourPackageQueryType: draft.tourPackageType || "AI Draft",
              numDaysNight: draft.numDaysNight ?? null,
              transport: draft.transport ?? null,
              pickup_location: draft.pickup_location ?? null,
              drop_location: draft.drop_location ?? null,
              price,
              totalPrice: price,
              tourStartsFrom: dateOrNull(draft.tourStartsFrom),
              numAdults: draft.numAdults != null ? String(draft.numAdults) : null,
              numChild5to12: draft.numChildren != null ? String(draft.numChildren) : null,
              isFeatured: false,
              isArchived: false,
              itineraries: itineraryCreates(locationId, draft).length
                ? { create: itineraryCreates(locationId, draft) }
                : undefined,
            },
            select: { id: true, tourPackageQueryName: true },
          });

    await recordMobileAudit({
      userId,
      entityType: "AiWizardSave",
      entityId: saved.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key,
        targetType,
        locationId,
      },
    });

    return NextResponse.json({ success: true, targetType, id: saved.id });
  } catch (error) {
    console.log("[MOBILE_AI_SAVE_DRAFT_POST]", error);
    return NextResponse.json({ error: "Internal error", code: "SERVER" }, { status: 500 });
  }
}

