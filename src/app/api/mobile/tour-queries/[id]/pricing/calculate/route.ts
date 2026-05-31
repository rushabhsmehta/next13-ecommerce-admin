import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { calculatePricing } from "@/lib/pricing-calculator";

export const dynamic = "force-dynamic";

const calculateSchema = z.object({
  markup: z.coerce.number().min(0).max(1000).optional().default(0),
});

function dayLabel(days: number[]): string {
  return days.length === 1 ? `day ${days[0]}` : `days ${days.join(", ")}`;
}

export async function POST(
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
      body = {};
    }

    const parsed = calculateSchema.safeParse(body ?? {});
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        tourStartsFrom: true,
        tourEndsOn: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        itineraries: {
          select: {
            id: true,
            dayNumber: true,
            locationId: true,
            hotelId: true,
            roomAllocations: {
              select: {
                roomTypeId: true,
                occupancyTypeId: true,
                mealPlanId: true,
                quantity: true,
                guestNames: true,
                voucherNumber: true,
                extraBeds: {
                  select: {
                    occupancyTypeId: true,
                    quantity: true,
                  },
                },
              },
            },
            transportDetails: {
              select: {
                vehicleTypeId: true,
                quantity: true,
                description: true,
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
    if (!tpq.tourStartsFrom || !tpq.tourEndsOn) {
      return NextResponse.json(
        { error: "Travel start and end dates are required for calculation." },
        { status: 422 }
      );
    }

    const incompleteRoomDays = tpq.itineraries
      .filter((it) =>
        it.roomAllocations.some(
          (room) => !room.roomTypeId || !room.occupancyTypeId || !room.mealPlanId
        )
      )
      .map((it, index) => it.dayNumber ?? index + 1);
    if (incompleteRoomDays.length > 0) {
      return NextResponse.json(
        {
          error: `Complete room type, occupancy, and meal plan for ${dayLabel(
            incompleteRoomDays
          )}.`,
        },
        { status: 422 }
      );
    }

    const missingHotelDays = tpq.itineraries
      .filter((it) => it.roomAllocations.length > 0 && !it.hotelId)
      .map((it, index) => it.dayNumber ?? index + 1);
    if (missingHotelDays.length > 0) {
      return NextResponse.json(
        {
          error: `Select a hotel for ${dayLabel(missingHotelDays)} before calculating room costs.`,
        },
        { status: 422 }
      );
    }

    const pricingItineraries = tpq.itineraries.map((it, index) => ({
      locationId: it.locationId,
      dayNumber: it.dayNumber ?? index + 1,
      hotelId: it.hotelId ?? undefined,
      roomAllocations: it.roomAllocations.map((room) => ({
        roomTypeId: room.roomTypeId,
        occupancyTypeId: room.occupancyTypeId,
        mealPlanId: room.mealPlanId!,
        quantity: room.quantity || 1,
        guestNames: room.guestNames ?? undefined,
        voucherNumber: room.voucherNumber ?? undefined,
        extraBeds: room.extraBeds.map((extra) => ({
          occupancyTypeId: extra.occupancyTypeId,
          quantity: extra.quantity || 1,
        })),
      })),
      transportDetails: it.transportDetails.map((transport) => ({
        vehicleTypeId: transport.vehicleTypeId,
        quantity: transport.quantity || 1,
        description: transport.description ?? undefined,
      })),
    }));

    const hasInputs = pricingItineraries.some(
      (it) => it.roomAllocations.length > 0 || it.transportDetails.length > 0
    );
    if (!hasInputs) {
      return NextResponse.json(
        { error: "Add rooms or transport before calculating pricing." },
        { status: 422 }
      );
    }

    const result = await calculatePricing({
      tourStartsFrom: tpq.tourStartsFrom,
      tourEndsOn: tpq.tourEndsOn,
      itineraries: pricingItineraries,
      markup: parsed.data.markup,
      includeNames: true,
    });

    const pricingSection = [
      {
        name: "Total Cost",
        price: String(result.totalCost || 0),
        description: `Base ${result.basePrice.toFixed(0)} + markup ${result.appliedMarkup.amount.toFixed(0)}`,
      },
      {
        name: "Accommodation",
        price: String(result.breakdown.accommodation || 0),
        description: "Hotel room costs",
      },
      {
        name: "Transport",
        price: String(result.breakdown.transport || 0),
        description: "Vehicle costs",
      },
    ].filter((item) => Number(item.price) > 0 || item.name === "Total Cost");

    return NextResponse.json({
      ...result,
      pricingSection,
      calculationMethod: "autoHotelTransport",
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_PRICING_CALCULATE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
