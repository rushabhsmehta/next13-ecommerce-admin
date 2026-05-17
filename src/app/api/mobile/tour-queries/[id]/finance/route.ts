import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  associateCanViewTourPackageQuery,
  requireSalesTripsRead,
} from "@/app/api/mobile/lib/assert-sales-trips-access";
import { getTourPackageQueryFinanceSummary } from "@/lib/tour-package-query-finance-summary";

export const dynamic = "force-dynamic";

/**
 * Read-only per-query financial summary for mobile.
 * Totals and sections mirror `/fetchaccounts/[tourPackageQueryId]`.
 */
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const accessResult = await requireSalesTripsRead(userId);
    if (!accessResult.ok) return accessResult.response;
    const { access } = accessResult;

    const params = await props.params;
    const id = params.id?.trim();
    if (!id) return new NextResponse("Missing id", { status: 400 });

    const scopeRow = await prismadb.tourPackageQuery.findUnique({
      where: { id },
      select: {
        id: true,
        associatePartnerId: true,
        inquiry: { select: { associatePartnerId: true } },
      },
    });
    if (!scopeRow) return new NextResponse("Not found", { status: 404 });
    if (!associateCanViewTourPackageQuery(access, scopeRow)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const summary = await getTourPackageQueryFinanceSummary(id);
    if (!summary) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(summary);
  } catch (error) {
    console.log("[MOBILE_TOUR_QUERY_FINANCE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
