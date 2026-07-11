import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsWrite,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  asJsonRecord,
  parseCustomQueryVariants,
} from "@/app/api/mobile/lib/custom-query-variants";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
});

/**
 * Create a standalone custom query variant (JSON only — no QueryVariantSnapshot).
 */
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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid custom variant payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const tpq = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
        customQueryVariants: true,
        variantPricingData: true,
      },
    });

    if (!tpq) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, tpq)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const existing = parseCustomQueryVariants(tpq.customQueryVariants);
    const variantId = randomUUID();
    const nextVariant = {
      id: variantId,
      name: parsed.data.name,
      description: parsed.data.description?.trim() || "",
      sortOrder: 1000 + existing.length,
    };
    const nextCustom = [...existing, nextVariant];
    const pricingMap = asJsonRecord(tpq.variantPricingData);
    if (!(variantId in pricingMap)) {
      pricingMap[variantId] = {
        calculationMethod: "manual",
        components: [],
        totalCost: 0,
        basePrice: 0,
        calculatedAt: new Date().toISOString(),
      };
    }

    await prismadb.tourPackageQuery.update({
      where: { id: tpq.id },
      data: {
        customQueryVariants: nextCustom,
        variantPricingData: pricingMap,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "TourPackageQuery",
      entityId: tpq.id,
      action: "UPDATE",
      metadata: { customVariantId: variantId, action: "create_custom_variant" },
    });

    return NextResponse.json({
      tourPackageQueryId: tpq.id,
      variant: {
        id: nextVariant.id,
        name: nextVariant.name,
        description: nextVariant.description,
        sortOrder: nextVariant.sortOrder,
        sourceVariantId: null,
        isCustom: true,
      },
      customQueryVariants: nextCustom,
    });
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_CUSTOM_VARIANTS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
