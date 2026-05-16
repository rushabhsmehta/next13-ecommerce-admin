import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

/**
 * Open invoices/bills available for receipt/payment allocation.
 *   ?kind=sales&customerId=...     → open sales with balanceDue
 *   ?kind=purchases&supplierId=... → open purchases with balanceDue
 * Mirrors the web open-sales / open-purchases balance math. Read-only.
 */
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
    const kind = searchParams.get("kind") === "purchases" ? "purchases" : "sales";

    if (kind === "sales") {
      const customerId = searchParams.get("customerId");
      if (!customerId) {
        return new NextResponse("customerId required", { status: 400 });
      }
      const sales = await prismadb.saleDetail.findMany({
        where: { customerId },
        include: {
          receiptAllocations: { select: { allocatedAmount: true } },
          saleReturns: { select: { amount: true } },
          tourPackageQuery: { select: { id: true, tourPackageQueryName: true } },
        },
        orderBy: { saleDate: "asc" },
      });
      const items = sales
        .map((s) => {
          const invoice = (s.salePrice || 0) + (s.gstAmount || 0);
          const allocated = s.receiptAllocations.reduce(
            (a, x) => a + x.allocatedAmount,
            0
          );
          const returns = s.saleReturns.reduce((a, r) => a + (r.amount || 0), 0);
          return {
            id: s.id,
            reference: s.invoiceNumber ?? `#${s.id.slice(0, 8)}`,
            date: s.saleDate,
            tourPackageQueryId: s.tourPackageQueryId,
            tourPackageQueryName:
              s.tourPackageQuery?.tourPackageQueryName ?? null,
            totalAmount: invoice,
            allocated,
            balanceDue: invoice - allocated - returns,
          };
        })
        .filter((s) => s.balanceDue > 0.01);
      return NextResponse.json({ kind, items });
    }

    const supplierId = searchParams.get("supplierId");
    if (!supplierId) {
      return new NextResponse("supplierId required", { status: 400 });
    }
    const purchases = await prismadb.purchaseDetail.findMany({
      where: { supplierId },
      include: {
        paymentAllocations: { select: { allocatedAmount: true } },
        purchaseReturns: { select: { amount: true } },
        tourPackageQuery: { select: { id: true, tourPackageQueryName: true } },
      },
      orderBy: { purchaseDate: "asc" },
    });
    const items = purchases
      .map((p) => {
        const bill =
          p.netPayable != null
            ? p.netPayable
            : (p.price || 0) + (p.gstAmount || 0);
        const allocated = p.paymentAllocations.reduce(
          (a, x) => a + x.allocatedAmount,
          0
        );
        const returns = p.purchaseReturns.reduce(
          (a, r) => a + (r.amount || 0),
          0
        );
        return {
          id: p.id,
          reference: p.billNumber ?? `#${p.id.slice(0, 8)}`,
          date: p.purchaseDate,
          tourPackageQueryId: p.tourPackageQueryId,
          tourPackageQueryName: p.tourPackageQuery?.tourPackageQueryName ?? null,
          totalAmount: bill,
          allocated,
          balanceDue: bill - allocated - returns,
        };
      })
      .filter((p) => p.balanceDue > 0.01);
    return NextResponse.json({ kind, items });
  } catch (error) {
    console.log("[MOBILE_FINANCE_ALLOCATABLE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
