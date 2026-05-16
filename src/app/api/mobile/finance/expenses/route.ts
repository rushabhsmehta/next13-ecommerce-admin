import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
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

const schema = z
  .object({
    amount: z.number().positive(),
    expenseDate: z.string(),
    description: z.string().max(2000).optional(),
    expenseCategoryId: z.string().uuid().optional().nullable(),
    accountKind: z.enum(["bank", "cash"]).optional(),
    accountId: z.string().uuid().optional(),
    isAccrued: z.boolean().optional().default(false),
    accruedDate: z.string().optional().nullable(),
    tourPackageQueryId: z.string().uuid().optional().nullable(),
  })
  .refine((d) => d.isAccrued || (d.accountKind && d.accountId), {
    message: "A paid expense needs an account; an accrued expense does not.",
    path: ["accountId"],
  });

/**
 * Create an expense. Paid expenses debit the chosen account, so we recompute
 * that account's authoritative balance afterwards. Accrued expenses record a
 * liability with no account movement (paid later on the web). Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("ExpenseDetail", key);
    if (prior) {
      const existing = await prismadb.expenseDetail.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, expense: existing, idempotentReplay: true },
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

    const expense = await prismadb.expenseDetail.create({
      data: {
        amount: v.amount,
        expenseDate: new Date(v.expenseDate),
        description: v.description ?? null,
        expenseCategoryId: v.expenseCategoryId ?? null,
        tourPackageQueryId: v.tourPackageQueryId ?? null,
        isAccrued: v.isAccrued ?? false,
        accruedDate:
          v.isAccrued && v.accruedDate ? new Date(v.accruedDate) : null,
        paidDate: v.isAccrued ? null : new Date(v.expenseDate),
        bankAccountId:
          !v.isAccrued && v.accountKind === "bank" ? v.accountId ?? null : null,
        cashAccountId:
          !v.isAccrued && v.accountKind === "cash" ? v.accountId ?? null : null,
      },
    });

    if (!v.isAccrued && v.accountId) {
      if (v.accountKind === "bank") await recalculateBankBalance(v.accountId);
      else await recalculateCashBalance(v.accountId);
    }

    await recordMobileAudit({
      userId,
      entityType: "ExpenseDetail",
      entityId: expense.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        amount: v.amount,
        isAccrued: v.isAccrued ?? false,
      },
    });

    return NextResponse.json({ id: expense.id, expense }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_EXPENSES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
