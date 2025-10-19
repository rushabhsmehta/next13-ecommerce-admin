import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prismadb';
import { ensureCatalogReady, syncPendingTourPackages } from '@/lib/whatsapp-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const catalog = await ensureCatalogReady();

    const [availableCatalogs, totalPackages, statusGroups, syncGroups] = await Promise.all([
      prisma.whatsAppCatalog.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          metaCatalogId: true,
          currency: true,
          isActive: true,
          isPublic: true,
          autoSync: true,
        },
      }),
      prisma.whatsAppTourPackage.count(),
      prisma.whatsAppTourPackage.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.whatsAppTourPackage.groupBy({
        by: ['syncStatus'],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = statusGroups.reduce<Record<string, number>>((acc, group) => {
      acc[group.status] = group._count._all;
      return acc;
    }, {});

    const syncCounts = syncGroups.reduce<Record<string, number>>((acc, group) => {
      acc[group.syncStatus] = group._count._all;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      catalog,
      availableCatalogs,
      stats: {
        totalPackages,
        byStatus: statusCounts,
        bySyncStatus: syncCounts,
        pendingSync: (syncCounts.pending || 0) + (syncCounts.failed || 0),
      },
      metaConfigured: Boolean(catalog.metaCatalogId),
      defaultCatalogId: catalog.metaCatalogId,
    });
  } catch (error) {
    console.error('Failed to fetch WhatsApp catalog summary', error);
    return NextResponse.json({ error: 'Failed to load catalog summary' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      body = {};
    }

    const action = typeof body?.action === 'string' ? body.action : 'sync';
    if (action !== 'sync') {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    }

    const rawLimit = body?.limit;
    let limit = 10;
    if (typeof rawLimit === 'number') {
      limit = rawLimit;
    } else if (typeof rawLimit === 'string') {
      const parsed = parseInt(rawLimit, 10);
      if (!Number.isNaN(parsed)) {
        limit = parsed;
      }
    }
    limit = Math.min(Math.max(limit, 1), 25);

    const result = await syncPendingTourPackages(limit);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Failed to trigger WhatsApp catalog sync', error);
    return NextResponse.json({ error: 'Failed to trigger catalog sync' }, { status: 500 });
  }
}
