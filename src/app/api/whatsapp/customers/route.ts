import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  createWhatsAppCustomer,
  listWhatsAppCustomers,
  normalizeWhatsAppPhone,
} from '@/lib/whatsapp-customers';

function parseTagsParam(raw: string | null) {
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

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get('search') || undefined;
    const tags = parseTagsParam(url.searchParams.get('tags'));
    const isOptedInParam = url.searchParams.get('isOptedIn');
    const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 200);

    const filters = {
      search,
      tags: tags.length ? tags : undefined,
      isOptedIn: isOptedInParam !== null ? isOptedInParam === 'true' : undefined,
      skip: (page - 1) * limit,
      take: limit,
    } as const;

    const result = await listWhatsAppCustomers(filters);

    return NextResponse.json({
      success: true,
      data: result.data,
      tags: result.tags,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      },
    });
  } catch (error: any) {
    console.error('Failed to list WhatsApp customers', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      phoneNumber,
      email,
      tags,
      notes,
      isOptedIn,
      metadata,
    } = body || {};

    if (!firstName || !phoneNumber) {
      return NextResponse.json({ error: 'First name and phone number are required' }, { status: 400 });
    }

    const customer = await createWhatsAppCustomer({
      firstName,
      lastName,
      phoneNumber: normalizeWhatsAppPhone(phoneNumber),
      email,
      tags,
      notes,
      isOptedIn,
      metadata,
      importedFrom: 'manual',
      importedAt: new Date(),
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create WhatsApp customer', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create customer' }, { status: 500 });
  }
}
