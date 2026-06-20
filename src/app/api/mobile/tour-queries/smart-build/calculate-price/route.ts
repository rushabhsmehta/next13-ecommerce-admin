import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireSalesTripsWrite } from "@/app/api/mobile/lib/assert-sales-trips-access";
import {
  calculateSmartBuildPrice,
  smartBuildInputSchema,
} from "@/lib/smart-query-build";
import prismadb from "@/lib/prismadb";

export const dynamic = "force-dynamic";

const calculateSchema = z.object({
  tourPackageId: z.string().min(1),
  mealPlanId: z.string().min(1),
  inquiryId: z.string().min(1),
  roomAllocations: smartBuildInputSchema.shape.roomAllocations,
});

export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsWrite(userId);
    if (!accessResult.ok) return accessResult.response;

    const parsed = calculateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const inquiry = await prismadb.inquiry.findUnique({
      where: { id: parsed.data.inquiryId },
      select: { journeyDate: true, associatePartnerId: true },
    });
    if (!inquiry) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }
    if (
      accessResult.access.isAssociate &&
      accessResult.access.associatePartnerId &&
      inquiry.associatePartnerId !== accessResult.access.associatePartnerId
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const result = await calculateSmartBuildPrice({
      tourPackageId: parsed.data.tourPackageId,
      mealPlanId: parsed.data.mealPlanId,
      roomAllocations: parsed.data.roomAllocations,
      journeyDate: inquiry.journeyDate,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("[MOBILE_SMART_BUILD_CALCULATE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
