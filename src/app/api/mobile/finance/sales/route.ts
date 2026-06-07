import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  requireFinanceWrite,
  readIdempotencyKey,
  findPriorIdempotentEntityId,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";
import {
  calculateDiscountedTaxAmounts,
  CouponError,
  markCouponApplied,
  prepareCouponApplication,
} from "@/lib/coupons";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  productName: z.string().min(1),
  description: z.string().optional().nullable(),
  quantity: z.number().positive(),
  pricePerUnit: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  taxAmount: z.number().optional().nullable(),
});

const schema = z.object({
  customerId: z.string().uuid(),
  tourPackageQueryId: z.string().uuid().optional().nullable(),
  saleDate: z.string(),
  invoiceNumber: z.string().max(100).optional().nullable(),
  salePrice: z.number().nonnegative(),
  gstAmount: z.number().optional().nullable(),
  gstPercentage: z.number().optional().nullable(),
  isGst: z.boolean().optional(),
  cgstAmount: z.number().optional().nullable(),
  sgstAmount: z.number().optional().nullable(),
  igstAmount: z.number().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.string().optional(),
  couponCode: z.string().optional().nullable(),
  couponRedemptionId: z.string().uuid().optional().nullable(),
  items: z.array(itemSchema).optional().default([]),
});

/**
 * Create a customer sale (+ optional item lines). Sales affect the customer
 * receivable ledger only — no bank/cash balance moves, so no recalculate is
 * needed (and no drift risk). GST amounts are client-computed exactly like the
 * web sales form. Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("SaleDetail", key);
    if (prior) {
      const existing = await prismadb.saleDetail.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, sale: existing, idempotentReplay: true },
        { status: 200 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const v = parsed.data;

    const sale = await prismadb.$transaction(async (tx) => {
      const [customer, query] = await Promise.all([
        tx.customer.findUnique({
          where: { id: v.customerId },
          select: { name: true, contact: true },
        }),
        v.tourPackageQueryId
          ? tx.tourPackageQuery.findUnique({
              where: { id: v.tourPackageQueryId },
              select: {
                inquiryId: true,
                locationId: true,
                selectedTemplateId: true,
                tourCategory: true,
                customerName: true,
                customerNumber: true,
                tourStartsFrom: true,
                numAdults: true,
              },
            })
          : Promise.resolve(null),
      ]);
      const couponApplication = await prepareCouponApplication(tx, {
        couponCode: v.couponCode,
        couponRedemptionId: v.couponRedemptionId,
        bookingAmount: v.salePrice,
        customerId: v.customerId,
        customerName: customer?.name || query?.customerName || null,
        customerMobile: customer?.contact || query?.customerNumber || null,
        inquiryId: query?.inquiryId || null,
        tourPackageQueryId: v.tourPackageQueryId || null,
        locationId: query?.locationId || null,
        tourPackageId: query?.selectedTemplateId || null,
        tourCategory: query?.tourCategory || null,
        travelDate: query?.tourStartsFrom || null,
        numAdults: query?.numAdults || null,
        appliedByUserId: userId,
      });
      const finalSalePrice =
        couponApplication?.taxableAmountAfterDiscount ?? v.salePrice;
      const taxAmounts = couponApplication
        ? calculateDiscountedTaxAmounts({
            originalSalePrice: v.salePrice,
            taxableAmountAfterDiscount: finalSalePrice,
            gstPercentage: v.gstPercentage ?? null,
            isGst: v.isGst !== undefined ? v.isGst : true,
            preferIgst: Boolean(v.igstAmount && v.igstAmount > 0),
          })
        : {
            gstAmount: v.gstAmount ?? null,
            cgstAmount: v.cgstAmount ?? null,
            sgstAmount: v.sgstAmount ?? null,
            igstAmount: v.igstAmount ?? null,
          };

      const created = await tx.saleDetail.create({
        data: {
          customerId: v.customerId,
          tourPackageQueryId: v.tourPackageQueryId || null,
          saleDate: dateToUtc(v.saleDate)!,
          invoiceNumber: v.invoiceNumber || null,
          salePrice: finalSalePrice,
          preDiscountSalePrice: couponApplication?.originalBookingAmount ?? null,
          couponCode: couponApplication?.code ?? null,
          couponDiscountAmount: couponApplication?.discountAmount ?? null,
          couponRedemptionId: couponApplication?.redemptionId ?? null,
          gstAmount: taxAmounts.gstAmount,
          gstPercentage: v.gstPercentage ?? null,
          description: v.description || null,
          status: v.status || "completed",
          isGst: v.isGst !== undefined ? v.isGst : true,
          cgstAmount: taxAmounts.cgstAmount,
          sgstAmount: taxAmounts.sgstAmount,
          igstAmount: taxAmounts.igstAmount,
        } as any,
      });
      for (let i = 0; i < (v.items?.length ?? 0); i++) {
        const it = v.items![i];
        await tx.saleItem.create({
          data: {
            saleDetailId: created.id,
            productName: it.productName,
            description: it.description || null,
            quantity: it.quantity,
            pricePerUnit: it.pricePerUnit,
            taxAmount: it.taxAmount ?? null,
            totalAmount: it.totalAmount,
            orderIndex: i,
          } as any,
        });
      }
      if (couponApplication) {
        await markCouponApplied(tx, {
          redemptionId: couponApplication.redemptionId,
          couponCodeId: couponApplication.couponCodeId,
          originalBookingAmount: couponApplication.originalBookingAmount,
          discountAmount: couponApplication.discountAmount,
          taxableAmountAfterDiscount: couponApplication.taxableAmountAfterDiscount,
          gstAfterDiscount: taxAmounts.gstAmount,
          appliedByUserId: userId,
        });
      }
      return created;
    });

    await recordMobileAudit({
      userId,
      entityType: "SaleDetail",
      entityId: sale.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        salePrice: v.salePrice,
        items: v.items?.length ?? 0,
      },
    });

    return NextResponse.json({ id: sale.id, sale }, { status: 201 });
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status }
      );
    }
    console.log("[MOBILE_FINANCE_SALES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
