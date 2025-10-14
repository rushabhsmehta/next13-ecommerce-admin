import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { WhatsAppTourPackageStatus } from '@prisma/client';
import prisma from '@/lib/prismadb';
import { updateTourPackage } from '@/lib/whatsapp-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = {
  params: {
    packageId: string;
  };
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = context.params;
    if (!packageId) {
      return NextResponse.json({ error: 'Package id is required' }, { status: 400 });
    }

    const tourPackage = await prisma.whatsAppTourPackage.findUnique({
      where: { id: packageId },
      include: {
        product: true,
        variants: {
          include: { variant: true },
        },
      },
    });

    if (!tourPackage) {
      return NextResponse.json({ error: 'Tour package not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, tourPackage });
  } catch (error) {
    console.error('Failed to load WhatsApp tour package', error);
    return NextResponse.json({ error: 'Failed to load tour package' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = context.params;
    if (!packageId) {
      return NextResponse.json({ error: 'Package id is required' }, { status: 400 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Update payload is required' }, { status: 400 });
    }

    const tourPackage = await updateTourPackage(packageId, body);

    return NextResponse.json({ success: true, tourPackage });
  } catch (error: any) {
    console.error('Failed to update WhatsApp tour package', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Tour package not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update tour package' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { packageId } = context.params;
    if (!packageId) {
      return NextResponse.json({ error: 'Package id is required' }, { status: 400 });
    }

    const tourPackage = await updateTourPackage(packageId, {
      status: WhatsAppTourPackageStatus.archived,
    });

    return NextResponse.json({ success: true, tourPackage });
  } catch (error: any) {
    console.error('Failed to archive WhatsApp tour package', error);
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Tour package not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to archive tour package' }, { status: 500 });
  }
}
