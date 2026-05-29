import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const stringArray = z.array(z.string()).optional();
const roomAllocationSchema = z.object({
  id: z.string().optional(),
  roomTypeId: z.string().optional(),
  occupancyTypeId: z.string(),
  mealPlanId: z.string().optional().nullable(),
  quantity: z.number().int().optional(),
  customRoomType: z.string().optional().nullable(),
});

const patchSchema = z.object({
  tourPackageQueryName: z.string().max(300).optional(),
  customerName: z.string().max(200).optional(),
  customerNumber: z.string().max(40).optional(),
  numAdults: z.string().max(10).optional(),
  numChild5to12: z.string().max(10).optional(),
  numChild0to5: z.string().max(10).optional(),
  tourStartsFrom: z.string().optional().nullable(),
  tourEndsOn: z.string().optional().nullable(),
  remarks: z.string().max(5000).optional().nullable(),
  inclusions: stringArray,
  exclusions: stringArray,
  importantNotes: stringArray,
  paymentPolicy: stringArray,
  usefulTip: stringArray,
  cancellationPolicy: stringArray,
  airlineCancellationPolicy: stringArray,
  termsconditions: stringArray,
  kitchenGroupPolicy: stringArray,
  itineraries: z
    .array(
      z.object({
        id: z.string().optional(),
        dayNumber: z.number().int().optional(),
        days: z.string().optional(),
        locationId: z.string().optional(),
        hotelId: z.string().optional().nullable(),
        itineraryTitle: z.string().optional().nullable(),
        itineraryDescription: z.string().optional().nullable(),
        mealsIncluded: z.string().optional().nullable(),
        roomAllocations: z.array(roomAllocationSchema).optional(),
      })
    )
    .optional(),
});

/**
 * Try to parse a value that may be a JSON-encoded string array (legacy storage
 * pattern used across tourPackageQuery policy fields) and return a clean
 * string[] for the mobile UI. Falls back to wrapping a non-empty plain string
 * in a single-element array, or returns [] when unset.
 */
