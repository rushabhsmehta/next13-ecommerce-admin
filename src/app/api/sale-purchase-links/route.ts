import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { z } from 'zod';

const createSchema = z.object({
  saleDetailId: z.string().uuid(),
  purchaseDetailId: z.string().uuid(),
  linkType: z.string().optional().nullable(),
  note: z.string().optional().nullable()
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);

    const body = await req.json();
    const parsed = createSchema.parse(body);

    // Validate sale and purchase exist
    const [sale, purchase] = await Promise.all([
      prismadb.saleDetail.findUnique({ where: { id: parsed.saleDetailId }, select: { id: true } }),
      prismadb.purchaseDetail.findUnique({ where: { id: parsed.purchaseDetailId }, select: { id: true } })
    ]);

    if (!sale) return new NextResponse("Sale not found", { status: 404 });
    if (!purchase) return new NextResponse("Purchase not found", { status: 404 });

    const link = await prismadb.salePurchaseLink.upsert({
      where: {
        saleDetailId_purchaseDetailId: {
          saleDetailId: parsed.saleDetailId,
          purchaseDetailId: parsed.purchaseDetailId
        }
      },
      create: {
        saleDetailId: parsed.saleDetailId,
        purchaseDetailId: parsed.purchaseDetailId,
        linkType: parsed.linkType || null,
        note: parsed.note || null
      },
      update: {
        linkType: parsed.linkType || null,
        note: parsed.note || null
      }
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    console.error('[SALE_PURCHASE_LINKS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);

    const { searchParams } = new URL(req.url);
    const saleDetailId = searchParams.get('saleDetailId');
    const purchaseDetailId = searchParams.get('purchaseDetailId');
    const linkId = searchParams.get('linkId');

    if (linkId) {
      await prismadb.salePurchaseLink.delete({ where: { id: linkId } });
    } else if (saleDetailId && purchaseDetailId) {
      await prismadb.salePurchaseLink.delete({
        where: {
          saleDetailId_purchaseDetailId: { saleDetailId, purchaseDetailId }
        }
      });
    } else {
      return new NextResponse("Provide linkId or both saleDetailId and purchaseDetailId", { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[SALE_PURCHASE_LINKS_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const saleDetailId = searchParams.get('saleDetailId');
    const purchaseDetailId = searchParams.get('purchaseDetailId');

    const links = await prismadb.salePurchaseLink.findMany({
      where: {
        ...(saleDetailId ? { saleDetailId } : {}),
        ...(purchaseDetailId ? { purchaseDetailId } : {})
      },
      include: {
        saleDetail: {
          select: { id: true, invoiceNumber: true, saleDate: true, salePrice: true, gstAmount: true, customer: { select: { name: true } } }
        },
        purchaseDetail: {
          select: { id: true, billNumber: true, purchaseDate: true, price: true, gstAmount: true, netPayable: true, supplier: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('[SALE_PURCHASE_LINKS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
