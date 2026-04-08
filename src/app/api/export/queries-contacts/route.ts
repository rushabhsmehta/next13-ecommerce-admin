import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import { rateLimit } from '@/lib/rate-limit';

const limiter = rateLimit('export');

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

const escapeCsvValue = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

export async function GET(req: Request) {
  try {
    const limited = limiter.check(req);
    if (limited) return limited;

    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthenticated', { status: 403 });

    console.log('[QUERIES_EXPORT] Starting export...');

    // Fetch all tour package queries with customer details and associate partner info
    const queries = await prismadb.tourPackageQuery.findMany({
      select: {
        id: true,
        tourPackageQueryNumber: true,
        customerName: true,
        customerNumber: true,
        tourStartsFrom: true,
        createdAt: true,
        location: {
          select: {
            label: true,
          },
        },
        associatePartner: {
          select: {
            name: true,
            mobileNumber: true,
            email: true,
          },
        },
        inquiry: {
          select: {
            customerName: true,
            customerMobileNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`[QUERIES_EXPORT] Found ${queries.length} queries`);

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
      'Associate Email',
    ].join(',');

    const csvRows = queries.map((query: any) => [
      escapeCsvValue(query.tourPackageQueryNumber || query.id),
      escapeCsvValue(query.customerName || ''),
      escapeCsvValue(query.customerNumber || ''),
      escapeCsvValue(query.inquiry?.customerName || ''),
      escapeCsvValue(query.inquiry?.customerMobileNumber || ''),
      escapeCsvValue(query.location?.label || ''),
      escapeCsvValue(formatDate(query.tourStartsFrom)),
      escapeCsvValue(formatDate(query.createdAt)),
      escapeCsvValue(query.associatePartner?.name || 'Direct'),
      escapeCsvValue(query.associatePartner?.mobileNumber || ''),
      escapeCsvValue(query.associatePartner?.email || ''),
    ].join(','));

    const csv = ['\uFEFF' + csvHeaders, ...csvRows].join('\r\n');

    console.log(`[QUERIES_EXPORT] CSV generated, size: ${csv.length} bytes`);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tour-queries-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[QUERIES_CONTACTS_EXPORT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
