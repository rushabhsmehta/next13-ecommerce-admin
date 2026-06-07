import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { handleApi, jsonError, noStore } from "@/lib/api-response";
import { requireFinanceOrAdmin } from "@/lib/authz";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  props: { params: Promise<{ couponId: string }> }
) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, "AUTH");
    await requireFinanceOrAdmin(userId);

    const params = await props.params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const where: Record<string, unknown> = { campaignId: params.couponId };
    if (status && status !== "ALL") where.status = status;

    const redemptions = await (prismadb as any).couponRedemption.findMany({
      where,
      include: {
        inquiry: {
          select: { id: true, customerName: true, customerMobileNumber: true },
        },
        tourPackageQuery: {
          select: { id: true, tourPackageQueryName: true, tourPackageQueryNumber: true },
        },
        saleDetail: {
          select: { id: true, invoiceNumber: true, saleDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 250,
    });

    return noStore(NextResponse.json({ redemptions }));
  });
}
