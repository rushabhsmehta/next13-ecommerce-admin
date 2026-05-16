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

export const dynamic = "force-dynamic";

const schema = z.object({
  depositDate: z.string().min(1),
  bsrCode: z.string().max(50).optional().nullable(),
  challanSerialNo: z.string().max(50).optional().nullable(),
  paymentMode: z.string().max(50).optional().nullable(),
  bankName: z.string().max(120).optional().nullable(),
  transactionIds: z.array(z.string().uuid()).optional().default([]),
});

/**
 * Record a TDS government deposit. This mirrors the web /api/tds/deposit
 * route EXACTLY: it creates a dated challan and marks the selected TDS
 * transactions `deposited`. Like the web route it performs NO bank/cash
 * balance movement (the cash outflow for TDS is captured separately when the
 * underlying receipt/payment is recorded), so there is no drift surface.
 * Idempotent + audited.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("TDSChallanDeposit", key);
    if (prior) {
      const existing = await prismadb.tDSChallan.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, challan: existing, idempotentReplay: true },
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

    const challan = await prismadb.$transaction(async (tx) => {
      const created = await tx.tDSChallan.create({
        data: {
          bsrCode: v.bsrCode || null,
          challanSerialNo: v.challanSerialNo || null,
          depositDate: new Date(v.depositDate),
          paymentMode: v.paymentMode || null,
          bankName: v.bankName || null,
          updatedBy: userId,
        },
      });
      if (v.transactionIds.length > 0) {
        await tx.tDSTransaction.updateMany({
          where: { id: { in: v.transactionIds } },
          data: { status: "deposited", challanId: created.id },
        });
      }
      return created;
    });

    await recordMobileAudit({
      userId,
      // Distinct entityType so the deposit idempotency namespace does not
      // collide with plain challan creation.
      entityType: "TDSChallanDeposit",
      entityId: challan.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        depositDate: v.depositDate,
        depositedTransactions: v.transactionIds.length,
      },
    });

    return NextResponse.json({ id: challan.id, challan }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_TDS_DEPOSIT_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
