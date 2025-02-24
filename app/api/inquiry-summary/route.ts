import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const associateId = searchParams.get("associateId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {};

    const associateFilter = associateId && associateId !== "all" ? {
      associatePartnerId: associateId
    } : {};

    const inquiries = await prismadb.inquiry.findMany({
      where: {
        ...dateFilter,
        ...associateFilter
      },
      include: {
        associatePartner: true
      }
    });

    // Process inquiries to create summary
    const summary = inquiries.reduce((acc: any, inquiry) => {
      const associateId = inquiry.associatePartnerId;
      if (!associateId) return acc;
      if (!acc[associateId]) {
        acc[associateId] = {
          associateId,
          associateName: inquiry.associatePartner?.name || "Unknown",
          totalBookings: 0,
          confirmedBookings: 0,
          cancellations: 0,
          revenue: 0,
          commission: 0,
          totalInquiries: 0
        };
      }

      acc[associateId].totalInquiries++;
      if (inquiry.status === "CONFIRMED") {
        acc[associateId].confirmedBookings++;
     /*    acc[associateId].revenue += inquiry.totalAmount || 0;
        acc[associateId].commission += inquiry.commissionAmount || 0;
     */  } else if (inquiry.status === "CANCELLED") {
        acc[associateId].cancellations++;
      }
      acc[associateId].totalBookings = acc[associateId].confirmedBookings + acc[associateId].cancellations;

      return acc;
    }, {});

    return NextResponse.json(Object.values(summary));
  } catch (error) {
    console.log('[INQUIRY_SUMMARY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
