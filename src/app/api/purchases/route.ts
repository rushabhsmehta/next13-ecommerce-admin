import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
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

    // Validate required fields
    if (!supplierId) {
      return new NextResponse("Supplier is required", { status: 400 });
    }

    if (!purchaseDate) {
      return new NextResponse("Purchase date is required", { status: 400 });
    }

    if (price === undefined || price === null) {
      return new NextResponse("Price is required", { status: 400 });
    }

    // Create purchase detail - REMOVED connect syntax
    const purchaseDetail = await prismadb.purchaseDetail.create({
      data: {
        supplierId,
        tourPackageQueryId: tourPackageQueryId || null,
        purchaseDate: new Date(purchaseDate),
        billNumber: billNumber || null,
        billDate: billDate ? new Date(billDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        stateOfSupply: stateOfSupply || null,
        referenceNumber: referenceNumber || null,
        price: parseFloat(price.toString()),
        gstAmount: gstAmount ? parseFloat(gstAmount.toString()) : null,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage.toString()) : null,
        description: description || null,
        status: status || "pending",
      }
    });

    // Create purchase items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await prismadb.purchaseItem.create({
          data: {
            purchaseDetailId: purchaseDetail.id,
            productName: item.productName,
            description: item.description || null,
            quantity: parseFloat(item.quantity.toString()),
            unitOfMeasureId: item.unitOfMeasureId || null,
            pricePerUnit: parseFloat(item.pricePerUnit.toString()),
            taxSlabId: item.taxSlabId || null,
            taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
            totalAmount: parseFloat(item.totalAmount.toString()),
          }
        });
      }
    }

    return NextResponse.json(purchaseDetail);
  } catch (error) {
    console.error('[PURCHASES_POST]', error);
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
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const supplierId = searchParams.get('supplierId');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (supplierId) {
      query.supplierId = supplierId;
    }

    const purchases = await prismadb.purchaseDetail.findMany({
      where: query,
      include: {
        supplier: true,
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error('[PURCHASES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

