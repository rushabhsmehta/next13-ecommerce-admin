import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { parse } from 'csv-parse/sync';
import {
  normalizeWhatsAppPhone,
  upsertWhatsAppCustomers,
} from '@/lib/whatsapp-customers';

const REQUIRED_HEADERS = ['first name', 'mobile number'];

function sanitizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function splitTags(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }
  const values = raw
    .split(/[,|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return values.length ? values : undefined;
}

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

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string | undefined>[];

    if (!records.length) {
      return NextResponse.json({ error: 'No customer rows found in CSV' }, { status: 400 });
    }

    const normalizedHeaders = Object.keys(records[0]).map(sanitizeHeader);
    const missingHeaders = REQUIRED_HEADERS.filter((header) => !normalizedHeaders.includes(header));
    if (missingHeaders.length) {
      return NextResponse.json({
        error: `Missing required columns: ${missingHeaders.join(', ')}`,
      }, { status: 400 });
    }

    const mapped = records.map((record, index) => {
      const get = (key: string) => {
        const entry = Object.entries(record).find(([header]) => sanitizeHeader(header) === key);
        return entry ? entry[1] : undefined;
      };

      const firstName = get('first name');
      const lastName = get('last name');
      const mobile = get('mobile number');
      const email = get('email');
      const tags = splitTags(get('tags'));
      const notes = get('notes');

      if (!firstName || !mobile) {
        throw new Error(`Row ${index + 2}: first name and mobile number are required`);
      }

      return {
        firstName,
        lastName,
        phoneNumber: normalizeWhatsAppPhone(mobile),
        email,
        tags,
        notes,
        importedFrom: file.name,
        importedAt: new Date(),
      };
    });

    const result = await upsertWhatsAppCustomers(mapped, { importedFrom: 'csv-upload' });

    return NextResponse.json({
      success: true,
      summary: {
        created: result.created,
        updated: result.updated,
        total: mapped.length,
      },
    });
  } catch (error: any) {
    console.error('Failed to import WhatsApp customers', error);
    return NextResponse.json({ error: error?.message || 'Failed to import customers' }, { status: 500 });
  }
}
