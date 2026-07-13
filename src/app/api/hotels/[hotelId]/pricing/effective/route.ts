import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { resolveEffectiveHotelPricing } from "@/lib/hotel-effective-pricing";
import { dateToUtc } from "@/lib/timezone-utils";

export const dynamic = "force-dynamic";

function serializeDate(date: Date) {
  return date.toISOString();
}

export async function GET(
  req: Request,
  props: { params: Promise<{ hotelId: string }> }
) {
  const params = await props.params;
  try {
    if (!params.hotelId) {
      return new NextResponse("Hotel ID is required", { status: 400 });
    }

    const url = new URL(req.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return new NextResponse("Start date and end date are required", {
        status: 400,
      });
    }

    const startDate = dateToUtc(startDateParam);
    const endDate = dateToUtc(endDateParam);
    if (!startDate || !endDate) {
      return new NextResponse("Invalid date format", { status: 400 });
    }
    if (endDate < startDate) {
      return new NextResponse("End date must be on or after start date", {
        status: 400,
      });
    }

    const result = await prismadb.$transaction((tx) =>
      resolveEffectiveHotelPricing(tx, {
        hotelId: params.hotelId,
        startDate,
        endDate,
        roomTypeId: url.searchParams.get("roomTypeId") || undefined,
        occupancyTypeId: url.searchParams.get("occupancyTypeId") || undefined,
        mealPlanId: url.searchParams.has("mealPlanId")
          ? url.searchParams.get("mealPlanId") || null
          : undefined,
      })
    );

    return NextResponse.json({
      items: result.rows.map((row) => ({
        ...row,
        startDate: serializeDate(row.startDate),
        endDate: serializeDate(row.endDate),
      })),
      warnings: result.warnings.map((warning) => ({
        ...warning,
        startDate: serializeDate(warning.startDate),
        endDate: serializeDate(warning.endDate),
      })),
    });
  } catch (error) {
    console.error("[HOTEL_EFFECTIVE_PRICING_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
