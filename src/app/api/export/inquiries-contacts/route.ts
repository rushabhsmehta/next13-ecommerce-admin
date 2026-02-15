import { NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs";
import prismadb from '@/lib/prismadb';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit('export');

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const limited = limiter.check(req);
    if (limited) return limited;

    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    console.log('[INQUIRIES_EXPORT] Starting export...');
    
    // Fetch all inquiries with customer details and associate partner info
    const inquiries = await prismadb.inquiry.findMany({
      select: {
        id: true,
        customerName: true,
        customerMobileNumber: true,
        locationId: true,
        status: true,
        journeyDate: true,
        createdAt: true,
        associatePartner: {
          select: {
            name: true,
            mobileNumber: true,
            email: true,
          }
        },
        location: {
          select: {
            label: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[INQUIRIES_EXPORT] Found ${inquiries.length} inquiries`);

    // Convert to CSV format
    const csvHeaders = [
      'Customer Name',
      'Mobile Number',
      'Location',
      'Status',
      'Journey Date',
      'Inquiry Date',
      'Associate Partner Name',
      'Associate Mobile',
      'Associate Email'
    ].join(',');

    const csvRows = inquiries.map((inquiry: any) => [
      `"${inquiry.customerName || ''}"`,
      `"${inquiry.customerMobileNumber || ''}"`,
      `"${inquiry.location?.label || ''}"`,
      `"${inquiry.status || ''}"`,
      inquiry.journeyDate ? `"${new Date(inquiry.journeyDate).toLocaleDateString()}"` : '""',
      `"${new Date(inquiry.createdAt).toLocaleDateString()}"`,
      `"${inquiry.associatePartner?.name || 'Direct'}"`,
      `"${inquiry.associatePartner?.mobileNumber || ''}"`,
      `"${inquiry.associatePartner?.email || ''}"`,,
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');

    console.log(`[INQUIRIES_EXPORT] CSV generated, size: ${csv.length} bytes`);

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="inquiries-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('[INQUIRIES_CONTACTS_EXPORT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
