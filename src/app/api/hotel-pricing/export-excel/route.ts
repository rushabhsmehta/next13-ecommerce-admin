import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError } from "@/lib/api-response";
import { groupPricingIntoSheets } from "@/lib/hotel-pricing-matrix";

export const dynamic = "force-dynamic";

/** Export current hotel pricing as matrix Excel (occupancy columns) */
export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) {
      return jsonError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const { hotelId } = await req.json();
    if (!hotelId) {
      return jsonError("Hotel ID is required", 400, "MISSING_HOTEL_ID");
    }

    const hotel = await prismadb.hotel.findUnique({
      where: { id: hotelId },
      include: { location: true },
    });
    if (!hotel) {
      return jsonError("Hotel not found", 404, "NOT_FOUND");
    }

    const [occupancyTypes, pricing] = await Promise.all([
      prismadb.occupancyType.findMany({
        where: { isActive: true },
        orderBy: [{ rank: "asc" }, { name: "asc" }],
      }),
      prismadb.hotelPricing.findMany({
        where: { hotelId, isActive: true },
        include: {
          roomType: true,
          occupancyType: true,
          mealPlan: true,
          locationSeasonalPeriod: true,
        },
        orderBy: { startDate: "asc" },
      }),
    ]);

    const sheets = groupPricingIntoSheets(pricing, occupancyTypes);

    const baseHeader = [
      "hotel_id",
      "hotel_name",
      "location_name",
      "room_type_name",
      "meal_plan_code",
      "start_date",
      "end_date",
      "currency",
      "is_active",
      "notes",
    ];
    const occupancyHeaders = occupancyTypes.map((ot) => ot.name);
    const header = [...baseHeader, ...occupancyHeaders];

    const rows: (string | number)[][] = [header];

    for (const sheet of sheets) {
      const row: (string | number)[] = [
        hotel.id,
        hotel.name,
        hotel.location?.label ?? "",
        sheet.roomTypeName ?? "",
        sheet.mealPlanCode ?? "",
        sheet.startDate,
        sheet.endDate,
        "INR",
        "TRUE",
        sheet.seasonName ?? "",
      ];
      for (const ot of occupancyTypes) {
        const price = sheet.occupancyPrices.find((o) => o.occupancyTypeId === ot.id)?.price;
        row.push(price !== undefined ? price : "");
      }
      rows.push(row);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pricing");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const filename = `hotel-pricing-${hotel.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
