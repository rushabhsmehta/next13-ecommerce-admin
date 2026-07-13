import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { findOverlappingBasePricings } from "@/lib/hotel-effective-pricing";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireOperationsRead,
  requireOperationsWrite,
} from "@/app/api/mobile/lib/assert-operations-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const pricingSchema = z.object({
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  roomTypeId: z.string().min(1, "Room type is required"),
  occupancyTypeId: z.string().min(1, "Occupancy type is required"),
  mealPlanId: z.string().nullable().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  isActive: z.boolean().optional(),
  locationSeasonalPeriodId: z.string().nullable().optional(),
});

/** Single hotel pricing row — read. Mirrors web GET /api/hotels/[hotelId]/pricing/[pricingId]. */
export async function GET(req: Request, props: { params: Promise<{ id: string; pricingId: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });
    if (!params.pricingId) return new NextResponse("Missing pricing id", { status: 400 });

    const [hotel, pricing] = await Promise.all([
      prismadb.hotel.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, locationId: true },
      }),
      prismadb.hotelPricing.findFirst({
        where: { id: params.pricingId, hotelId: params.id },
        select: {
          id: true,
          hotelId: true,
          startDate: true,
          endDate: true,
          price: true,
          isActive: true,
          roomTypeId: true,
          occupancyTypeId: true,
          mealPlanId: true,
          locationSeasonalPeriodId: true,
          createdAt: true,
          updatedAt: true,
          roomType: {
            select: { id: true, name: true, description: true },
          },
          occupancyType: {
            select: { id: true, name: true, description: true, maxPersons: true },
          },
          mealPlan: {
            select: { id: true, name: true, code: true, description: true },
          },
          locationSeasonalPeriod: {
            select: { id: true, name: true, seasonType: true },
          },
        },
      }),
    ]);

    if (!hotel) return new NextResponse("Hotel not found", { status: 404 });
    if (!pricing) return new NextResponse("Pricing not found", { status: 404 });

    return NextResponse.json({
      hotel: { id: hotel.id, name: hotel.name, locationId: hotel.locationId },
      pricing: {
        id: pricing.id,
        hotelId: pricing.hotelId,
        startDate: pricing.startDate.toISOString(),
        endDate: pricing.endDate.toISOString(),
        price: pricing.price,
        isActive: pricing.isActive,
        roomTypeId: pricing.roomTypeId,
        roomTypeName: pricing.roomType?.name ?? null,
        roomTypeDescription: pricing.roomType?.description ?? null,
        occupancyTypeId: pricing.occupancyTypeId,
        occupancyTypeName: pricing.occupancyType?.name ?? null,
        occupancyMaxPersons: pricing.occupancyType?.maxPersons ?? null,
        mealPlanId: pricing.mealPlanId,
        mealPlanName: pricing.mealPlan?.name ?? null,
        mealPlanCode: pricing.mealPlan?.code ?? null,
        locationSeasonalPeriodId: pricing.locationSeasonalPeriodId,
        seasonalPeriodName: pricing.locationSeasonalPeriod?.name ?? null,
        seasonType: pricing.locationSeasonalPeriod?.seasonType ?? null,
        createdAt: pricing.createdAt.toISOString(),
        updatedAt: pricing.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PRICING_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string; pricingId: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });
    if (!params.pricingId) return new NextResponse("Missing pricing id", { status: 400 });

    const [hotel, existing] = await Promise.all([
      prismadb.hotel.findUnique({ where: { id: params.id }, select: { id: true } }),
      prismadb.hotelPricing.findFirst({
        where: { id: params.pricingId, hotelId: params.id },
        select: { id: true },
      }),
    ]);
    if (!hotel) return new NextResponse("Hotel not found", { status: 404 });
    if (!existing) return new NextResponse("Pricing not found", { status: 404 });

    const parsed = pricingSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid hotel pricing payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const v = parsed.data;
    const startDate = dateToUtc(v.startDate);
    const endDate = dateToUtc(v.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date" },
        { status: 400 }
      );
    }

    const pricingSelect = {
      id: true,
      hotelId: true,
      startDate: true,
      endDate: true,
      price: true,
      isActive: true,
      roomTypeId: true,
      occupancyTypeId: true,
      mealPlanId: true,
      locationSeasonalPeriodId: true,
      roomType: { select: { id: true, name: true } },
      occupancyType: { select: { id: true, name: true } },
      mealPlan: { select: { id: true, name: true, code: true } },
      locationSeasonalPeriod: {
        select: { id: true, name: true, seasonType: true },
      },
    } as const;

    const overlaps = await prismadb.$transaction((tx) =>
      findOverlappingBasePricings(tx, {
        hotelId: params.id,
        roomTypeId: v.roomTypeId,
        occupancyTypeId: v.occupancyTypeId,
        mealPlanId: v.mealPlanId || null,
        startDate,
        endDate,
        excludeId: params.pricingId,
      })
    );
    if (overlaps.length > 0) {
      return NextResponse.json(
        {
          error:
            "Overlapping pricing period exists for the same room, occupancy, and meal plan. Add Special Date Pricing for event/holiday overrides, or adjust the normal pricing dates.",
          conflicts: overlaps,
        },
        { status: 409 }
      );
    }

    const pricing = await prismadb.hotelPricing.update({
      where: { id: params.pricingId },
      data: {
        startDate,
        endDate,
        roomTypeId: v.roomTypeId,
        occupancyTypeId: v.occupancyTypeId,
        mealPlanId: v.mealPlanId || null,
        price: v.price,
        isActive: v.isActive ?? true,
        locationSeasonalPeriodId: v.locationSeasonalPeriodId ?? null,
      },
      select: pricingSelect,
    });

    await recordMobileAudit({
      userId,
      entityType: "HotelPricing",
      entityId: pricing.id,
      action: "UPDATE",
      metadata: { hotelId: params.id },
    });

    return NextResponse.json({
      id: pricing.id,
      hotelId: pricing.hotelId,
      startDate: pricing.startDate.toISOString(),
      endDate: pricing.endDate.toISOString(),
      price: pricing.price,
      isActive: pricing.isActive,
      roomTypeId: pricing.roomTypeId,
      roomTypeName: pricing.roomType?.name ?? null,
      occupancyTypeId: pricing.occupancyTypeId,
      occupancyTypeName: pricing.occupancyType?.name ?? null,
      mealPlanId: pricing.mealPlanId,
      mealPlanName: pricing.mealPlan?.name ?? null,
      mealPlanCode: pricing.mealPlan?.code ?? null,
      locationSeasonalPeriodId: pricing.locationSeasonalPeriodId,
      seasonalPeriodName: pricing.locationSeasonalPeriod?.name ?? null,
      seasonType: pricing.locationSeasonalPeriod?.seasonType ?? null,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PRICING_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string; pricingId: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });
    if (!params.pricingId) return new NextResponse("Missing pricing id", { status: 400 });

    const pricing = await prismadb.hotelPricing.findFirst({
      where: { id: params.pricingId, hotelId: params.id },
      select: { id: true, hotelId: true },
    });
    if (!pricing) return new NextResponse("Pricing not found", { status: 404 });

    await prismadb.hotelPricing.delete({ where: { id: params.pricingId } });
    await recordMobileAudit({
      userId,
      entityType: "HotelPricing",
      entityId: params.pricingId,
      action: "DELETE",
      metadata: { hotelId: params.id },
    });

    return NextResponse.json({ deleted: true, pricing });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PRICING_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
