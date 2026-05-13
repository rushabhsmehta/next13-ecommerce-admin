import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { verifyMobileBearerUserId } from "@/app/api/mobile/lib/verify-mobile-user";
import {
  assertCrmApiAccessForRequest,
  crmAccessErrorResponse,
} from "@/lib/crm-route-access";

export const dynamic = "force-dynamic";

/**
 * Mobile customer detail: returns customer profile + most recent inquiries
 * + a lightweight financial snapshot (open sales count + outstanding amount).
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyMobileBearerUserId(req);
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

    const customer = await prismadb.customer.findUnique({
      where: { id: params.id },
      include: {
        associatePartner: { select: { id: true, name: true, mobileNumber: true } },
      },
    });
    if (!customer) return new NextResponse("Not found", { status: 404 });

    const [inquiries, sales] = await Promise.all([
      prismadb.inquiry.findMany({
        where: { customerMobileNumber: customer.contact ?? undefined },
        select: {
          id: true,
          status: true,
          numAdults: true,
          numChildren5to11: true,
          journeyDate: true,
          createdAt: true,
          location: { select: { id: true, label: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prismadb.saleDetail.findMany({
        where: { customerId: params.id },
        select: {
          id: true,
          invoiceNumber: true,
          salePrice: true,
          gstAmount: true,
          status: true,
          saleDate: true,
          receiptAllocations: { select: { allocatedAmount: true } },
        },
        orderBy: { saleDate: "desc" },
      }),
    ]);

    let outstanding = 0;
    for (const s of sales) {
      const billed = Number(s.salePrice ?? 0) + Number(s.gstAmount ?? 0);
      const paid = s.receiptAllocations.reduce(
        (acc, a) => acc + Number(a.allocatedAmount ?? 0),
        0
      );
      outstanding += Math.max(billed - paid, 0);
    }

    return NextResponse.json({
      customer,
      inquiries,
      sales: sales.slice(0, 10),
      summary: {
        salesCount: sales.length,
        outstanding,
      },
    });
  } catch (error) {
    console.log("[MOBILE_CUSTOMER_DETAIL]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
