import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { dateToUtc } from '@/lib/timezone-utils';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { 
      saleDetailId, 
      returnDate, 
      returnReason,
      amount, 
      gstAmount, 
      reference,
      status,
      items 
    } = body;

    // Validation
    if (!saleDetailId) {
      return new NextResponse("Sale ID is required", { status: 400 });
    }

    if (!returnDate) {
      return new NextResponse("Return date is required", { status: 400 });
    }    // Create sale return record
    const saleReturn = await prismadb.saleReturn.create({
      data: {
        saleDetailId,
        returnDate: dateToUtc(returnDate)!,
        returnReason: returnReason || null,
        amount: parseFloat(amount.toString()),
        gstAmount: gstAmount ? parseFloat(gstAmount.toString()) : null,
        reference: reference || null,
        status: status || "pending",
      }
    });

    // Create sale return items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await prismadb.saleReturnItem.create({
          data: {
            saleReturnId: saleReturn.id,
            saleItemId: item.saleItemId || null,
            productName: item.productName,
            description: item.description || null,
            quantity: parseFloat(String(item.quantity)),
            unitOfMeasureId: item.unitOfMeasureId || null,
            pricePerUnit: parseFloat(String(item.pricePerUnit)),
            taxSlabId: item.taxSlabId || null,
            taxAmount: item.taxAmount ? parseFloat(String(item.taxAmount)) : null,
            totalAmount: parseFloat(String(item.totalAmount)),
          }
        });
      }
    }

    return NextResponse.json(saleReturn);
  } catch (error) {
    console.error('[SALE_RETURNS_POST]', error);
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
    const saleDetailId = searchParams.get('saleDetailId');
    const customerId = searchParams.get('customerId');
    
    let query: any = {};
    
    if (saleDetailId) {
      query.saleDetailId = saleDetailId;
    }
    
    if (customerId) {
      query.saleDetail = {
        customerId
      };
    }

    const saleReturns = await prismadb.saleReturn.findMany({
      where: query,
      include: {
        saleDetail: {
          include: {
            customer: true
          }
        },
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
            saleItem: true
          }
        }
      },
      orderBy: {
        returnDate: 'desc'
      }
    });

    return NextResponse.json(saleReturns);
  } catch (error) {
    console.error('[SALE_RETURNS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
