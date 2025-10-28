import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma, WhatsAppCatalogSyncStatus, WhatsAppTourPackageStatus } from '@prisma/whatsapp-client';
import whatsappPrisma from '@/lib/whatsapp-prismadb';
import { createTourPackage } from '@/lib/whatsapp-catalog';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type QueryOptions = {
  status?: WhatsAppTourPackageStatus;
  syncStatus?: WhatsAppCatalogSyncStatus;
  search?: string;
  page: number;
  limit: number;
  includeVariants: boolean;
};

function parseQuery(request: NextRequest): QueryOptions {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status') || undefined;
  const syncStatusParam = url.searchParams.get('syncStatus') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const includeVariants = url.searchParams.get('includeVariants') !== 'false';
  const page = Math.max(parseInt(url.searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '25', 10), 1), 100);

  return {
    status: statusParam as WhatsAppTourPackageStatus | undefined,
    syncStatus: syncStatusParam as WhatsAppCatalogSyncStatus | undefined,
    search,
    page,
    limit,
    includeVariants,
  };
}

function buildWhereClause(options: QueryOptions): Prisma.WhatsAppTourPackageWhereInput {
  const where: Prisma.WhatsAppTourPackageWhereInput = {};

  if (options.status) {
    where.status = options.status;
  }

  if (options.syncStatus) {
    where.syncStatus = options.syncStatus;
  }

  if (options.search) {
    where.OR = [
      { title: { contains: options.search } },
      { subtitle: { contains: options.search } },
      { retailerId: { contains: options.search } },
      {
        product: {
          sku: { contains: options.search },
        },
      },
    ];
  }

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const options = parseQuery(request);

    const where = buildWhereClause(options);

    const [total, packages] = await Promise.all([
      whatsappPrisma.whatsAppTourPackage.count({ where }),
      whatsappPrisma.whatsAppTourPackage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        include: {
          product: true,
          ...(options.includeVariants
            ? {
                variants: {
                  include: {
                    variant: true,
                  },
                },
              }
            : {}),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: packages,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages: Math.ceil(total / options.limit) || 1,
      },
    });
  } catch (error) {
    console.error('Failed to list WhatsApp tour packages', error);
    return NextResponse.json({ error: 'Failed to load tour packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    if (!body || !body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const tourPackage = await createTourPackage(body);

    return NextResponse.json({ success: true, tourPackage }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create WhatsApp tour package', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A tour package with this product already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create tour package' }, { status: 500 });
  }
}
