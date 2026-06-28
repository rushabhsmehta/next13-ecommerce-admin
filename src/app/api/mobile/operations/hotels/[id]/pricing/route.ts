import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import {
  hasOverlappingPeriods,
  upsertPricingWithSplit,
} from "@/lib/hotel-pricing-overlap";
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

export const dynamic = "force-dynamic";

const pricingSchema = z.object({
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  roomTypeId: z.string().min(1, "Room type is required"),
  occupancyTypeId: z.string().min(1, "Occupancy type is required"),
  mealPlanId: z.string().nullable().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number"),
  isActive: z.boolean().optional(),
  applySplit: z.boolean().optional(),
  locationSeasonalPeriodId: z.string().nullable().optional(),
});

function formatPricingRow(row: {
  id: string;
  hotelId: string;
  startDate: Date;
  endDate: Date;
  price: number;
  isActive: boolean;
  roomTypeId: string | null;
  occupancyTypeId: string | null;
  mealPlanId: string | null;
  locationSeasonalPeriodId?: string | null;
  roomType: { id: string; name: string } | null;
  occupancyType: { id: string; name: string } | null;
  mealPlan: { id: string; name: string; code: string } | null;
  locationSeasonalPeriod?: {
    id: string;
    name: string;
    seasonType: string;
  } | null;
}) {
  return {
    id: row.id,
    hotelId: row.hotelId,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    price: row.price,
    isActive: row.isActive,
    roomTypeId: row.roomTypeId,
    roomTypeName: row.roomType?.name ?? null,
    occupancyTypeId: row.occupancyTypeId,
    occupancyTypeName: row.occupancyType?.name ?? null,
    mealPlanId: row.mealPlanId,
    mealPlanName: row.mealPlan?.name ?? null,
    mealPlanCode: row.mealPlan?.code ?? null,
    locationSeasonalPeriodId: row.locationSeasonalPeriodId ?? null,
    seasonalPeriodName: row.locationSeasonalPeriod?.name ?? null,
    seasonType: row.locationSeasonalPeriod?.seasonType ?? null,
  };
}

/** Hotel pricing rows — list (read). Mirrors web GET /api/hotels/[hotelId]/pricing. */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsRead(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });

    const hotel = await prismadb.hotel.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, locationId: true },
    });
    if (!hotel) return new NextResponse("Hotel not found", { status: 404 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = { hotelId: params.id };
    if (activeOnly) where.isActive = true;

    if (startDate && endDate) {
      const start = dateToUtc(startDate);
      const end = dateToUtc(endDate);
      if (start && end) {
        where.AND = [{ startDate: { lte: end } }, { endDate: { gte: start } }];
      }
    }

    const rows = await prismadb.hotelPricing.findMany({
      where,
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
        roomType: { select: { id: true, name: true } },
        occupancyType: { select: { id: true, name: true } },
        mealPlan: { select: { id: true, name: true, code: true } },
        locationSeasonalPeriod: {
          select: { id: true, name: true, seasonType: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const items = rows.map(formatPricingRow);

    return NextResponse.json({
      hotel: { id: hotel.id, name: hotel.name, locationId: hotel.locationId },
      items,
      total: items.length,
    });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PRICING_LIST_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/** Hotel pricing rows - create with optional overlap splitting. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireOperationsWrite(userId);
    if (!guard.ok) return guard.response;
    if (!params.id) return new NextResponse("Missing hotel id", { status: 400 });

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("HotelPricing", key);
    if (prior) {
      const existing = await prismadb.hotelPricing.findUnique({
        where: { id: prior },
        select: { id: true, hotelId: true, startDate: true, endDate: true, price: true },
      });
      return NextResponse.json(
        { id: prior, pricing: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    const hotel = await prismadb.hotel.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!hotel) return new NextResponse("Hotel not found", { status: 404 });

    const body = await req.json();
    const parsed = pricingSchema.safeParse(body);
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

    const input = {
      hotelId: params.id,
      startDate,
      endDate,
      roomTypeId: v.roomTypeId,
      occupancyTypeId: v.occupancyTypeId,
      mealPlanId: v.mealPlanId || null,
      price: v.price,
      isActive: v.isActive ?? true,
      locationSeasonalPeriodId: v.locationSeasonalPeriodId ?? null,
    };

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

    const pricing = v.applySplit
      ? await prismadb.$transaction(async (tx) => {
          const created = await upsertPricingWithSplit(tx, {
            hotelId: params.id,
            startDate,
            endDate,
            roomTypeId: v.roomTypeId,
            occupancyTypeId: v.occupancyTypeId,
            mealPlanId: v.mealPlanId || null,
            price: v.price,
            locationSeasonalPeriodId: v.locationSeasonalPeriodId ?? null,
            isActive: v.isActive ?? true,
          });
          return tx.hotelPricing.findUniqueOrThrow({
            where: { id: created.id },
            select: pricingSelect,
          });
        })
      : await (async () => {
          const overlaps = await prismadb.$transaction((tx) =>
            hasOverlappingPeriods(tx, {
              hotelId: params.id,
              roomTypeId: v.roomTypeId,
              occupancyTypeId: v.occupancyTypeId,
              mealPlanId: v.mealPlanId || null,
              startDate,
              endDate,
            })
          );
          if (overlaps) {
            return NextResponse.json(
              {
                error:
                  "Overlapping pricing period exists. Set applySplit to true or adjust dates.",
              },
              { status: 409 }
            );
          }
          return prismadb.hotelPricing.create({
            data: input,
            select: pricingSelect,
          });
        })();

    if (pricing instanceof NextResponse) {
      return pricing;
    }

    await recordMobileAudit({
      userId,
      entityType: "HotelPricing",
      entityId: pricing.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        hotelId: params.id,
        applySplit: !!v.applySplit,
      },
    });

    return NextResponse.json(formatPricingRow(pricing), { status: 201 });
  } catch (error) {
    console.log("[MOBILE_OPS_HOTEL_PRICING_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
