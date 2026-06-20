import { NextResponse } from "next/server";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import { requireOperationsRead } from "@/app/api/mobile/lib/assert-operations-access";
import { requireSalesTripsRead } from "@/app/api/mobile/lib/assert-sales-trips-access";
import { loadTourPackagePrefillFromQuery } from "@/lib/tour-package-from-query";

export const dynamic = "force-dynamic";

async function canRead(userId: string) {
  const ops = await requireOperationsRead(userId);
  if (ops.ok) return true;
  const sales = await requireSalesTripsRead(userId);
  return sales.ok;
}

export async function GET(
  _req: Request,
  props: { params: Promise<{ queryId: string }> }
) {
  try {
    const userId = await verifyMobileBearerUserId(_req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    if (!(await canRead(userId))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { queryId } = await props.params;
    const prefill = await loadTourPackagePrefillFromQuery(queryId);
    return NextResponse.json(prefill);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.log("[MOBILE_TOUR_PACKAGE_FROM_QUERY_PREFILL_GET]", error);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return new NextResponse("Internal error", { status: 500 });
  }
}
