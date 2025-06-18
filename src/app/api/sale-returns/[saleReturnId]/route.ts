import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { dateToUtc } from '@/lib/timezone-utils';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { saleReturnId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.saleReturnId) {
      return new NextResponse("Sale return ID is required", { status: 400 });
    }

    const saleReturn = await prismadb.saleReturn.findUnique({
      where: {
        id: params.saleReturnId
      },
      include: {
        saleDetail: {
          include: {
            customer: true
          }
        },        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
            saleItem: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!saleReturn) {
      return new NextResponse("Sale return not found", { status: 404 });
    }

    return NextResponse.json(saleReturn);
  } catch (error) {
    console.error('[SALE_RETURN_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { saleReturnId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();
    
    const { 
      returnDate, 
      returnReason,
      amount, 
      gstAmount, 
      reference,
      status,
      items 
    } = body;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.saleReturnId) {
      return new NextResponse("Sale return ID is required", { status: 400 });
    }

    // Update sale return
    const updatedSaleReturn = await prismadb.saleReturn.update({
      where: {
        id: params.saleReturnId
      },      data: {
        returnDate: returnDate ? dateToUtc(returnDate) : undefined,
        returnReason: returnReason || undefined,
        amount: amount !== undefined ? parseFloat(amount.toString()) : undefined,
        gstAmount: gstAmount !== undefined ? parseFloat(gstAmount.toString()) : undefined,
        reference: reference || undefined,
        status: status || undefined,
      }
    });
    
    // Handle items if provided
    if (items !== undefined) {
      // Delete existing items
      await prismadb.saleReturnItem.deleteMany({
        where: {
          saleReturnId: params.saleReturnId
        }
      });

      // Create new items
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await prismadb.saleReturnItem.create({
            data: {
              saleReturnId: params.saleReturnId,
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
    }

    return NextResponse.json(updatedSaleReturn);
  } catch (error) {
    console.error('[SALE_RETURN_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { saleReturnId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.saleReturnId) {
      return new NextResponse("Sale return ID is required", { status: 400 });
    }

    // Delete sale return (cascade will handle related items)
    await prismadb.saleReturn.delete({
      where: {
        id: params.saleReturnId
      }
    });

    return NextResponse.json({ message: "Sale return deleted successfully" });
  } catch (error) {
    console.error('[SALE_RETURN_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
