import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc, utcToLocal } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  mealPlanId: z.string().min(1),
  numberOfRooms: z.coerce.number().int().min(1).max(99),
});

function toLocalDate(value: Date | string): Date {
  const local = utcToLocal(value);
  if (local) return local;
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatComponent(row: {
  id: string;
  pricingAttributeId: string;
  price: number | { toString(): string };
  purchasePrice: number | { toString(): string } | null;
  description: string | null;
  pricingAttribute: { id: string; name: string; sortOrder: number };
}) {
  const price =
    typeof row.price === "number" ? row.price : Number.parseFloat(String(row.price));
  return {
    id: row.id,
    pricingAttributeId: row.pricingAttributeId,
    pricingAttributeName: row.pricingAttribute.name,
    price,
    description: row.description,
    pricingAttribute: {
      id: row.pricingAttribute.id,
      name: row.pricingAttribute.name,
      sortOrder: row.pricingAttribute.sortOrder,
    },
  };
}

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    const variantId = params.variantId?.trim();
    if (!id || !variantId) return new NextResponse("Missing id", { status: 400 });

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      mealPlanId: searchParams.get("mealPlanId"),
      numberOfRooms: searchParams.get("numberOfRooms"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "mealPlanId and numberOfRooms are required", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        tourStartsFrom: true,
        tourEndsOn: true,
        selectedTemplateId: true,
        tourPackageTemplateName: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        queryVariantSnapshots: {
          select: { id: true, sourceVariantId: true, name: true },
        },
      },
    });
    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (!tpq.selectedTemplateId) {
      return NextResponse.json(
        { error: "Select a tour package template on this query first." },
        { status: 422 }
      );
    }
    if (!tpq.tourStartsFrom || !tpq.tourEndsOn) {
      return NextResponse.json(
        { error: "Travel start and end dates are required." },
        { status: 422 }
      );
    }

    const variant = tpq.queryVariantSnapshots.find(
      (row) => row.id === variantId || row.sourceVariantId === variantId
    );
    if (!variant) return new NextResponse("Variant not found", { status: 404 });

    const packageVariantId = variant.sourceVariantId || variant.id;
    const queryStart = toLocalDate(tpq.tourStartsFrom);
    const queryEnd = toLocalDate(tpq.tourEndsOn);

    const rows = await prismadb.tourPackagePricing.findMany({
      where: {
        tourPackageId: tpq.selectedTemplateId,
        isActive: true,
        OR: [{ packageVariantId }, { packageVariantId: null }],
        AND: [
          { startDate: { lte: dateToUtc(tpq.tourEndsOn)! } },
          { endDate: { gte: dateToUtc(tpq.tourStartsFrom)! } },
        ],
      },
      include: {
        mealPlan: { select: { id: true, name: true } },
        pricingComponents: {
          include: {
            pricingAttribute: { select: { id: true, name: true, sortOrder: true } },
          },
          orderBy: { pricingAttribute: { sortOrder: "asc" } },
        },
      },
      orderBy: { startDate: "asc" },
    });

    if (!rows.length) {
      return NextResponse.json(
        { error: "No active pricing periods were found for this variant." },
        { status: 422 }
      );
    }

    const matched = rows.filter((period) => {
      const periodStart = toLocalDate(period.startDate);
      const periodEnd = toLocalDate(period.endDate);
      const isDateMatch = queryStart >= periodStart && queryEnd <= periodEnd;
      const isMealPlanMatch = period.mealPlanId === parsed.data.mealPlanId;
      const isRoomMatch = period.numberOfRooms === parsed.data.numberOfRooms;
      return isDateMatch && isMealPlanMatch && isRoomMatch;
    });

    if (matched.length === 0) {
      return NextResponse.json(
        {
          error: `No pricing matched the selected meal plan, ${parsed.data.numberOfRooms} room(s), and travel dates.`,
        },
        { status: 422 }
      );
    }

    if (matched.length > 1) {
      return NextResponse.json(
        {
          error:
            "Multiple pricing periods matched. Narrow the dates or adjust the package pricing setup.",
        },
        { status: 422 }
      );
    }

    const period = matched[0];
    const components = period.pricingComponents.map(formatComponent);

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      variantId: variant.id,
      packageVariantId,
      selectedTemplateId: tpq.selectedTemplateId,
      tourPackageTemplateName: tpq.tourPackageTemplateName,
      matchedPeriod: {
        id: period.id,
        startDate: period.startDate.toISOString(),
        endDate: period.endDate.toISOString(),
        mealPlanId: period.mealPlanId,
        mealPlanName: period.mealPlan.name,
        numberOfRooms: period.numberOfRooms,
      },
      components,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_VARIANT_PACKAGE_COMPONENTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
