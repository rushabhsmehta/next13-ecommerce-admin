import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';
import { rateLimit } from '@/lib/rate-limit';
import { assertCrmApiAccessForRequest, crmAccessErrorResponse } from '@/lib/crm-route-access';
import { getRequestClerkUserId } from '@/lib/clerk-request-user';
import { isMobileBearerExportRequest, recordMobileExportAudit } from '@/app/api/export/lib/mobile-audit';

const limiter = rateLimit('export');

// Force dynamic rendering to prevent static generation errors
export const dynamic = 'force-dynamic';

// Shared CSV formatting with queries-contacts so both exports import into
// Excel identically (proper quote-escaping, UTF-8 BOM, CRLF line endings).
const UTF8_BOM = String.fromCharCode(0xfeff);

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

    // Accept either Clerk web session OR a mobile bearer token. The mobile
    // app calls this with Authorization: Bearer <jwt>. RBAC below is enforced
    // for both, so we do not weaken access by adding the bearer path.
    const userId = await getRequestClerkUserId(req);
    if (!userId) return new NextResponse("Unauthenticated", { status: 403 });

    try {
      await assertCrmApiAccessForRequest(userId, req.url);
    } catch (e) {
      const denied = crmAccessErrorResponse(e);
      if (denied) return denied;
      throw e;
    }

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
      escapeCsvValue(inquiry.customerName || ''),
      escapeCsvValue(inquiry.customerMobileNumber || ''),
      escapeCsvValue(inquiry.location?.label || ''),
      escapeCsvValue(inquiry.status || ''),
      escapeCsvValue(formatDate(inquiry.journeyDate)),
      escapeCsvValue(formatDate(inquiry.createdAt)),
      escapeCsvValue(inquiry.associatePartner?.name || 'Direct'),
      escapeCsvValue(inquiry.associatePartner?.mobileNumber || ''),
      escapeCsvValue(inquiry.associatePartner?.email || '')
    ].join(','));

    const csv = [UTF8_BOM + csvHeaders, ...csvRows].join('\r\n');

    console.log(`[INQUIRIES_EXPORT] CSV generated, size: ${csv.length} bytes`);

    if (isMobileBearerExportRequest(req)) {
      await recordMobileExportAudit({
        userId,
        entityType: 'InquiryContactsExport',
        bytes: csv.length,
        rows: inquiries.length,
      });
    }

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inquiries-contacts-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('[INQUIRIES_CONTACTS_EXPORT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
