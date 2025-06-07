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
      customerId, 
      tourPackageQueryId, 
      saleDate, 
      invoiceNumber, 
      referenceNumber,
      salePrice, 
      gstAmount, 
      gstPercentage,
      description, 
      status,
      totalWithTax,
      items 
    } = body;

    // Validate required fields
    if (!customerId) {
      return new NextResponse("Customer is required", { status: 400 });
    }

    if (!saleDate) {
      return new NextResponse("Sale date is required", { status: 400 });
    }

    if (salePrice === undefined || salePrice === null) {
      return new NextResponse("Sale price is required", { status: 400 });
    }    // Create sale detail
    const saleDetail = await prismadb.saleDetail.create({
      data: {
        customerId,
        tourPackageQueryId: tourPackageQueryId || null,
        saleDate: new Date(new Date(saleDate).toISOString()),
        invoiceNumber: invoiceNumber || null,
        salePrice: parseFloat(salePrice.toString()),
        gstAmount: gstAmount ? parseFloat(gstAmount.toString()) : null,
        gstPercentage: gstPercentage ? parseFloat(gstPercentage.toString()) : null,
        description: description || null,
        status: status || "completed",
      }
    });

    // Create sale items
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        await prismadb.saleItem.create({
          data: {
            saleDetailId: saleDetail.id,
            productName: item.productName,
            description: item.description || null,
            quantity: parseFloat(item.quantity.toString()),
            unitOfMeasureId: item.unitOfMeasureId || null, // Add unitOfMeasureId
            pricePerUnit: parseFloat(item.pricePerUnit.toString()),
            taxSlabId: item.taxSlabId || null,
            taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
            totalAmount: parseFloat(item.totalAmount.toString()),
          }
        });
      }
    }

    return NextResponse.json(saleDetail);
  } catch (error) {
    console.error('[SALES_POST]', error);
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
    const customerId = searchParams.get('customerId');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (customerId) {
      query.customerId = customerId;
    }

    const sales = await prismadb.saleDetail.findMany({
      where: query,
      include: {
        customer: true,
        items: {
          include: {
            taxSlab: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error('[SALES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

