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

const accountRef = z.object({
  kind: z.enum(["bank", "cash"]),
  id: z.string().uuid(),
});

const schema = z
  .object({
    from: accountRef,
    to: accountRef,
    amount: z.number().positive(),
    transferDate: z.string(),
    description: z.string().max(1000).optional(),
    reference: z.string().max(100).optional(),
  })
  .refine((d) => !(d.from.kind === d.to.kind && d.from.id === d.to.id), {
    message: "Cannot transfer to the same account",
    path: ["to"],
  });

async function recalc(kind: "bank" | "cash", id: string) {
  if (kind === "bank") await recalculateBankBalance(id);
  else await recalculateCashBalance(id);
}

/**
 * Create an account-to-account transfer, then recompute both accounts'
 * authoritative balances (recalculate* derives from transactions, so no
 * incremental drift). Idempotent via the Idempotency-Key header.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("Transfer", key);
    if (prior) {
      const existing = await prismadb.transfer.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, transfer: existing, idempotentReplay: true },
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
    const { from, to, amount, transferDate, description, reference } =
      parsed.data;

    const transfer = await prismadb.transfer.create({
      data: {
        amount,
        transferDate: new Date(transferDate),
        description: description ?? null,
        reference: reference ?? null,
        fromBankAccountId: from.kind === "bank" ? from.id : null,
        fromCashAccountId: from.kind === "cash" ? from.id : null,
        toBankAccountId: to.kind === "bank" ? to.id : null,
        toCashAccountId: to.kind === "cash" ? to.id : null,
      },
    });

    // Authoritative recompute for both sides — never trust incremental math.
    await recalc(from.kind, from.id);
    await recalc(to.kind, to.id);

    await recordMobileAudit({
      userId,
      entityType: "Transfer",
      entityId: transfer.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        amount,
        from: `${from.kind}:${from.id}`,
        to: `${to.kind}:${to.id}`,
      },
    });

    return NextResponse.json({ id: transfer.id, transfer }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_TRANSFERS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
