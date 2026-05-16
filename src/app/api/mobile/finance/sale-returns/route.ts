import { NextResponse } from "next/server";
import { z } from "zod";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from "@/lib/timezone-utils";
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
  saleDetailId: z.string().uuid(),
  returnDate: z.string(),
  returnReason: z.string().max(2000).optional().nullable(),
  amount: z.number().positive(),
  gstAmount: z.number().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  status: z.string().optional(),
  creditType: z.string().optional(),
  creditNoteAmount: z.number().optional().nullable(),
  creditNoteNumber: z.string().max(100).optional().nullable(),
});

/**
 * Create a sale return / credit note against an existing sale. AR-ledger
 * only — no bank/cash movement here (a cash refund is a separate payment).
 * Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("SaleReturn", key);
    if (prior) {
      const existing = await prismadb.saleReturn.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, saleReturn: existing, idempotentReplay: true },
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

    const sale = await prismadb.saleDetail.findUnique({
      where: { id: v.saleDetailId },
      select: { id: true, customerId: true },
    });
    if (!sale) return new NextResponse("Sale not found", { status: 404 });

    const saleReturn = await prismadb.saleReturn.create({
      data: {
        saleDetailId: v.saleDetailId,
        returnDate: dateToUtc(v.returnDate)!,
        returnReason: v.returnReason || null,
        amount: v.amount,
        gstAmount: v.gstAmount ?? null,
        reference: v.reference || null,
        status: v.status || "pending",
        creditType: v.creditType || "cash_refund",
        creditNoteAmount: v.creditNoteAmount ?? null,
        creditNoteNumber: v.creditNoteNumber || null,
        customerId: sale.customerId || null,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "SaleReturn",
      entityId: saleReturn.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        amount: v.amount,
        creditType: v.creditType || "cash_refund",
      },
    });

    return NextResponse.json({ id: saleReturn.id, saleReturn }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_SALE_RETURNS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/** Read sale returns (also powers the credit-notes view via ?creditOnly=1). */
export async function GET(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const [membership, ia] = await Promise.all([
      prismadb.organizationMember.findFirst({
        where: { userId, isActive: true },
        select: { role: true },
      }),
      resolveInquiryAccessContext(userId),
    ]);
    if (
      !buildMobileAdminProfile(membership?.role ?? null, ia.isAssociate)
        .permissions.includes("finance.read")
    ) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const creditOnly = searchParams.get("creditOnly") === "1";
    const rows = await prismadb.saleReturn.findMany({
      where: creditOnly
        ? { creditType: { not: "cash_refund" } }
        : undefined,
      select: {
        id: true,
        amount: true,
        gstAmount: true,
        creditNoteAmount: true,
        creditNoteNumber: true,
        creditType: true,
        reference: true,
        status: true,
        returnDate: true,
        customerId: true,
        saleDetail: { select: { invoiceNumber: true } },
      },
      orderBy: { returnDate: "desc" },
      take: 100,
    });
    return NextResponse.json({ saleReturns: rows });
  } catch (error) {
    console.log("[MOBILE_FINANCE_SALE_RETURNS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
