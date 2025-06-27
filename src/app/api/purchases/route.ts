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
    }    // Create purchase detail - REMOVED connect syntax
    const purchaseDetail = await prismadb.purchaseDetail.create({
      data: {
        supplierId,
        tourPackageQueryId: tourPackageQueryId || null,
        purchaseDate: dateToUtc(purchaseDate)!,
        billNumber: billNumber || null,
        billDate: dateToUtc(billDate),
        dueDate: dateToUtc(dueDate),
        stateOfSupply: stateOfSupply || null,
        referenceNumber: referenceNumber || null,
        price: parseFloat(price.toString()),
        gstAmount: gstAmount ? parseFloat(gstAmount.toString()) : null,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage.toString()) : null,
        description: description || null,
        status: status || "pending",
      }
    });// Create purchase items
    if (items && Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await prismadb.purchaseItem.create({
          data: {            purchaseDetailId: purchaseDetail.id,
            productName: item.productName || "Item",
            description: item.description || null,
            quantity: item.quantity != null ? parseFloat(String(item.quantity)) : 1,
            unitOfMeasureId: item.unitOfMeasureId || null,
            pricePerUnit: item.pricePerUnit != null ? parseFloat(String(item.pricePerUnit)) : 0,
            taxSlabId: item.taxSlabId || null,
            taxAmount: item.taxAmount != null ? parseFloat(String(item.taxAmount)) : null,
            totalAmount: item.totalAmount != null ? parseFloat(String(item.totalAmount)) : 0,
          }
        });
      }
    }// If no items were provided but price > 0, create a default item
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
      
      // Create a single item representing the total purchase amount
      await prismadb.purchaseItem.create({
        data: {          purchaseDetailId: purchaseDetail.id,
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
        supplier: true,        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true
          },
          orderBy: {
            createdAt: 'asc'
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

