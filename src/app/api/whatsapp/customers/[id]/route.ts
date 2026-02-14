import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  deleteWhatsAppCustomer,
  getWhatsAppCustomerById,
  normalizeWhatsAppPhone,
  updateWhatsAppCustomer,
} from '@/lib/whatsapp-customers';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await getWhatsAppCustomerById(params.id);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('Failed to get WhatsApp customer', error);
    return NextResponse.json({ error: error?.message || 'Failed to load customer' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
      associatePartnerId,
    } = body || {};

    if (firstName !== undefined && !firstName) {
      return NextResponse.json({ error: 'First name cannot be empty' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      firstName,
      lastName,
      email,
      tags,
      notes,
      isOptedIn,
      metadata,
      associatePartnerId,
    };

    if (phoneNumber !== undefined) {
      payload.phoneNumber = normalizeWhatsAppPhone(phoneNumber);
    }

    const customer = await updateWhatsAppCustomer(params.id, payload as any);
    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    console.error('Failed to update WhatsApp customer', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteWhatsAppCustomer(params.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete WhatsApp customer', error);
    return NextResponse.json({ error: error?.message || 'Failed to delete customer' }, { status: 500 });
  }
}
