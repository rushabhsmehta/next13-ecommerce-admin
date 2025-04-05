import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(req.url);
    
    // Extract query parameters
    const associateId = searchParams.get('associateId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    
    // Fetch all associate partners for display
    const partners = await prismadb.associatePartner.findMany({
      where: {
        isActive: true
      }
    });
    
    
    // Initialize the map with all partners
    const associatesMap = new Map();
    partners.forEach(partner => {
      associatesMap.set(partner.id, {
        associateId: partner.id,
        associateName: partner.name,
        confirmedBookings: 0,
        cancellations: 0,
        revenue: 0,
        commission: 0,
        totalInquiries: 0,
        performanceScore: 0
      });
    });
    
    // Build inquiry filter conditions
    const inquiryWhereClause: any = {};
    
    if (associateId && associateId !== 'all') {
      inquiryWhereClause.associatePartnerId = associateId;
    }
    
    if (startDate && endDate) {
      inquiryWhereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    // Fetch all inquiries with the filter conditions
    const inquiries = await prismadb.inquiry.findMany({
      where: inquiryWhereClause,
      include: {
        associatePartner: true,
        tourPackageQueries: {
          include: {
            saleDetails: true
          }
        }
      }
    });
    
    // Process all inquiries
    inquiries.forEach(inquiry => {
      const associateId = inquiry.associatePartnerId;
      if (!associateId) return; // Skip if no associate
      
      if (!associatesMap.has(associateId)) {
        associatesMap.set(associateId, {
          associateId,
          associateName: inquiry.associatePartner?.name || 'Unknown',
          confirmedBookings: 0,
          cancellations: 0,
          revenue: 0,
          commission: 0,
          totalInquiries: 0,
          performanceScore: 0
        });
      }
      
      const associate = associatesMap.get(associateId);
      associate.totalInquiries += 1;
      
      // Count cancellations - fix to use uppercase or handle case insensitively
      if (inquiry.status === 'CANCELLED') {
        associate.cancellations += 1;
      }
      
      // Count confirmed bookings and calculate revenue
      // FIXED: Changed from 'converted' to 'CONFIRMED' to match the rest of the application
      if (inquiry.status === 'CONFIRMED') {
        associate.confirmedBookings += 1;
        
        // Calculate revenue from tour package queries
        if (inquiry.tourPackageQueries && inquiry.tourPackageQueries.length > 0) {
          
          // Calculate revenue from sale details
          inquiry.tourPackageQueries.forEach(packageQuery => {
            if (packageQuery.saleDetails && packageQuery.saleDetails.length > 0) {
              packageQuery.saleDetails.forEach(sale => {
                associate.revenue += sale.salePrice || 0;
                
                // Assuming a 10% commission on sales
                const commissionRate = 10; // Could be stored in associatePartner model
                associate.commission += (sale.salePrice * commissionRate / 100) || 0;
              });
            } else if (packageQuery.totalPrice) {
              // If no sale details, try to use totalPrice from package
              const totalPrice = parseFloat(packageQuery.totalPrice.replace(/[^\d.-]/g, '') || '0');
              if (!isNaN(totalPrice)) {
                associate.revenue += totalPrice;
                
                // Calculate commission
                const commissionRate = 10;
                associate.commission += (totalPrice * commissionRate / 100);
              }
            }
          });
        }
      }
    });
    
    // Calculate performance score for each associate
    associatesMap.forEach(associate => {
      // Simple performance calculation:
      // 5 = Excellent: >80% conversion rate
      // 4 = Good: 60-80% conversion rate
      // 3 = Average: 40-60% conversion rate
      // 2 = Below Average: 20-40% conversion rate
      // 1 = Poor: <20% conversion rate
      
      const conversionRate = associate.totalInquiries > 0 
        ? (associate.confirmedBookings / associate.totalInquiries) * 100 
        : 0;
      
      if (conversionRate > 80) associate.performanceScore = 5;
      else if (conversionRate > 60) associate.performanceScore = 4;
      else if (conversionRate > 40) associate.performanceScore = 3;
      else if (conversionRate > 20) associate.performanceScore = 2;
      else associate.performanceScore = 1;
    });
    
    // Transform data for response
    const performanceData = Array.from(associatesMap.values()).map(associate => ({
      associateId: associate.associateId,
      associateName: associate.associateName,
      confirmedBookings: associate.confirmedBookings,
      cancellations: associate.cancellations,
      revenue: `Rs. ${associate.revenue.toLocaleString()}`,
      commission: `Rs. ${associate.commission.toLocaleString()}`,
      performance: associate.performanceScore === 5 ? "Excellent" :
                   associate.performanceScore === 4 ? "Good" :
                   associate.performanceScore === 3 ? "Average" :
                   associate.performanceScore === 2 ? "Below Average" : "Poor",
      totalInquiries: associate.totalInquiries
    }));
    
    return NextResponse.json(performanceData);
  } catch (error) {
    console.error('[ASSOCIATE_PERFORMANCE_API_ERROR]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

