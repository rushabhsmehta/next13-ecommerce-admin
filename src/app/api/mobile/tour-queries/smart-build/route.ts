import { NextResponse } from "next/server";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSalesTripsWrite } from "@/app/api/mobile/lib/assert-sales-trips-access";
import {
  findPriorIdempotentEntityId,
  readIdempotencyKey,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  calculateSmartBuildPrice,
  createSmartBuildTourQuery,
  smartBuildInputSchema,
} from "@/lib/smart-query-build";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const key = readIdempotencyKey(req);
    if (!key) {
      return NextResponse.json(
        { error: "Idempotency-Key header is required", code: "IDEMPOTENCY_REQUIRED" },
        { status: 400 }
      );
    }

    const prior = await findPriorIdempotentEntityId("SmartBuildTourQuery", key);
    if (prior) {
      const existing = await prismadb.tourPackageQuery.findUnique({
        where: { id: prior },
        select: {
          id: true,
          tourPackageQueryNumber: true,
          tourPackageQueryName: true,
        },
      });
      return NextResponse.json(
        {
          id: prior,
          tourPackageQueryNumber: existing?.tourPackageQueryNumber ?? null,
          tourPackageQueryName: existing?.tourPackageQueryName ?? null,
          idempotentReplay: true,
        },
        { status: 200 }
      );
    }

    const parsed = smartBuildInputSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: parsed.data.inquiryId },
      select: { associatePartnerId: true, journeyDate: true },
    });
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }
    if (
      access.isAssociate &&
      access.associatePartnerId &&
      inquiry.associatePartnerId !== access.associatePartnerId
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let totalPrice = parsed.data.totalPrice ?? null;
    let pricingSection = parsed.data.pricingSection;

    if (totalPrice == null) {
      const calculated = await calculateSmartBuildPrice({
        tourPackageId: parsed.data.tourPackageId,
        mealPlanId: parsed.data.mealPlanId,
        roomAllocations: parsed.data.roomAllocations,
        journeyDate: inquiry.journeyDate,
      });
      if (calculated.totalPrice != null) {
        totalPrice = calculated.totalPrice;
        pricingSection = calculated.pricingSection;
      }
    }

    const created = await createSmartBuildTourQuery(
      {
        ...parsed.data,
        totalPrice,
        pricingSection,
      },
      {
        associatePartnerId: access.isAssociate
          ? access.associatePartnerId
          : inquiry.associatePartnerId,
      }
    );

    await recordMobileAudit({
      userId,
      entityType: "SmartBuildTourQuery",
      entityId: created.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key,
        inquiryId: parsed.data.inquiryId,
        tourPackageId: parsed.data.tourPackageId,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        tourPackageQueryNumber: created.tourPackageQueryNumber,
        tourPackageQueryName: created.tourPackageQueryName,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.log("[MOBILE_SMART_BUILD_POST]", error);
    if (
      message.includes("Template validation failed") ||
      message.includes("Itinerary") ||
      message.includes("Room allocation")
    ) {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    return new NextResponse("Internal error", { status: 500 });
  }
}
