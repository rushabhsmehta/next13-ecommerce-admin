import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  POLICY_FIELD_KEYS,
  stringifyPolicyField,
} from "@/app/api/mobile/tour-packages/policy-fields";
import {
  formatTourPackageDetail,
  slugifyTourPackageName,
  tourPackageDetailInclude,
  tourPackageWriteSchema,
} from "@/app/api/mobile/tour-packages/schemas";

export const dynamic = "force-dynamic";

const patchSchema = tourPackageWriteSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: "At least one field is required" }
);

type ActivityPayload = {
  activityTitle?: string | null;
  activityDescription?: string | null;
  activityImages?: { url: string }[] | null;
};

function normalizeActivities(
  activities: ActivityPayload[] | undefined | null
): ActivityPayload[] {
  return (activities ?? [])
    .map((activity) => ({
      activityTitle: activity.activityTitle?.trim() || "",
      activityDescription: activity.activityDescription?.trim() || null,
      activityImages: (activity.activityImages ?? [])
        .map((img) => ({ url: img.url.trim() }))
        .filter((img) => img.url.length > 0),
    }))
    .filter(
      (activity) =>
        activity.activityTitle.length > 0 ||
        !!activity.activityDescription ||
        !!activity.activityImages?.length
    );
}

function buildActivitiesCreate(
  activities: ActivityPayload[] | undefined | null,
  locationId: string
) {
  const normalized = normalizeActivities(activities);
  if (normalized.length === 0) return undefined;
  return {
    create: normalized.map((activity) => ({
      locationId,
      activityTitle: activity.activityTitle || "",
      activityDescription: activity.activityDescription || null,
      activityImages: activity.activityImages?.length
        ? {
            create: activity.activityImages.map((img) => ({
              url: img.url,
            })),
          }
        : undefined,
    })),
  };
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;

    const row = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      include: tourPackageDetailInclude,
    });

    if (!row) {
      return NextResponse.json({ error: "Tour package not found" }, { status: 404 });
    }

    return NextResponse.json(formatTourPackageDetail(row));
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_ID_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("TourPackage", key);
    if (prior && prior === params.id) {
      const existing = await prismadb.tourPackage.findUnique({
        where: { id: prior },
        include: tourPackageDetailInclude,
      });
      return NextResponse.json({
        ...formatTourPackageDetail(existing!),
        idempotentReplay: true,
      });
    }

    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid tour package payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existing = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true, locationId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tour package not found" }, { status: 404 });
    }

    const v = parsed.data;
    const locationId = v.locationId ?? existing.locationId;
    if (v.locationId) {
      const location = await prismadb.location.findUnique({
        where: { id: v.locationId },
        select: { id: true },
      });
      if (!location) {
        return NextResponse.json({ error: "Location not found" }, { status: 404 });
      }
    }

    const data: Record<string, unknown> = {};
    if (v.locationId !== undefined) data.locationId = v.locationId;
    if (v.tourPackageName !== undefined) {
      data.tourPackageName = v.tourPackageName.trim();
      data.slug = slugifyTourPackageName(v.tourPackageName);
    }
    if (v.tourPackageType !== undefined) data.tourPackageType = v.tourPackageType?.trim() || null;
    if (v.tourCategory !== undefined) data.tourCategory = v.tourCategory?.trim() || "Domestic";
    if (v.numDaysNight !== undefined) data.numDaysNight = v.numDaysNight?.trim() || null;
    if (v.transport !== undefined) data.transport = v.transport?.trim() || null;
    if (v.pickup_location !== undefined) data.pickup_location = v.pickup_location?.trim() || null;
    if (v.drop_location !== undefined) data.drop_location = v.drop_location?.trim() || null;
    if (v.price !== undefined) data.price = v.price?.trim() || null;
    if (v.pricingSection !== undefined) {
      data.pricingSection = v.pricingSection.map((row) => ({
        name: row.name.trim(),
        price: row.price?.trim() || "",
        description: row.description?.trim() || "",
      }));
    }
    for (const key of POLICY_FIELD_KEYS) {
      if (v[key] !== undefined) {
        data[key] = stringifyPolicyField(v[key]);
      }
    }

    const updated = await prismadb.$transaction(async (tx) => {
      await tx.tourPackage.update({ where: { id: params.id }, data });

      if (v.images !== undefined) {
        await tx.images.deleteMany({ where: { tourPackageId: params.id } });
        if (v.images.length > 0) {
          await tx.images.createMany({
            data: v.images.map((img) => ({
              url: img.url.trim(),
              tourPackageId: params.id,
            })),
          });
        }
      }

      if (v.itineraries !== undefined) {
        const previousItineraries = await tx.itinerary.findMany({
          where: { tourPackageId: params.id },
          include: {
            activities: {
              include: {
                activityImages: { select: { url: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
        const activitiesByItineraryId = new Map(
          previousItineraries.map((day) => [day.id, day.activities])
        );
        const activitiesByDayNumber = new Map(
          previousItineraries
            .filter((day) => typeof day.dayNumber === "number")
            .map((day) => [day.dayNumber as number, day.activities])
        );

        await tx.itinerary.deleteMany({ where: { tourPackageId: params.id } });
        if (v.itineraries.length > 0) {
          for (const day of v.itineraries) {
            const activities =
              day.activities !== undefined
                ? day.activities
                : day.id
                  ? activitiesByItineraryId.get(day.id)
                  : activitiesByDayNumber.get(day.dayNumber);

            await tx.itinerary.create({
              data: {
                locationId,
                tourPackageId: params.id,
                dayNumber: day.dayNumber,
                days: String(day.dayNumber),
                itineraryTitle: day.itineraryTitle.trim(),
                itineraryDescription: day.itineraryDescription?.trim() || null,
                mealsIncluded: day.mealsIncluded?.trim() || null,
                activities: buildActivitiesCreate(activities, locationId),
              },
            });
          }
        }
      }

      return tx.tourPackage.findUnique({
        where: { id: params.id },
        include: tourPackageDetailInclude,
      });
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackage",
      entityId: params.id,
      action: "UPDATE",
      metadata: { idempotencyKey: key ?? undefined, fields: Object.keys(v) },
    });

    return NextResponse.json(formatTourPackageDetail(updated!));
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_ID_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;

    const existing = await prismadb.tourPackage.findUnique({
      where: { id: params.id },
      select: { id: true, tourPackageName: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Tour package not found" }, { status: 404 });
    }

    await prismadb.tourPackage.delete({
      where: { id: params.id },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackage",
      entityId: params.id,
      action: "DELETE",
      metadata: { tourPackageName: existing.tourPackageName },
    });

    return NextResponse.json({ deleted: true, id: params.id });
  } catch (error) {
    console.log("[MOBILE_TOUR_PACKAGES_ID_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
