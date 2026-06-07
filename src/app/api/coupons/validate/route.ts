import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError, noStore } from "@/lib/api-response";
import { requireFinanceOrAdmin } from "@/lib/authz";
import {
  normalizeCouponCode,
  validateCouponEligibility,
} from "@/lib/coupons";

export const dynamic = "force-dynamic";

const schema = z.object({
  couponCode: z.string().optional().nullable(),
  couponRedemptionId: z.string().uuid().optional().nullable(),
  bookingAmount: z.coerce.number().min(0).optional().nullable(),
  locationId: z.string().optional().nullable(),
  tourPackageId: z.string().optional().nullable(),
  tourPackageQueryId: z.string().uuid().optional().nullable(),
  tourCategory: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerMobile: z.string().optional().nullable(),
  travelDate: z.string().optional().nullable(),
  numAdults: z.union([z.string(), z.number()]).optional().nullable(),
});

async function hydrateTourQueryContext(input: z.infer<typeof schema>) {
  if (!input.tourPackageQueryId) return input;
  const query = await (prismadb as any).tourPackageQuery.findUnique({
    where: { id: input.tourPackageQueryId },
    select: {
      id: true,
      locationId: true,
      tourCategory: true,
      selectedTemplateId: true,
      customerName: true,
      customerNumber: true,
      totalPrice: true,
      tourStartsFrom: true,
      numAdults: true,
    },
  });
  if (!query) return input;
  return {
    ...input,
    locationId: input.locationId || query.locationId,
    tourCategory: input.tourCategory || query.tourCategory,
    tourPackageId: input.tourPackageId || query.selectedTemplateId,
    customerName: input.customerName || query.customerName,
    customerMobile: input.customerMobile || query.customerNumber,
    bookingAmount: input.bookingAmount ?? Number.parseFloat(query.totalPrice || "0"),
    travelDate: input.travelDate || query.tourStartsFrom?.toISOString?.(),
    numAdults: input.numAdults ?? query.numAdults,
  };
}

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireFinanceOrAdmin(userId);

    const body = schema.parse(await req.json());
    const hydrated = await hydrateTourQueryContext(body);

    let couponCodeRow: any = null;
    let code = hydrated.couponCode ? normalizeCouponCode(hydrated.couponCode) : "";
    let excludeRedemptionId = hydrated.couponRedemptionId || null;
    if (hydrated.couponRedemptionId) {
      const redemption = await (prismadb as any).couponRedemption.findUnique({
        where: { id: hydrated.couponRedemptionId },
        include: { couponCode: { include: { campaign: true } } },
      });
      couponCodeRow = redemption?.couponCode ?? null;
      code = couponCodeRow?.code ?? code;
    }

    const result = await validateCouponEligibility(prismadb, {
      ...hydrated,
      code,
      couponCodeRow,
      excludeRedemptionId,
    });

    return noStore(
      NextResponse.json({
        valid: result.valid,
        reason: result.reason ?? null,
        code: result.code?.code ?? code,
        campaignId: result.campaign?.id ?? null,
        campaignName: result.campaign?.name ?? null,
        discountType: result.campaign?.discountType ?? null,
        discountValue: result.campaign?.discountValue ?? null,
        discountAmount: result.discountAmount,
        taxableAmountAfterDiscount: result.taxableAmountAfterDiscount,
        approvalRequired: result.approvalRequired,
      })
    );
  });
}
