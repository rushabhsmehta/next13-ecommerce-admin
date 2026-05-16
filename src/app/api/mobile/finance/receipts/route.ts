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
  saleDetailId: z.string().uuid(),
  allocatedAmount: z.number().positive(),
  note: z.string().max(1000).optional().nullable(),
});

const schema = z
  .object({
    receiptType: z.string().min(1).default("customer_payment"),
    customerId: z.string().uuid().optional().nullable(),
    supplierId: z.string().uuid().optional().nullable(),
    receiptDate: z.string(),
    amount: z.number().positive(),
    accountKind: z.enum(["bank", "cash"]),
    accountId: z.string().uuid(),
    tourPackageQueryId: z.string().uuid().optional().nullable(),
    note: z.string().max(2000).optional().nullable(),
    saleAllocations: z.array(allocationSchema).optional().default([]),
  })
  .refine((d) => d.customerId || d.supplierId, {
    message: "customerId or supplierId is required",
    path: ["customerId"],
  })
  .refine(
    (d) =>
      !d.saleAllocations?.length ||
      d.saleAllocations.reduce((s, a) => s + a.allocatedAmount, 0) <=
        d.amount + 0.01,
    { message: "Allocations exceed receipt amount", path: ["saleAllocations"] }
  );

/**
 * Record a customer receipt (money in), with optional allocation to that
 * customer's open sales. Idempotent. The chosen account's authoritative
 * balance is recomputed afterwards (recalculate* derives from transactions —
 * no incremental drift). TDS handling is intentionally NOT replicated here
 * (kept in the web flow); mobile receipts are tax-neutral.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("ReceiptDetail", key);
    if (prior) {
      const existing = await prismadb.receiptDetail.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, receipt: existing, idempotentReplay: true },
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

    // Validate allocations belong to this customer (mirrors web guard).
    if (v.saleAllocations?.length && v.customerId) {
      for (const a of v.saleAllocations) {
        const sale = await prismadb.saleDetail.findUnique({
          where: { id: a.saleDetailId },
          select: { customerId: true },
        });
        if (!sale || sale.customerId !== v.customerId) {
          return NextResponse.json(
            { error: `Sale ${a.saleDetailId} does not belong to this customer` },
            { status: 400 }
          );
        }
      }
    }

    const receipt = await prismadb.$transaction(async (tx) => {
      const created = await tx.receiptDetail.create({
        data: {
          customerId: v.customerId || null,
          supplierId: v.supplierId || null,
          receiptType: v.receiptType,
          receiptDate: dateToUtc(v.receiptDate)!,
          amount: v.amount,
          note: v.note || null,
          bankAccountId: v.accountKind === "bank" ? v.accountId : null,
          cashAccountId: v.accountKind === "cash" ? v.accountId : null,
          // Schema marks this required but the column is nullable in practice
          // (the web receipts route writes `|| null` the same way).
          tourPackageQueryId: v.tourPackageQueryId || null,
        } as any,
      });
      if (v.saleAllocations?.length) {
        for (const a of v.saleAllocations) {
          await tx.receiptSaleAllocation.create({
            data: {
              receiptDetailId: created.id,
              saleDetailId: a.saleDetailId,
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
      entityType: "ReceiptDetail",
      entityId: receipt.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        amount: v.amount,
        allocations: v.saleAllocations?.length ?? 0,
      },
    });

    return NextResponse.json({ id: receipt.id, receipt }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_RECEIPTS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
