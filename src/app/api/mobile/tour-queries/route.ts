import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireSalesTripsRead,
  requireSalesTripsWrite,
  tourPackageQueryWhereForAssociate,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import { copyItineraryMedia } from "@/app/api/mobile/lib/copy-itinerary-media";
import { carryForwardInquiryCouponToTourQuery } from "@/lib/coupons";

export const dynamic = "force-dynamic";

function generateTpqNumber(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `TPQ-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

const createSchema = z.object({
  mode: z.enum(["inquiry", "package", "copy", "scratch"]),
  sourceId: z.string().min(1, "sourceId is required"),
  overrides: z
    .object({
      tourPackageQueryName: z.string().max(300).optional(),
      tourStartsFrom: z.string().optional(),
      tourEndsOn: z.string().optional(),
      numAdults: z.string().optional(),
      numChild5to12: z.string().optional(),
      numChild0to5: z.string().optional(),
      remarks: z.string().max(5000).optional(),
    })
    .optional(),
});

/** Clone a query/package's itineraries (+ room allocations + transport) onto a new query. */
async function cloneItineraries(
  tx: Prisma.TransactionClient,
  fromWhere: Prisma.ItineraryWhereInput,
  newQueryId: string
) {
  const itineraries = await tx.itinerary.findMany({
    where: fromWhere,
    include: {
      roomAllocations: true,
      transportDetails: true,
      itineraryImages: { select: { url: true } },
      activities: {
        include: { activityImages: { select: { url: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ dayNumber: "asc" }],
  });
  for (const it of itineraries) {
    const created = await tx.itinerary.create({
      data: {
        locationId: it.locationId,
        tourPackageQueryId: newQueryId,
        itineraryTitle: it.itineraryTitle,
        itineraryDescription: it.itineraryDescription,
        days: it.days,
        dayNumber: it.dayNumber,
        hotelId: it.hotelId,
        mealsIncluded: it.mealsIncluded,
        roomCategory: it.roomCategory,
        numberofRooms: it.numberofRooms,
        mealPlanId: it.mealPlanId,
        occupancyTypeId: it.occupancyTypeId,
        roomTypeId: it.roomTypeId,
      },
    });
    await copyItineraryMedia(tx, it, created.id, it.locationId);
    if (it.roomAllocations.length) {
      await tx.roomAllocation.createMany({
        data: it.roomAllocations.map((ra) => ({
          itineraryId: created.id,
          roomTypeId: ra.roomTypeId,
          occupancyTypeId: ra.occupancyTypeId,
          mealPlanId: ra.mealPlanId,
          quantity: ra.quantity,
          guestNames: ra.guestNames,
          notes: ra.notes,
          customRoomType: ra.customRoomType,
          voucherNumber: ra.voucherNumber,
        })),
      });
    }
    if (it.transportDetails.length) {
      await tx.transportDetail.createMany({
        data: it.transportDetails.map((td) => ({
          itineraryId: created.id,
          vehicleTypeId: td.vehicleTypeId,
          quantity: td.quantity,
          capacity: td.capacity,
          description: td.description,
          isAirportPickupRequired: td.isAirportPickupRequired,
          isAirportDropRequired: td.isAirportDropRequired,
          pickupLocation: td.pickupLocation,
          dropLocation: td.dropLocation,
          requirementDate: td.requirementDate,
          notes: td.notes,
        })),
      });
    }
  }
}

/**
 * Lightweight tour-query list for mobile. Supports search, status filter,
 * pagination. Status values:
 *   - "all" (default), "confirmed" (isFeatured=true), "draft" (isFeatured=false),
 *   - "archived" (isArchived=true)
 *
 * Enforces `salesTrips.read` (mobile routes skip CRM path RBAC). Associates
 * are scoped to their partner queries only (direct `associatePartnerId` or
 * linked inquiry).
 */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = (searchParams.get("status") ?? "all").toLowerCase();
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "25", 10);
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100);
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0);

    const parts: Prisma.TourPackageQueryWhereInput[] = [];

    if (access.isAssociate && access.associatePartnerId) {
      parts.push(tourPackageQueryWhereForAssociate(access.associatePartnerId));
    } else {
      const staffAssociateFilter = searchParams.get("associatePartnerId")?.trim();
      if (staffAssociateFilter) {
        parts.push({ associatePartnerId: staffAssociateFilter });
      }
    }

    if (status === "confirmed") {
      parts.push({ isFeatured: true, isArchived: false });
    } else if (status === "draft") {
      parts.push({ isFeatured: false, isArchived: false });
    } else if (status === "archived") {
      parts.push({ isArchived: true });
    } else {
      parts.push({ isArchived: false });
    }

    if (search) {
      parts.push({
        OR: [
          { tourPackageQueryName: { contains: search } },
          { tourPackageQueryNumber: { contains: search } },
          { customerName: { contains: search } },
          { customerNumber: { contains: search } },
        ],
      });
    }

    const where: Prisma.TourPackageQueryWhereInput =
      parts.length === 1 ? parts[0]! : { AND: parts };

    const [queries, total] = await Promise.all([
      prismadb.tourPackageQuery.findMany({
        where,
        select: {
          id: true,
          tourPackageQueryNumber: true,
          tourPackageQueryName: true,
          tourPackageQueryType: true,
          customerName: true,
          customerNumber: true,
          numDaysNight: true,
          numAdults: true,
          tourStartsFrom: true,
          tourEndsOn: true,
          totalPrice: true,
          isFeatured: true,
          isArchived: true,
          confirmedVariantId: true,
          updatedAt: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
          associatePartner: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prismadb.tourPackageQuery.count({ where }),
    ]);

    return NextResponse.json({
      queries,
      total,
      hasMore: offset + queries.length < total,
      nextOffset: offset + queries.length,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERIES_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * Create a tour-package query from an inquiry, a tour package, or by copying
 * an existing query. Requires `salesTrips.write`. Associates may only create
 * from their own inquiries/queries and the new query is bound to their
 * partner id (row scope enforced like the rest of the module).
 *
 * Heavy nested itinerary creation is reused via `cloneItineraries` for the
 * package/copy modes; from-inquiry seeds core fields and leaves itinerary
 * building to the native editor (PATCH /api/mobile/tour-queries/[id]).
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const { mode, sourceId, overrides } = parsed.data;
    const assocId =
      access.isAssociate && access.associatePartnerId
        ? access.associatePartnerId
        : null;

    const number = generateTpqNumber();
    let createdId: string;

    if (mode === "inquiry") {
      const inquiry = await prismadb.inquiry.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          customerName: true,
          customerMobileNumber: true,
          locationId: true,
          numAdults: true,
          numChildren5to11: true,
          numChildrenBelow5: true,
          journeyDate: true,
          remarks: true,
          associatePartnerId: true,
        },
      });
      if (!inquiry) return new NextResponse("Inquiry not found", { status: 404 });
      if (assocId && inquiry.associatePartnerId !== assocId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
      const created = await prismadb.tourPackageQuery.create({
        data: {
          locationId: inquiry.locationId,
          inquiryId: inquiry.id,
          associatePartnerId: assocId ?? inquiry.associatePartnerId ?? null,
          tourPackageQueryNumber: number,
          tourPackageQueryName:
            overrides?.tourPackageQueryName ||
            `${inquiry.customerName} – Query`,
          tourPackageQueryType: "Domestic",
          customerName: inquiry.customerName,
          customerNumber: inquiry.customerMobileNumber,
          numAdults: overrides?.numAdults ?? String(inquiry.numAdults ?? ""),
          numChild5to12:
            overrides?.numChild5to12 ?? String(inquiry.numChildren5to11 ?? ""),
          numChild0to5:
            overrides?.numChild0to5 ?? String(inquiry.numChildrenBelow5 ?? ""),
          tourStartsFrom: overrides?.tourStartsFrom
            ? new Date(overrides.tourStartsFrom)
            : inquiry.journeyDate ?? null,
          tourEndsOn: overrides?.tourEndsOn
            ? new Date(overrides.tourEndsOn)
            : null,
          remarks: overrides?.remarks ?? inquiry.remarks ?? null,
          isFeatured: false,
          isArchived: false,
        },
        select: { id: true },
      });
      createdId = created.id;
    } else if (mode === "package") {
      const pkg = await prismadb.tourPackage.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          tourPackageName: true,
          locationId: true,
          numDaysNight: true,
          tourPackageType: true,
          price: true,
          inclusions: true,
          exclusions: true,
          importantNotes: true,
          paymentPolicy: true,
          usefulTip: true,
          cancellationPolicy: true,
          airlineCancellationPolicy: true,
          termsconditions: true,
          kitchenGroupPolicy: true,
        },
      });
      if (!pkg) return new NextResponse("Package not found", { status: 404 });
      createdId = await prismadb.$transaction(async (tx) => {
        const created = await tx.tourPackageQuery.create({
          data: {
            locationId: pkg.locationId,
            associatePartnerId: assocId,
            tourPackageQueryNumber: number,
            tourPackageQueryName:
              overrides?.tourPackageQueryName ||
              `${pkg.tourPackageName ?? "Package"} – Query`,
            tourPackageQueryType: pkg.tourPackageType ?? "Domestic",
            numDaysNight: pkg.numDaysNight,
            price: pkg.price,
            inclusions: pkg.inclusions ?? undefined,
            exclusions: pkg.exclusions ?? undefined,
            importantNotes: pkg.importantNotes ?? undefined,
            paymentPolicy: pkg.paymentPolicy ?? undefined,
            usefulTip: pkg.usefulTip ?? undefined,
            cancellationPolicy: pkg.cancellationPolicy ?? undefined,
            airlineCancellationPolicy:
              pkg.airlineCancellationPolicy ?? undefined,
            termsconditions: pkg.termsconditions ?? undefined,
            kitchenGroupPolicy: pkg.kitchenGroupPolicy ?? undefined,
            numAdults: overrides?.numAdults,
            tourStartsFrom: overrides?.tourStartsFrom
              ? new Date(overrides.tourStartsFrom)
              : null,
            tourEndsOn: overrides?.tourEndsOn
              ? new Date(overrides.tourEndsOn)
              : null,
            remarks: overrides?.remarks ?? null,
            isFeatured: false,
            isArchived: false,
          },
          select: { id: true },
        });
        await cloneItineraries(
          tx,
          { tourPackageId: pkg.id },
          created.id
        );
        return created.id;
      }, {
        maxWait: 20000,
        timeout: 40000,
      });
    } else if (mode === "copy") {
      // copy
      const src = await prismadb.tourPackageQuery.findUnique({
        where: { id: sourceId },
        select: {
          id: true,
          locationId: true,
          tourPackageQueryName: true,
          tourPackageQueryType: true,
          tourCategory: true,
          numDaysNight: true,
          numAdults: true,
          numChild5to12: true,
          numChild0to5: true,
          price: true,
          totalPrice: true,
          customerName: true,
          customerNumber: true,
          remarks: true,
          inclusions: true,
          exclusions: true,
          importantNotes: true,
          paymentPolicy: true,
          usefulTip: true,
          cancellationPolicy: true,
          airlineCancellationPolicy: true,
          termsconditions: true,
          kitchenGroupPolicy: true,
          selectedVariantIds: true,
          variantHotelOverrides: true,
          variantRoomAllocations: true,
          variantTransportDetails: true,
          variantPricingData: true,
          customQueryVariants: true,
          associatePartnerId: true,
          inquiry: { select: { associatePartnerId: true } },
        },
      });
      if (!src) return new NextResponse("Query not found", { status: 404 });
      if (
        assocId &&
        src.associatePartnerId !== assocId &&
        src.inquiry?.associatePartnerId !== assocId
      ) {
        return new NextResponse("Forbidden", { status: 403 });
      }
      createdId = await prismadb.$transaction(async (tx) => {
        const created = await tx.tourPackageQuery.create({
          data: {
            locationId: src.locationId,
            associatePartnerId: assocId ?? src.associatePartnerId ?? null,
            tourPackageQueryNumber: number,
            tourPackageQueryName:
              overrides?.tourPackageQueryName ||
              `${src.tourPackageQueryName ?? "Query"} (Copy)`,
            tourPackageQueryType: src.tourPackageQueryType,
            tourCategory: src.tourCategory ?? "Domestic",
            numDaysNight: src.numDaysNight,
            numAdults: overrides?.numAdults ?? src.numAdults,
            numChild5to12: overrides?.numChild5to12 ?? src.numChild5to12,
            numChild0to5: overrides?.numChild0to5 ?? src.numChild0to5,
            price: src.price,
            totalPrice: src.totalPrice,
            customerName: src.customerName,
            customerNumber: src.customerNumber,
            remarks: overrides?.remarks ?? src.remarks,
            inclusions: src.inclusions ?? undefined,
            exclusions: src.exclusions ?? undefined,
            importantNotes: src.importantNotes ?? undefined,
            paymentPolicy: src.paymentPolicy ?? undefined,
            usefulTip: src.usefulTip ?? undefined,
            cancellationPolicy: src.cancellationPolicy ?? undefined,
            airlineCancellationPolicy:
              src.airlineCancellationPolicy ?? undefined,
            termsconditions: src.termsconditions ?? undefined,
            kitchenGroupPolicy: src.kitchenGroupPolicy ?? undefined,
            selectedVariantIds: src.selectedVariantIds ?? undefined,
            variantHotelOverrides: src.variantHotelOverrides ?? undefined,
            variantRoomAllocations: src.variantRoomAllocations ?? undefined,
            variantTransportDetails: src.variantTransportDetails ?? undefined,
            variantPricingData: src.variantPricingData ?? undefined,
            customQueryVariants: src.customQueryVariants ?? undefined,
            tourStartsFrom: overrides?.tourStartsFrom
              ? new Date(overrides.tourStartsFrom)
              : null,
            tourEndsOn: overrides?.tourEndsOn
              ? new Date(overrides.tourEndsOn)
              : null,
            isFeatured: false,
            isArchived: false,
          },
          select: { id: true },
        });
        await cloneItineraries(
          tx,
          { tourPackageQueryId: src.id },
          created.id
        );
        return created.id;
      }, {
        maxWait: 20000,
        timeout: 40000,
      });
    } else {
      // scratch
      const firstLocation = await prismadb.location.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (!firstLocation) {
        return new NextResponse("No active locations found to assign to new query", { status: 400 });
      }

      const created = await prismadb.tourPackageQuery.create({
        data: {
          locationId: firstLocation.id,
          associatePartnerId: assocId,
          tourPackageQueryNumber: number,
          tourPackageQueryName:
            overrides?.tourPackageQueryName ||
            `New Query – ${number}`,
          tourPackageQueryType: "Domestic",
          numAdults: overrides?.numAdults || "0",
          numChild5to12: overrides?.numChild5to12 || "0",
          numChild0to5: overrides?.numChild0to5 || "0",
          tourStartsFrom: overrides?.tourStartsFrom
            ? new Date(overrides.tourStartsFrom)
            : null,
          tourEndsOn: overrides?.tourEndsOn
            ? new Date(overrides.tourEndsOn)
            : null,
          remarks: overrides?.remarks ?? null,
          isFeatured: false,
          isArchived: false,
        },
        select: { id: true },
      });
      createdId = created.id;
    }

    if (mode === "inquiry") {
      try {
        const createdQuery = await prismadb.tourPackageQuery.findUnique({
          where: { id: createdId },
          select: {
            inquiryId: true,
            totalPrice: true,
            price: true,
            locationId: true,
            selectedTemplateId: true,
            tourCategory: true,
            customerName: true,
            customerNumber: true,
            tourStartsFrom: true,
            numAdults: true,
          },
        });
        if (createdQuery?.inquiryId) {
          await carryForwardInquiryCouponToTourQuery({
            inquiryId: createdQuery.inquiryId,
            tourPackageQueryId: createdId,
            bookingAmount:
              Number.parseFloat(String(createdQuery.totalPrice || createdQuery.price || "0")) ||
              null,
            locationId: createdQuery.locationId,
            tourPackageId: createdQuery.selectedTemplateId,
            tourCategory: createdQuery.tourCategory,
            customerName: createdQuery.customerName,
            customerMobile: createdQuery.customerNumber,
            travelDate: createdQuery.tourStartsFrom,
            numAdults: createdQuery.numAdults,
          });
        }
      } catch (couponError) {
        console.log("[MOBILE_TOUR_QUERIES_COUPON_CARRY_FORWARD]", couponError);
      }
    }

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQuery",
      entityId: createdId,
      action: "CREATE",
      metadata: { mode, sourceId, number },
    });

    return NextResponse.json(
      { id: createdId, tourPackageQueryNumber: number },
      { status: 201 }
    );
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERIES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
