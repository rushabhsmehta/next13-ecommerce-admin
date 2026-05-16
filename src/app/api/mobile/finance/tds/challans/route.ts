import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";
import {
  requireFinanceWrite,
  readIdempotencyKey,
  findPriorIdempotentEntityId,
} from "@/app/api/mobile/lib/finance-guard";
import { recordMobileAudit } from "@/app/api/mobile/lib/mobile-audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  bsrCode: z.string().max(50).optional().nullable(),
  challanSerialNo: z.string().max(50).optional().nullable(),
  depositDate: z.string().optional().nullable(),
  paymentMode: z.string().max(50).optional().nullable(),
  bankName: z.string().max(120).optional().nullable(),
  amount: z.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  transactionIds: z.array(z.string().uuid()).optional().default([]),
});

async function canRead(userId: string) {
  const [membership, ia] = await Promise.all([
    prismadb.organizationMember.findFirst({
      where: { userId, isActive: true },
      select: { role: true },
    }),
    resolveInquiryAccessContext(userId),
  ]);
  return buildMobileAdminProfile(
    membership?.role ?? null,
    ia.isAssociate
  ).permissions.includes("finance.read");
}

/** List TDS challans with aggregated totals. */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!(await canRead(userId))) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const challans = await prismadb.tDSChallan.findMany({
      where: { deletedAt: null },
      orderBy: { depositDate: "desc" },
      include: { tdsTransactions: { select: { tdsAmount: true } } },
      take: 100,
    });
    return NextResponse.json({
      challans: challans.map((c) => ({
        id: c.id,
        bsrCode: c.bsrCode,
        challanSerialNo: c.challanSerialNo,
        depositDate: c.depositDate,
        paymentMode: c.paymentMode,
        bankName: c.bankName,
        notes: c.notes,
        transactions: c.tdsTransactions.length,
        totalTds: c.tdsTransactions.reduce(
          (s, t) => s + (t.tdsAmount || 0),
          0
        ),
      })),
    });
  } catch (error) {
    console.log("[MOBILE_FINANCE_TDS_CHALLANS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/**
 * Create a TDS challan and (optionally) attach pending TDS transactions to
 * it, marking them deposited. This is bookkeeping/grouping only — it does NOT
 * move any bank/cash balance (the actual government deposit is recorded via
 * the web `tds/deposit` flow). Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("TDSChallan", key);
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
          depositDate: v.depositDate ? new Date(v.depositDate) : null,
          paymentMode: v.paymentMode || null,
          bankName: v.bankName || null,
          amount: v.amount ?? null,
          notes: v.notes || null,
          updatedBy: userId,
        },
      });
      if (v.transactionIds?.length) {
        for (const id of v.transactionIds) {
          await tx.tDSTransaction.update({
            where: { id },
            data: { challanId: created.id, status: "deposited" },
          });
        }
      }
      return created;
    });

    await recordMobileAudit({
      userId,
      entityType: "TDSChallan",
      entityId: challan.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        linkedTransactions: v.transactionIds?.length ?? 0,
      },
    });

    return NextResponse.json({ id: challan.id, challan }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_TDS_CHALLANS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
