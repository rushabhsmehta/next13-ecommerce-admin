import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';

// GET handler to fetch sale items
export async function GET(req: Request, props: { params: Promise<{ saleId: string }> }) {
  const params = await props.params;
  try {
    if (!params.saleId) {
      return new NextResponse("Sale ID is required", { status: 400 });
    }

    const items = await prismadb.saleItem.findMany({
      where: {
        saleDetailId: params.saleId
      },
      include: {
        unitOfMeasure: true,
        taxSlab: true
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('[SALE_ITEMS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// PATCH handler to update sale items
export async function PATCH(req: Request, props: { params: Promise<{ saleId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    const body = await req.json();
    
    const { 
      items, 
      invoiceNumber,
      invoiceDate,
      dueDate,
      stateOfSupply,
      description
    } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (!params.saleId) {
      return new NextResponse("Sale ID is required", { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new NextResponse("Items are required", { status: 400 });
    }

    // Start a transaction to ensure all updates are atomic
    const result = await prismadb.$transaction(async (tx : any) => {
      // Delete existing items first
      await tx.saleItem.deleteMany({
        where: {
          saleDetailId: params.saleId
        }
      });

      // Calculate totals from items
      const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalGstAmount = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      
      // Determine average GST percentage (if applicable)
      let avgGstPercentage = 0;
      if (totalGstAmount > 0) {
        const totalBeforeTax = totalAmount - totalGstAmount;
        avgGstPercentage = (totalGstAmount / totalBeforeTax) * 100;
      }      // Update the main sale record with totals and any other updates
      await tx.saleDetail.update({
        where: {
          id: params.saleId
        },
        data: {
          salePrice: totalAmount,
          gstAmount: totalGstAmount > 0 ? totalGstAmount : undefined,
          gstPercentage: avgGstPercentage > 0 ? parseFloat(avgGstPercentage.toFixed(2)) : undefined,
          invoiceNumber,
          invoiceDate: invoiceDate ? dateToUtc(invoiceDate) : undefined,
          dueDate: dueDate ? dateToUtc(dueDate) : undefined,
          stateOfSupply,
          description
        }
      });

      // Create new items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await tx.saleItem.create({
          data: {
            saleDetailId: params.saleId,
            productName: item.productName,
            description: item.description,
            quantity: parseFloat(item.quantity),
            unitOfMeasureId: item.unitOfMeasureId || undefined,
            pricePerUnit: parseFloat(item.pricePerUnit),
            discountPercent: item.discountPercent ? parseFloat(item.discountPercent) : undefined,
            discountAmount: item.discountAmount ? parseFloat(item.discountAmount) : undefined,
            taxSlabId: item.taxSlabId || undefined,
            taxAmount: item.taxAmount ? parseFloat(item.taxAmount) : undefined,
            totalAmount: parseFloat(item.totalAmount),
            orderIndex: i, // Preserve the order based on array index
          }
        });
      }

      // Return the updated sale with items
      return await tx.saleDetail.findUnique({
        where: { id: params.saleId },
        include: {          items: {
            include: {
              unitOfMeasure: true,
              taxSlab: true
            },
            orderBy: {
              orderIndex: 'asc'
            }
          }
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SALE_ITEMS_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
