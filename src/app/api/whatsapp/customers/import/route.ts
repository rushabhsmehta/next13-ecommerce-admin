import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { upsertWhatsAppCustomers } from '@/lib/whatsapp-customers';
import { parseWhatsAppCustomerCsv } from '@/lib/whatsapp-customer-csv';
import prisma from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.info('[whatsapp-import] Upload received, parsing form data');
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'CSV file is required' }, { status: 400 });
    }

    console.info('[whatsapp-import] File details', {
      name: file.name,
      size: typeof file.size === 'number' ? `${file.size} bytes` : 'unknown',
      type: file.type,
    });
    const buffer = Buffer.from(await file.arrayBuffer());
    const csvText = buffer.toString('utf-8');
    if (!csvText.trim()) {
      return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 });
    }

    // Fetch associate partners to create name→ID mapping for CSV parsing
    const partners = await prisma.associatePartner.findMany({
      select: { id: true, name: true },
    });
    const partnerNameToIdMap = new Map<string, string>();
    partners.forEach(p => {
      partnerNameToIdMap.set(p.name, p.id);
    });

    let parsed;
    try {
      parsed = parseWhatsAppCustomerCsv(csvText, {
        sourceName: file.name,
        partnerNameToIdMap,
      });
      console.info('[whatsapp-import] CSV parsed', {
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        skippedRows: parsed.skippedRows,
        errors: parsed.errors.length,
        duplicates: parsed.duplicates.length,
      });
      if (parsed.duplicates.length) {
        console.info('[whatsapp-import] Duplicate phone numbers detected',
          parsed.duplicates.map((entry) => ({
            phoneNumber: entry.phoneNumber,
            rows: entry.occurrences.map((occurrence) => occurrence.rowNumber),
          }))
        );
      }
    } catch (error: any) {
      console.warn('[whatsapp-import] CSV parsing failed', {
        name: file.name,
        message: error?.message,
      });
      return NextResponse.json(
        { error: error?.message || 'Invalid CSV file' },
        { status: 400 }
      );
    }

    if (parsed.customers.length === 0) {
      console.info('[whatsapp-import] All rows invalid, aborting import', {
        totalRows: parsed.totalRows,
        errors: parsed.errors.length,
      });
      return NextResponse.json(
        {
          error: 'All CSV rows failed validation',
          summary: {
            created: 0,
            updated: 0,
            total: 0,
            totalRows: parsed.totalRows,
            validRows: parsed.validRows,
            skippedRows: parsed.skippedRows,
            failed: parsed.errors.length,
            uniquePhones: parsed.uniquePhones,
            duplicates: parsed.duplicates,
          },
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    const result = await upsertWhatsAppCustomers(parsed.customers, { importedFrom: 'csv-upload' });
    console.info('[whatsapp-import] Database upsert complete', {
      created: result.created,
      updated: result.updated,
      attempted: parsed.customers.length,
      partial: parsed.errors.length > 0,
    });

    return NextResponse.json({
      success: true,
      partial: parsed.errors.length > 0,
      summary: {
        created: result.created,
        updated: result.updated,
        total: parsed.customers.length,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        skippedRows: parsed.skippedRows,
        failed: parsed.errors.length,
        uniquePhones: parsed.uniquePhones,
        duplicates: parsed.duplicates,
      },
      errors: parsed.errors,
    });
  } catch (error: any) {
    console.error('[whatsapp-import] Failed to import WhatsApp customers', error);
    return NextResponse.json({ error: error?.message || 'Failed to import customers' }, { status: 500 });
  }
}
