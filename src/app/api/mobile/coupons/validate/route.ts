import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { normalizeCouponCode, validateCouponEligibility } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const schema = z.object({
  couponCode: z.string().min(1),
  bookingAmount: z.coerce.number().min(0).optional().nullable(),
  locationId: z.string().optional().nullable(),
  tourPackageId: z.string().optional().nullable(),
  tourPackageQueryId: z.string().uuid().optional().nullable(),
  tourCategory: z.string().optional().nullable(),
  customerMobile: z.string().optional().nullable(),
  travelDate: z.string().optional().nullable(),
  numAdults: z.union([z.string(), z.number()]).optional().nullable(),
});

async function hydrateTourQueryContext(input: z.infer<typeof schema>) {
  if (!input.tourPackageQueryId) return input;
  const query = await (prismadb as any).tourPackageQuery.findUnique({
    where: { id: input.tourPackageQueryId },
    select: {
      locationId: true,
      tourCategory: true,
      selectedTemplateId: true,
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
    customerMobile: input.customerMobile || query.customerNumber,
    bookingAmount: input.bookingAmount ?? Number.parseFloat(query.totalPrice || "0"),
    travelDate: input.travelDate || query.tourStartsFrom?.toISOString?.(),
    numAdults: input.numAdults ?? query.numAdults,
  };
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const hydrated = await hydrateTourQueryContext(body);
    const code = normalizeCouponCode(hydrated.couponCode);
    const result = await validateCouponEligibility(prismadb, {
      ...hydrated,
      code,
    });

    return NextResponse.json({
      valid: result.valid,
      message: result.valid
        ? result.approvalRequired
          ? "Coupon is eligible but needs approval."
          : "Coupon is eligible."
        : result.reason || "Coupon is not valid.",
      code,
      campaignName: result.campaign?.name ?? null,
      discountAmount: result.discountAmount,
      taxableAmountAfterDiscount: result.taxableAmountAfterDiscount,
      approvalRequired: result.approvalRequired,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { valid: false, message: "Invalid coupon request." },
        { status: 422 }
      );
    }
    console.log("[MOBILE_COUPON_VALIDATE_POST]", error);
    return NextResponse.json(
      { valid: false, message: "Could not validate coupon." },
      { status: 400 }
    );
  }
}
