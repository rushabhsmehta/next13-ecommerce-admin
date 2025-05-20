import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { purchaseReturnId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.purchaseReturnId) {
      return new NextResponse("Purchase return ID is required", { status: 400 });
    }

    const purchaseReturn = await prismadb.purchaseReturn.findUnique({
      where: {
        id: params.purchaseReturnId
      },
      include: {
        purchaseDetail: {
          include: {
            supplier: true
          }
        },
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true,
            purchaseItem: true
          }
        }
      }
    });

    if (!purchaseReturn) {
      return new NextResponse("Purchase return not found", { status: 404 });
    }

    return NextResponse.json(purchaseReturn);
  } catch (error) {
    console.error('[PURCHASE_RETURN_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { purchaseReturnId: string } }
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

    if (!params.purchaseReturnId) {
      return new NextResponse("Purchase return ID is required", { status: 400 });
    }

    // Update purchase return
    const updatedPurchaseReturn = await prismadb.purchaseReturn.update({
      where: {
        id: params.purchaseReturnId
      },
      data: {
        returnDate: returnDate ? new Date(returnDate) : undefined,
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
      await prismadb.purchaseReturnItem.deleteMany({
        where: {
          purchaseReturnId: params.purchaseReturnId
        }
      });

      // Create new items
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          await prismadb.purchaseReturnItem.create({
            data: {
              purchaseReturnId: params.purchaseReturnId,
              purchaseItemId: item.purchaseItemId || null,
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

    return NextResponse.json(updatedPurchaseReturn);
  } catch (error) {
    console.error('[PURCHASE_RETURN_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { purchaseReturnId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.purchaseReturnId) {
      return new NextResponse("Purchase return ID is required", { status: 400 });
    }

    // Delete purchase return (cascade will handle related items)
    await prismadb.purchaseReturn.delete({
      where: {
        id: params.purchaseReturnId
      }
    });

    return NextResponse.json({ message: "Purchase return deleted successfully" });
  } catch (error) {
    console.error('[PURCHASE_RETURN_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
