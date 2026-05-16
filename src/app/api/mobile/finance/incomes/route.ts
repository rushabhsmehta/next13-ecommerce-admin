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

const schema = z.object({
  amount: z.number().positive(),
  incomeDate: z.string(),
  description: z.string().max(2000).optional(),
  incomeCategoryId: z.string().uuid().optional().nullable(),
  accountKind: z.enum(["bank", "cash"]),
  accountId: z.string().uuid(),
  tourPackageQueryId: z.string().uuid().optional().nullable(),
});

/**
 * Create an income. Income credits the chosen account, so we recompute that
 * account's authoritative balance afterwards. Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("IncomeDetail", key);
    if (prior) {
      const existing = await prismadb.incomeDetail.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, income: existing, idempotentReplay: true },
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

    const income = await prismadb.incomeDetail.create({
      data: {
        amount: v.amount,
        incomeDate: new Date(v.incomeDate),
        description: v.description ?? null,
        incomeCategoryId: v.incomeCategoryId ?? null,
        tourPackageQueryId: v.tourPackageQueryId ?? null,
        bankAccountId: v.accountKind === "bank" ? v.accountId : null,
        cashAccountId: v.accountKind === "cash" ? v.accountId : null,
      },
    });

    if (v.accountKind === "bank") await recalculateBankBalance(v.accountId);
    else await recalculateCashBalance(v.accountId);

    await recordMobileAudit({
      userId,
      entityType: "IncomeDetail",
      entityId: income.id,
      action: "CREATE",
      metadata: { idempotencyKey: key ?? undefined, amount: v.amount },
    });

    return NextResponse.json({ id: income.id, income }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_INCOMES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
