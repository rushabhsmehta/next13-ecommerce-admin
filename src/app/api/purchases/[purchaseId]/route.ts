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
    }    const purchase = await prismadb.purchaseDetail.findUnique({
      where: {
        id: params.purchaseId
      },
      include: {
        supplier: true,
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true
          },
          orderBy: {
            createdAt: 'asc'
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
    }    try {      // Update purchase detail - REMOVED connect syntax
      const updatedPurchase = await prismadb.purchaseDetail.update({
        where: {
          id: params.purchaseId
        },
        data: {
          supplierId,
          purchaseDate: new Date(new Date(purchaseDate).toISOString()),
          billNumber: billNumber || null,
          billDate: billDate ? new Date(new Date(billDate).toISOString()) : null,
          dueDate: dueDate ? new Date(new Date(dueDate).toISOString()) : null,
          stateOfSupply: stateOfSupply || null,
          referenceNumber: referenceNumber || null,
          price: parseFloat(price.toString()),
          gstAmount: gstAmount !== undefined ? parseFloat(gstAmount.toString()) : null,
          gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage.toString()) : null,
          description: description || null,
          status: status || "pending",
        }
      });
      
      // Check if the purchase has items or if we need to create a default item
      const existingItems = await prismadb.purchaseItem.findMany({
        where: { purchaseDetailId: params.purchaseId }
      });

      // Only proceed with item operations if explicitly provided in the request
      if (items !== undefined) {
        console.log("Purchase updated, now handling items");
        
        // Delete existing items only if we're replacing them
        await prismadb.purchaseItem.deleteMany({
          where: { purchaseDetailId: params.purchaseId }
        });        // Create new purchase items if provided
        if (Array.isArray(items) && items.length > 0) {
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            try {
              await prismadb.purchaseItem.create({
                data: {                  purchaseDetailId: params.purchaseId,
                  productName: item.productName || "Item",
                  description: item.description ?? null,
                  quantity: item.quantity != null ? parseFloat(String(item.quantity)) : 1,
                  unitOfMeasureId: item.unitOfMeasureId ?? null,
                  pricePerUnit: item.pricePerUnit != null ? parseFloat(String(item.pricePerUnit)) : 0,
                  taxSlabId: item.taxSlabId ?? null,
                  taxAmount: item.taxAmount != null ? parseFloat(String(item.taxAmount)) : null,
                  totalAmount: item.totalAmount != null ? parseFloat(String(item.totalAmount)) : 0,
                }
              });
            } catch (itemError) {
              console.error(`Error creating purchase item:`, itemError);
            }
          }
        }        // If no items were provided but the purchase has a price, create a default item
        else if (price > 0) {
          // Get tour package query name if available
          let productName = "Purchase";
          if (tourPackageQueryId) {
            const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
              where: { id: tourPackageQueryId },
              select: { tourPackageQueryName: true }
            });
            if (tourPackageQuery?.tourPackageQueryName) {
              productName = tourPackageQuery.tourPackageQueryName;
            }
          }
          
          // Create a single item representing the full purchase amount
          await prismadb.purchaseItem.create({
            data: {              purchaseDetailId: params.purchaseId,
              productName: description || productName,
              description: description || `${productName} dated ${new Date(purchaseDate).toLocaleDateString()}`,
              quantity: 1,
              pricePerUnit: price != null ? parseFloat(String(price)) : 0,
              totalAmount: price != null ? parseFloat(String(price)) : 0,
              taxAmount: gstAmount != null ? parseFloat(String(gstAmount)) : null,
              taxSlabId: null,
              unitOfMeasureId: null
            }
          });
        }
      }      // Return the updated purchase with items
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
            },
            orderBy: {
              createdAt: 'asc'
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
