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
  supplierId: z.string().uuid(),
  tourPackageQueryId: z.string().uuid().optional().nullable(),
  purchaseDate: z.string(),
  billNumber: z.string().max(100).optional().nullable(),
  billDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  price: z.number().nonnegative(),
  gstAmount: z.number().optional().nullable(),
  gstPercentage: z.number().optional().nullable(),
  isGst: z.boolean().optional(),
  cgstAmount: z.number().optional().nullable(),
  sgstAmount: z.number().optional().nullable(),
  igstAmount: z.number().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  status: z.string().optional(),
  items: z.array(itemSchema).optional().default([]),
});

/**
 * Create a supplier purchase/bill (+ optional item lines). Purchases affect
 * the supplier payable ledger only — no bank/cash balance moves, so no
 * recalculate is needed. TDS on purchases is NOT computed here (stays in the
 * web flow); mobile purchases are tax-neutral. Idempotent.
 */
export async function POST(req: Request) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const guard = await requireFinanceWrite(userId);
    if (!guard.ok) return guard.response;

    const key = readIdempotencyKey(req);
    const prior = await findPriorIdempotentEntityId("PurchaseDetail", key);
    if (prior) {
      const existing = await prismadb.purchaseDetail.findUnique({
        where: { id: prior },
      });
      return NextResponse.json(
        { id: prior, purchase: existing, idempotentReplay: true },
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

    const purchase = await prismadb.$transaction(async (tx) => {
      const created = await tx.purchaseDetail.create({
        data: {
          supplierId: v.supplierId,
          tourPackageQueryId: v.tourPackageQueryId || null,
          purchaseDate: dateToUtc(v.purchaseDate)!,
          billNumber: v.billNumber || null,
          billDate: v.billDate ? dateToUtc(v.billDate) : null,
          dueDate: v.dueDate ? dateToUtc(v.dueDate) : null,
          price: v.price,
          gstAmount: v.gstAmount ?? null,
          gstPercentage: v.gstPercentage ?? null,
          description: v.description || null,
          status: v.status || "pending",
          isGst: v.isGst !== undefined ? v.isGst : true,
          cgstAmount: v.cgstAmount ?? null,
          sgstAmount: v.sgstAmount ?? null,
          igstAmount: v.igstAmount ?? null,
        } as any,
      });
      for (let i = 0; i < (v.items?.length ?? 0); i++) {
        const it = v.items![i];
        await tx.purchaseItem.create({
          data: {
            purchaseDetailId: created.id,
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
      return created;
    });

    await recordMobileAudit({
      userId,
      entityType: "PurchaseDetail",
      entityId: purchase.id,
      action: "CREATE",
      metadata: {
        idempotencyKey: key ?? undefined,
        price: v.price,
        items: v.items?.length ?? 0,
      },
    });

    return NextResponse.json({ id: purchase.id, purchase }, { status: 201 });
  } catch (error) {
    console.log("[MOBILE_FINANCE_PURCHASES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
