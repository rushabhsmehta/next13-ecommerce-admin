import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { buildMobileAdminProfile } from "@/lib/mobile-admin-access";
import { resolveInquiryAccessContext } from "@/lib/inquiry-access";

export const dynamic = "force-dynamic";

/**
 * TDS transactions are read-only on mobile. They are produced as a side
 * effect of TDS-bearing receipts/payments on the web; mobile money writes are
 * tax-neutral, so there is nothing to create here. `?status=` optional filter.
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
    const status = searchParams.get("status");
    const rows = await prismadb.tDSTransaction.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true,
        tdsType: true,
        baseAmount: true,
        appliedRate: true,
        tdsAmount: true,
        financialYear: true,
        quarter: true,
        status: true,
        pan: true,
        challanId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const totals = rows.reduce(
      (acc, r) => {
        acc.tds += r.tdsAmount ?? 0;
        if (r.status === "pending") acc.pending += r.tdsAmount ?? 0;
        return acc;
      },
      { tds: 0, pending: 0 }
    );

    return NextResponse.json({ transactions: rows, totals });
  } catch (error) {
    console.log("[MOBILE_FINANCE_TDS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
