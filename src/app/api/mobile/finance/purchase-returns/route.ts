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
  purchaseDetailId: z.string().uuid(),
  returnDate: z.string(),
  returnReason: z.string().max(2000).optional().nullable(),
  amount: z.number().positive(),
  gstAmount: z.number().optional().nullable(),
  reference: z.string().max(100).optional().nullable(),
  status: z.string().optional(),
  supplierCreditType: z.string().optional(),
  supplierCreditExpiry: z.string().optional().nullable(),
});

/**
 * Create a purchase return / supplier credit against an existing purchase.
 * AP-ledger only — no bank/cash movement here. Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("PurchaseReturn", key);
    if (prior) {
      const existing = await prismadb.purchaseReturn.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, purchaseReturn: existing, idempotentReplay: true },
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

    const purchase = await prismadb.purchaseDetail.findUnique({
      where: { id: v.purchaseDetailId },
      select: { id: true, supplierId: true },
    });
    if (!purchase) return new NextResponse("Purchase not found", { status: 404 });

    const purchaseReturn = await prismadb.purchaseReturn.create({
      data: {
        purchaseDetailId: v.purchaseDetailId,
        returnDate: dateToUtc(v.returnDate)!,
        returnReason: v.returnReason || null,
        amount: v.amount,
        gstAmount: v.gstAmount ?? null,
        reference: v.reference || null,
        status: v.status || "pending",
        supplierCreditType: v.supplierCreditType || "refund",
        supplierCreditExpiry: v.supplierCreditExpiry
          ? dateToUtc(v.supplierCreditExpiry)
          : null,
        supplierId: purchase.supplierId || null,
      },
    });

    await recordMobileAudit({
      userId,
      entityType: "PurchaseReturn",
      entityId: purchaseReturn.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        amount: v.amount,
        supplierCreditType: v.supplierCreditType || "refund",
      },
    });

    return NextResponse.json(
      { id: purchaseReturn.id, purchaseReturn },
      { status: 201 }
    );
  } catch (error) {
    console.log("[MOBILE_FINANCE_PURCHASE_RETURNS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

/** Read purchase returns (also powers the supplier-credits view via ?creditOnly=1). */
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
    const rows = await prismadb.purchaseReturn.findMany({
      where: creditOnly
        ? { supplierCreditType: { not: "refund" } }
        : undefined,
      select: {
        id: true,
        amount: true,
        gstAmount: true,
        supplierCreditType: true,
        supplierCreditExpiry: true,
        reference: true,
        status: true,
        returnDate: true,
        supplierId: true,
        purchaseDetail: { select: { billNumber: true } },
      },
      orderBy: { returnDate: "desc" },
      take: 100,
    });
    return NextResponse.json({ purchaseReturns: rows });
  } catch (error) {
    console.log("[MOBILE_FINANCE_PURCHASE_RETURNS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
