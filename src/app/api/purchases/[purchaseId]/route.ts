import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { purchaseId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.purchaseId) {
      return new NextResponse("Purchase ID is required", { status: 400 });
    }

    const purchase = await prismadb.purchaseDetail.findUnique({
      where: {
        id: params.purchaseId
      },
      include: {
        supplier: true,
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true
          }
        }
      }
    });

    if (!purchase) {
      return new NextResponse("Purchase not found", { status: 404 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    console.error('[PURCHASE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { purchaseId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    console.log("Received update data:", JSON.stringify(body));
    
    const { 
      supplierId, 
      tourPackageQueryId, 
      purchaseDate, 
      billNumber, 
      billDate,
      dueDate,
      stateOfSupply,
      referenceNumber,
      price, 
      gstAmount, 
      gstPercentage,
      description, 
      status,
      items 
    } = body;

    if (!params.purchaseId) {
      return new NextResponse(JSON.stringify({ message: "Purchase ID is required" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if purchase exists
    const existingPurchase = await prismadb.purchaseDetail.findUnique({
      where: {
        id: params.purchaseId
      }
    });

    if (!existingPurchase) {
      return new NextResponse(JSON.stringify({ message: "Purchase not found" }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete existing items
    await prismadb.purchaseItem.deleteMany({
      where: {
        purchaseDetailId: params.purchaseId
      }
    });

    try {
      // Update purchase detail - REMOVED connect syntax
      const updatedPurchase = await prismadb.purchaseDetail.update({
        where: {
          id: params.purchaseId
        },
        data: {
          supplierId,
          purchaseDate: new Date(purchaseDate),
          billNumber: billNumber || null,
          billDate: billDate ? new Date(billDate) : null,
          dueDate: dueDate ? new Date(dueDate) : null,
          stateOfSupply: stateOfSupply || null,
          referenceNumber: referenceNumber || null,
          price: parseFloat(price.toString()),
          gstAmount: gstAmount !== undefined ? parseFloat(gstAmount.toString()) : null,
          gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage.toString()) : null,
          description: description || null,
          status: status || "pending",
        }
      });

      console.log("Purchase updated, now creating items");

      // Create new purchase items
      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          try {
            await prismadb.purchaseItem.create({
              data: {
                purchaseDetailId: params.purchaseId,
                productName: item.productName,
                description: item.description ?? null,
                quantity: parseFloat(item.quantity.toString()),
                unitOfMeasureId: item.unitOfMeasureId ?? null,
                pricePerUnit: parseFloat(item.pricePerUnit.toString()),
                taxSlabId: item.taxSlabId ?? null,
                taxAmount: item.taxAmount !== undefined ? parseFloat(item.taxAmount.toString()) : null,
                totalAmount: parseFloat(item.totalAmount.toString()),
              }
            });
          } catch (itemError) {
            console.error(`Error creating purchase item:`, itemError);
          }
        }
      }

      // Return the updated purchase with items
      const updatedPurchaseWithItems = await prismadb.purchaseDetail.findUnique({
        where: {
          id: params.purchaseId
        },
        include: {
          supplier: true,
          items: {
            include: {
              taxSlab: true,
              unitOfMeasure: true
            }
          }
        }
      });

      return NextResponse.json(updatedPurchaseWithItems);
    } catch (updateError: any) {
      console.error("Purchase update error details:", updateError);
      return new NextResponse(JSON.stringify({ 
        message: "Error updating purchase details", 
        error: updateError.message,
        code: updateError.code,
        stack: updateError.stack
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    console.error('[PURCHASE_PATCH]', error);
    return new NextResponse(JSON.stringify({ 
      message: "Internal error", 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { purchaseId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.purchaseId) {
      return new NextResponse("Purchase ID is required", { status: 400 });
    }

    // Delete purchase items first (cascade will handle this, but being explicit)
    await prismadb.purchaseItem.deleteMany({
      where: {
        purchaseDetailId: params.purchaseId
      }
    });

    // Then delete the purchase
    await prismadb.purchaseDetail.delete({
      where: {
        id: params.purchaseId
      }
    });

    return NextResponse.json({ message: "Purchase deleted successfully" });
  } catch (error) {
    console.error('[PURCHASE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
