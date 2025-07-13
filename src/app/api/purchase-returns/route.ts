import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { 
      purchaseDetailId, 
      returnDate, 
      returnReason,
      amount, 
      gstAmount, 
      reference,
      status,
      items 
    } = body;

    // Validation
    if (!purchaseDetailId) {
      return new NextResponse("Purchase ID is required", { status: 400 });
    }

    if (!returnDate) {
      return new NextResponse("Return date is required", { status: 400 });
    }    // Create purchase return record
    const purchaseReturn = await prismadb.purchaseReturn.create({
      data: {
        purchaseDetailId,
        returnDate: dateToUtc(returnDate)!,
        returnReason: returnReason || null,
        amount: parseFloat(amount.toString()),
        gstAmount: gstAmount ? parseFloat(gstAmount.toString()) : null,
        reference: reference || null,
        status: status || "pending",
      }
    });

    // Create purchase return items
    if (items && Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await prismadb.purchaseReturnItem.create({
          data: {
            purchaseReturnId: purchaseReturn.id,
            purchaseItemId: item.purchaseItemId || null,
            productName: item.productName || "Item",
            description: item.description || null,
            quantity: parseFloat(String(item.quantity)),
            unitOfMeasureId: item.unitOfMeasureId || null,
            pricePerUnit: parseFloat(String(item.pricePerUnit)),
            taxSlabId: item.taxSlabId || null,
            taxAmount: item.taxAmount ? parseFloat(String(item.taxAmount)) : null,
            totalAmount: parseFloat(String(item.totalAmount)),
            orderIndex: i, // Preserve the order based on array index
          }
        });
      }
    }

    return NextResponse.json(purchaseReturn);
  } catch (error) {
    console.error('[PURCHASE_RETURNS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const purchaseDetailId = searchParams.get('purchaseDetailId');
    const supplierId = searchParams.get('supplierId');
    
    let query: any = {};
    
    if (purchaseDetailId) {
      query.purchaseDetailId = purchaseDetailId;
    }
    
    if (supplierId) {
      query.purchaseDetail = {
        supplierId
      };
    }

    const purchaseReturns = await prismadb.purchaseReturn.findMany({
      where: query,
      include: {
        purchaseDetail: {
          include: {
            supplier: true
          }
        },        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
            purchaseItem: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        returnDate: 'desc'
      }
    });

    return NextResponse.json(purchaseReturns);
  } catch (error) {
    console.error('[PURCHASE_RETURNS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
