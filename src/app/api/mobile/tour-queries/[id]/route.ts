import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";

export const dynamic = "force-dynamic";

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
            itineraryTitle: true,
            itineraryDescription: true,
            mealsIncluded: true,
            hotel: { select: { id: true, name: true } },
            roomAllocations: {
              select: {
                id: true,
                quantity: true,
                customRoomType: true,
                roomType: { select: { name: true } },
                occupancyType: { select: { name: true } },
                mealPlan: { select: { name: true } },
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
