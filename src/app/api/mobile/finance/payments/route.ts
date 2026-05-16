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
import { recalculateBankBalance } from "@/lib/bank-balance";
import { recalculateCashBalance } from "@/lib/cash-balance";

export const dynamic = "force-dynamic";

const allocationSchema = z.object({
  purchaseDetailId: z.string().uuid(),
  allocatedAmount: z.number().positive(),
  note: z.string().max(1000).optional().nullable(),
});

const schema = z
  .object({
    paymentType: z.string().min(1).default("supplier_payment"),
    supplierId: z.string().uuid().optional().nullable(),
    customerId: z.string().uuid().optional().nullable(),
    paymentDate: z.string(),
    amount: z.number().positive(),
    accountKind: z.enum(["bank", "cash"]),
    accountId: z.string().uuid(),
    tourPackageQueryId: z.string().uuid().optional().nullable(),
    note: z.string().max(2000).optional().nullable(),
    purchaseAllocations: z.array(allocationSchema).optional().default([]),
  })
  .refine((d) => d.supplierId || d.customerId, {
    message: "supplierId or customerId is required",
    path: ["supplierId"],
  })
  .refine(
    (d) =>
      !d.purchaseAllocations?.length ||
      d.purchaseAllocations.reduce((s, a) => s + a.allocatedAmount, 0) <=
        d.amount + 0.01,
    {
      message: "Allocations exceed payment amount",
      path: ["purchaseAllocations"],
    }
  );

/**
 * Record a supplier payment (money out), with optional allocation to that
 * supplier's open purchases. Idempotent. The chosen account's authoritative
 * balance is recomputed afterwards. TDS handling stays in the web flow.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("PaymentDetail", key);
    if (prior) {
      const existing = await prismadb.paymentDetail.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, payment: existing, idempotentReplay: true },
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

    if (v.purchaseAllocations?.length && v.supplierId) {
      for (const a of v.purchaseAllocations) {
        const purchase = await prismadb.purchaseDetail.findUnique({
          where: { id: a.purchaseDetailId },
          select: { supplierId: true },
        });
        if (!purchase || purchase.supplierId !== v.supplierId) {
          return NextResponse.json(
            {
              error: `Purchase ${a.purchaseDetailId} does not belong to this supplier`,
            },
            { status: 400 }
          );
        }
      }
    }

    const payment = await prismadb.$transaction(async (tx) => {
      const created = await tx.paymentDetail.create({
        data: {
          supplierId: v.supplierId || null,
          customerId: v.customerId || null,
          paymentType: v.paymentType,
          paymentDate: dateToUtc(v.paymentDate)!,
          amount: v.amount,
          note: v.note || null,
          bankAccountId: v.accountKind === "bank" ? v.accountId : null,
          cashAccountId: v.accountKind === "cash" ? v.accountId : null,
          tourPackageQueryId: v.tourPackageQueryId || null,
        } as any,
      });
      if (v.purchaseAllocations?.length) {
        for (const a of v.purchaseAllocations) {
          await tx.paymentPurchaseAllocation.create({
            data: {
              paymentDetailId: created.id,
              purchaseDetailId: a.purchaseDetailId,
              allocatedAmount: a.allocatedAmount,
              note: a.note || null,
            },
          });
        }
      }
      return created;
    });

    if (v.accountKind === "bank") await recalculateBankBalance(v.accountId);
    else await recalculateCashBalance(v.accountId);

    await recordMobileAudit({
      userId,
      entityType: "PaymentDetail",
      entityId: payment.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        amount: v.amount,
        allocations: v.purchaseAllocations?.length ?? 0,
      },
    });

    return NextResponse.json({ id: payment.id, payment }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_PAYMENTS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
