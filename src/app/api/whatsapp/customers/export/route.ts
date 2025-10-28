import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { exportWhatsAppCustomers } from '@/lib/whatsapp-customers';
import type { WhatsAppCustomer } from '@prisma/whatsapp-client';

function parseTags(raw: string | null) {
  if (!raw) {
    return [] as string[];
  }
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
    )
  );
}

function formatCsvValue(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value).replace(/"/g, '""');
  if (stringValue.search(/([",\n])/g) >= 0) {
    return `"${stringValue}"`;
  }
  return stringValue;
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || undefined;
    const tags = parseTags(url.searchParams.get('tags'));
    const isOptedInParam = url.searchParams.get('isOptedIn');
    const customers = await exportWhatsAppCustomers({
      search,
      tags: tags.length ? tags : undefined,
      isOptedIn: isOptedInParam !== null ? isOptedInParam === 'true' : undefined,
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    const headers = [
      'First Name',
      'Last Name',
      'Mobile Number',
      'Email',
      'Tags',
      'Opt-In Status',
      'Notes',
      'Imported From',
      'Imported At',
      'Last Contacted At',
      'Created At',
      'Updated At',
    ];

    const rows = customers.map((customer: WhatsAppCustomer) => {
      const tagsValue = Array.isArray(customer.tags)
        ? (customer.tags as unknown[])
            .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
            .join('|')
        : '';
      return [
        formatCsvValue(customer.firstName),
        formatCsvValue(customer.lastName ?? ''),
        formatCsvValue(customer.phoneNumber),
        formatCsvValue(customer.email ?? ''),
        formatCsvValue(tagsValue),
        formatCsvValue(customer.isOptedIn ? 'Opted In' : 'Opted Out'),
        formatCsvValue(customer.notes ?? ''),
        formatCsvValue(customer.importedFrom ?? ''),
        formatCsvValue(customer.importedAt ? customer.importedAt.toISOString() : ''),
        formatCsvValue(customer.lastContactedAt ? customer.lastContactedAt.toISOString() : ''),
        formatCsvValue(customer.createdAt.toISOString()),
        formatCsvValue(customer.updatedAt.toISOString()),
      ].join(',');
    });

    const csvBody = ['\ufeff' + headers.join(','), ...rows].join('\r\n');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    const filename = `whatsapp-customers-${timestamp}.csv`;

    return new Response(csvBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[whatsapp-export] Failed to generate CSV', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to export customers' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
