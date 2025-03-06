import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request
) {
  try {
    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    
    // Build where clause for date filtering
    const where: any = {};
    
    if (fromDate || toDate) {
      where.createdAt = {};
      
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      
      if (toDate) {
        // Setting time to end of day to include the entire day
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Get summary of inquiries grouped by status
    const summary = await prismadb.inquiry.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
      where
    });

    // Get total count of inquiries
    const total = await prismadb.inquiry.count({ where });

    return NextResponse.json({
      summary,
      total
    });
  } catch (error) {
    console.log('[INQUIRY_SUMMARY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