function parsePolicyField(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string" && v.trim().length > 0) as string[];
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => (typeof v === "string" ? v : typeof v === "object" && v && "text" in v ? String((v as { text: unknown }).text) : ""))
        .filter((v) => v.trim().length > 0);
    }
  } catch {
    /* not JSON; fall through */
  }
  return [trimmed];
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    if (!params.id) return new NextResponse("Missing id", { status: 400 });

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        tourPackageQueryNumber: true,
        tourPackageQueryName: true,
        tourPackageQueryType: true,
        tourCategory: true,
        customerName: true,
        customerNumber: true,
        numDaysNight: true,
        period: true,
        tourStartsFrom: true,
        tourEndsOn: true,
        numAdults: true,
        numChild5to12: true,
        numChild0to5: true,
        transport: true,
        pickup_location: true,
        drop_location: true,
        price: true,
        pricePerAdult: true,
        pricePerChildOrExtraBed: true,
        pricePerChild5to12YearsNoBed: true,
        pricePerChildwithSeatBelow5Years: true,
        totalPrice: true,
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
        isFeatured: true,
        isArchived: true,
        associatePartnerId: true,
        confirmedVariantId: true,
        assignedTo: true,
        assignedToMobileNumber: true,
        assignedToEmail: true,
        createdAt: true,
        updatedAt: true,
        location: { select: { id: true, label: true } },
        associatePartner: { select: { id: true, name: true } },
        inquiry: {
          select: {
            id: true,
            customerName: true,
            customerMobileNumber: true,
            status: true,
            associatePartnerId: true,
            roomAllocations: {
              select: {
                id: true,
                quantity: true,
                customRoomType: true,
                roomTypeId: true,
                occupancyTypeId: true,
                mealPlanId: true,
                roomType: { select: { id: true, name: true } },
                occupancyType: { select: { id: true, name: true } },
                mealPlan: { select: { id: true, name: true } },
              },
            },
          },
        },
        flightDetails: {
          select: {
            id: true,
            date: true,
            flightName: true,
            flightNumber: true,
            from: true,
            to: true,
            departureTime: true,
            arrivalTime: true,
            flightDuration: true,
          },
          orderBy: { createdAt: "asc" },
        },
        queryVariantSnapshots: {
          select: {
            id: true,
            name: true,
            sortOrder: true,
            sourceVariantId: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        itineraries: {
          select: {
            id: true,
            dayNumber: true,
            days: true,
            locationId: true,
            itineraryTitle: true,
            itineraryDescription: true,
            mealsIncluded: true,
            hotel: { select: { id: true, name: true } },
            roomAllocations: {
              select: {
                id: true,
                quantity: true,
                customRoomType: true,
                roomTypeId: true,
                occupancyTypeId: true,
                mealPlanId: true,
                roomType: { select: { id: true, name: true } },
                occupancyType: { select: { id: true, name: true } },
                mealPlan: { select: { id: true, name: true } },
              },
            },
            transportDetails: {
              select: {
                id: true,
                quantity: true,
                description: true,
                vehicleType: { select: { name: true } },
              },
            },
          },
          orderBy: [{ dayNumber: "asc" }, { days: "asc" }],
        },
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });

    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const response = {
      ...tpq,
      inclusionsList: parsePolicyField(tpq.inclusions),
      exclusionsList: parsePolicyField(tpq.exclusions),
      importantNotesList: parsePolicyField(tpq.importantNotes),
      paymentPolicyList: parsePolicyField(tpq.paymentPolicy),
      usefulTipList: parsePolicyField(tpq.usefulTip),
      cancellationPolicyList: parsePolicyField(tpq.cancellationPolicy),
      airlineCancellationPolicyList: parsePolicyField(tpq.airlineCancellationPolicy),
      termsconditionsList: parsePolicyField(tpq.termsconditions),
      kitchenGroupPolicyList: parsePolicyField(tpq.kitchenGroupPolicy),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * Native edit for a tour query: core fields, policy text blocks (stored as
 * JSON string arrays), and per-day itinerary text (title / description /
 * meals). Hotel, room allocation and transport editing stay in the web hotel
 * editor (linked from the detail screen) — they require pricing-aware nested
 * forms outside this slice. Requires `salesTrips.write` + associate scope.
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const existing = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        itineraries: { select: { id: true } },
      },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, existing)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const data: Record<string, unknown> = {};
    if (v.tourPackageQueryName !== undefined)
      data.tourPackageQueryName = v.tourPackageQueryName;
    if (v.customerName !== undefined) data.customerName = v.customerName;
    if (v.customerNumber !== undefined) data.customerNumber = v.customerNumber;
    if (v.numAdults !== undefined) data.numAdults = v.numAdults;
    if (v.numChild5to12 !== undefined) data.numChild5to12 = v.numChild5to12;
    if (v.numChild0to5 !== undefined) data.numChild0to5 = v.numChild0to5;
    if (v.remarks !== undefined) data.remarks = v.remarks;
    if (v.tourStartsFrom !== undefined)
      data.tourStartsFrom = v.tourStartsFrom ? new Date(v.tourStartsFrom) : null;
    if (v.tourEndsOn !== undefined)
      data.tourEndsOn = v.tourEndsOn ? new Date(v.tourEndsOn) : null;

    const policyKeys = [
      "inclusions",
      "exclusions",
      "importantNotes",
      "paymentPolicy",
      "usefulTip",
      "cancellationPolicy",
      "airlineCancellationPolicy",
      "termsconditions",
      "kitchenGroupPolicy",
    ] as const;
    for (const key of policyKeys) {
      const val = v[key];
      if (val !== undefined) {
        data[key] = val.filter((s) => s.trim().length > 0);
      }
    }

    await prismadb.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.tourPackageQuery.update({ where: { id }, data });
      }
      
      if (v.itineraries !== undefined) {
        // Step 1: Find existing itineraries for this tourPackageQuery
        const existingItins = await tx.itinerary.findMany({
          where: { tourPackageQueryId: id },
          select: { id: true }
        });
        const existingIds = new Set(existingItins.map((item: any) => item.id));

        // Step 2: Determine which ones to delete
        const incomingItinsWithIds = v.itineraries.filter((it: any) => it.id && existingIds.has(it.id));
        const incomingIds = new Set(incomingItinsWithIds.map((it: any) => it.id));
        const idsToDelete = Array.from(existingIds).filter((exId) => !incomingIds.has(exId));

        if (idsToDelete.length > 0) {
          await tx.itinerary.deleteMany({
            where: { id: { in: idsToDelete } }
          });
        }

        // Step 3: Process incoming itineraries
        for (const it of v.itineraries) {
          if (it.id && existingIds.has(it.id)) {
            // Update existing day
            await tx.itinerary.update({
              where: { id: it.id },
              data: {
                dayNumber: it.dayNumber,
                days: it.days || (it.dayNumber ? String(it.dayNumber) : undefined),
                locationId: it.locationId,
                hotelId: it.hotelId,
                itineraryTitle: it.itineraryTitle,
                itineraryDescription: it.itineraryDescription,
                mealsIncluded: it.mealsIncluded,
              }
            });

            // Recreate room allocations
            await tx.roomAllocation.deleteMany({
              where: { itineraryId: it.id }
            });

            if (it.roomAllocations && it.roomAllocations.length > 0) {
              for (const ra of it.roomAllocations) {
                await tx.roomAllocation.create({
                  data: {
                    itineraryId: it.id,
                    roomTypeId: ra.roomTypeId || "4ae23712-19f7-4035-9db9-4d0df85d64ea",
                    occupancyTypeId: ra.occupancyTypeId,
                    mealPlanId: ra.mealPlanId,
                    quantity: ra.quantity ?? 1,
                    customRoomType: ra.customRoomType || ""
                  }
                });
              }
            }
          } else {
            // Create new day
            // Fallback locationId to query locationId if not provided
            let targetLocationId = it.locationId;
            if (!targetLocationId) {
              const query = await tx.tourPackageQuery.findUnique({
                where: { id },
                select: { locationId: true }
              });
              targetLocationId = query?.locationId;
            }
            if (!targetLocationId) {
              throw new Error("locationId is required for itinerary days");
            }

            const createdItinerary = await tx.itinerary.create({
              data: {
                tourPackageQueryId: id,
                dayNumber: it.dayNumber,
                days: it.days || (it.dayNumber ? String(it.dayNumber) : undefined),
                locationId: targetLocationId,
                hotelId: it.hotelId,
                itineraryTitle: it.itineraryTitle || "",
                itineraryDescription: it.itineraryDescription || "",
                mealsIncluded: it.mealsIncluded || "",
              }
            });

            if (it.roomAllocations && it.roomAllocations.length > 0) {
              for (const ra of it.roomAllocations) {
                await tx.roomAllocation.create({
                  data: {
                    itineraryId: createdItinerary.id,
                    roomTypeId: ra.roomTypeId || "4ae23712-19f7-4035-9db9-4d0df85d64ea",
                    occupancyTypeId: ra.occupancyTypeId,
                    mealPlanId: ra.mealPlanId,
                    quantity: ra.quantity ?? 1,
                    customRoomType: ra.customRoomType || ""
                  }
                });
              }
            }
          }
        }

        // Step 4: Re-calculate and update numDaysNight on the query
        const finalItins = await tx.itinerary.findMany({
          where: { tourPackageQueryId: id },
          select: { id: true }
        });
        const numDays = finalItins.length;
        const numNights = Math.max(0, numDays - 1);
        const durationString = `${numNights}N-${numDays}D`;
        
        await tx.tourPackageQuery.update({
          where: { id },
          data: {
            numDaysNight: durationString
          }
        });
      }
    }, {
      maxWait: 20000,
      timeout: 40000,
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQuery",
      entityId: id,
      action: "UPDATE",
      metadata: {
        fields: Object.keys(data),
        itinerariesTouched: v.itineraries?.length ?? 0,
      },
    });

    return NextResponse.json({ id, updated: true });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
