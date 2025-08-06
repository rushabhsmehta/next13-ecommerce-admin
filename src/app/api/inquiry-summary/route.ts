import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const associateId = searchParams.get('associateId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    
    // Build the filter conditions
    const whereClause: any = {};
    
    if (associateId && associateId !== 'all') {
      whereClause.associatePartnerId = associateId;
    }
    
    // Map the frontend status values to database status values - FIXED: use uppercase to match rest of app
    if (status && status !== 'all') {
      if (status === 'PENDING') {
        whereClause.status = 'PENDING'; // Changed from lowercase 'pending'
      } else if (status === 'CONFIRMED') {
        whereClause.status = 'CONFIRMED'; // Changed from 'converted'
      } else if (status === 'CANCELLED') {
        whereClause.status = 'CANCELLED'; // Changed from lowercase 'cancelled'
      }
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    console.log("Query where clause:", whereClause);
    
    // Fetch all inquiries based on filters
    const inquiries = await prismadb.inquiry.findMany({
      where: whereClause,
      include: {
        associatePartner: true,
        actions: true
      },
    });

    console.log(`Found ${inquiries.length} inquiries`);    
    // Group inquiries by associate partner
    const associatesMap = new Map();
    
    inquiries.forEach(inquiry => {
      const associateId = inquiry.associatePartnerId || 'unassigned';
      const associateName = inquiry.associatePartner?.name || 'Unassigned';
      
      if (!associatesMap.has(associateId)) {
        associatesMap.set(associateId, {
          associateId,
          associateName,
          totalInquiries: 0,
          pendingInquiries: 0,
          confirmedInquiries: 0,
          cancelledInquiries: 0,
          contactedInquiries: 0,
          responseTimesSum: 0,
          responsesCount: 0,
        });
      }
      
      const associate = associatesMap.get(associateId);
      associate.totalInquiries += 1;
      
      // Count by status - FIXED: use uppercase status values consistently
      switch (inquiry.status) {
        case 'PENDING':
          associate.pendingInquiries += 1;
          break;
        case 'CONFIRMED': // Changed from 'converted'
          associate.confirmedInquiries += 1;
          break;
        case 'CANCELLED':
          associate.cancelledInquiries += 1;
          break;
        case 'QUERY_SENT':
          associate.contactedInquiries += 1;
          break;
        case 'contacted': // Keeping this lowercase since it might still exist in legacy data
          associate.contactedInquiries += 1;
          break;
      }
      
      // Calculate response time using first action if available
      if (inquiry.actions && inquiry.actions.length > 0 && inquiry.createdAt) {
        const firstAction = inquiry.actions.sort(
          (a, b) => new Date(a.actionDate).getTime() - new Date(b.actionDate).getTime()
        )[0];
        
        const responseTime = new Date(firstAction.actionDate).getTime() - new Date(inquiry.createdAt).getTime();
        const responseHours = responseTime / (1000 * 60 * 60); // Convert to hours
        associate.responseTimesSum += responseHours;
        associate.responsesCount += 1;
      }
    });
    
    // Transform data for response
    const summaryData = Array.from(associatesMap.values()).map(associate => {
      const averageResponseTime = associate.responsesCount > 0 
        ? `${(associate.responseTimesSum / associate.responsesCount).toFixed(1)} hrs` 
        : 'N/A';
        
      return {
        associateId: associate.associateId,
        associateName: associate.associateName,
        totalInquiries: associate.totalInquiries,
        pendingInquiries: associate.pendingInquiries,
        confirmedInquiries: associate.confirmedInquiries,
        cancelledInquiries: associate.cancelledInquiries,
        contactedInquiries: associate.contactedInquiries,
        averageResponseTime
      };
    });
    
    return NextResponse.json(summaryData);
  } catch (error) {
    console.error('[INQUIRY_SUMMARY_API_ERROR]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

