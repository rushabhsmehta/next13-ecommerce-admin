import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    console.log('[QUERIES_EXPORT] Starting export...');
    
    // Fetch all tour package queries with customer details and associate partner info
    const queries = await prismadb.tourPackageQuery.findMany({
      select: {
        id: true,
        tourPackageQueryNumber: true,
        customerName: true,
        customerNumber: true,
        locationId: true,
        tourStartsFrom: true,
        createdAt: true,
        associatePartnerId: true,
        inquiryId: true,
        location: {
          select: {
            label: true,
          }
        },
        associatePartner: {
          select: {
            name: true,
            mobileNumber: true,
            email: true,
          }
        },
        inquiry: {
          select: {
            customerName: true,
            customerMobileNumber: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[QUERIES_EXPORT] Found ${queries.length} queries`);

    // Convert to CSV format
    const csvHeaders = [
      'Query Number',
      'Customer Name (Query)',
      'Mobile Number (Query)',
      'Customer Name (Inquiry)',
      'Mobile Number (Inquiry)',
      'Location',
      'Tour Start Date',
      'Query Created Date',
      'Associate Partner Name',
      'Associate Mobile',
      'Associate Email'
    ].join(',');

    const csvRows = queries.map((query: any) => [
      `"${query.tourPackageQueryNumber || query.id}"`,
      `"${query.customerName || ''}"`,
      `"${query.customerNumber || ''}"`,
      `"${query.inquiry?.customerName || ''}"`,
      `"${query.inquiry?.customerMobileNumber || ''}"`,
      `"${query.location?.label || ''}"`,

      query.tourStartsFrom ? `"${new Date(query.tourStartsFrom).toLocaleDateString()}"` : '""',
      `"${new Date(query.createdAt).toLocaleDateString()}"`,
      `"${query.associatePartner?.name || 'Direct'}"`,
      `"${query.associatePartner?.mobileNumber || ''}"`,
      `"${query.associatePartner?.email || ''}"`,

    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');

    console.log(`[QUERIES_EXPORT] CSV generated, size: ${csv.length} bytes`);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="tour-queries-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[QUERIES_CONTACTS_EXPORT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
