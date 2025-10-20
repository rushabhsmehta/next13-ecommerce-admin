import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { upsertWhatsAppCustomers } from '@/lib/whatsapp-customers';
import { parseWhatsAppCustomerCsv } from '@/lib/whatsapp-customer-csv';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const csvText = buffer.toString('utf-8');
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    let parsed;
    try {
      parsed = parseWhatsAppCustomerCsv(csvText, { sourceName: file.name });
    } catch (error: any) {
      return NextResponse.json(
        { error: error?.message || 'Invalid CSV file' },
        { status: 400 }
      );
    }

    const result = await upsertWhatsAppCustomers(parsed.customers, { importedFrom: 'csv-upload' });

    return NextResponse.json({
      success: true,
      summary: {
        created: result.created,
        updated: result.updated,
        total: parsed.customers.length,
        totalRows: parsed.totalRows,
        uniquePhones: parsed.uniquePhones,
        duplicates: parsed.duplicates,
      },
    });
  } catch (error: any) {
    console.error('Failed to import WhatsApp customers', error);
    return NextResponse.json({ error: error?.message || 'Failed to import customers' }, { status: 500 });
  }
}
