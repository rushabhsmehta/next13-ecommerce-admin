import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { computeBaseAmount, getFinancialYear, getQuarter, pickApplicableRate, calcTdsAmount } from '@/lib/tds';
import { requireFinanceOrAdmin } from '@/lib/authz';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);

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
      items,
      // TDS optional inputs
      tdsMasterId,
      tdsOverrideRate,
      tdsType // 'INCOME_TAX' | 'GST'
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
    const purchaseDetail = await (prismadb as any).purchaseDetail.create({
      data: ({
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
        // TDS placeholders if provided
        tdsMasterId: tdsMasterId || null,
      } as any)
    });

    // Create purchase items
    if (items && Array.isArray(items) && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await (prismadb as any).purchaseItem.create({
          data: {
            purchaseDetailId: purchaseDetail.id,
            productName: item.productName || "Item",
            description: item.description || null,
            quantity: item.quantity != null ? parseFloat(String(item.quantity)) : 1,
            unitOfMeasureId: item.unitOfMeasureId || null,
            pricePerUnit: item.pricePerUnit != null ? parseFloat(String(item.pricePerUnit)) : 0,
            taxSlabId: item.taxSlabId || null,
            taxAmount: item.taxAmount != null ? parseFloat(String(item.taxAmount)) : null,
            totalAmount: item.totalAmount != null ? parseFloat(String(item.totalAmount)) : 0,
            orderIndex: i, // Preserve the order based on array index
          }
        });
      }
    } else if (price > 0) {
      // Default single item
      let productName = "Purchase";
      if (tourPackageQueryId) {
        const tourPackageQuery = await (prismadb as any).tourPackageQuery.findUnique({
          where: { id: tourPackageQueryId },
          select: { tourPackageQueryName: true }
        });
        if (tourPackageQuery?.tourPackageQueryName) {
          productName = tourPackageQuery.tourPackageQueryName;
        }
      }
      await (prismadb as any).purchaseItem.create({
        data: {
          purchaseDetailId: purchaseDetail.id,
          productName: description || productName,
          description: description || `${productName} dated ${new Date(purchaseDate).toLocaleDateString()}`,
          quantity: 1,
          pricePerUnit: price != null ? parseFloat(String(price)) : 0,
          totalAmount: price != null ? parseFloat(String(price)) : 0,
          taxAmount: gstAmount != null ? parseFloat(String(gstAmount)) : null,
          taxSlabId: null,
          unitOfMeasureId: null,
          orderIndex: 0,
        }
      });
    }

    // Optional: create a TDS transaction if TDS inputs provided
    try {
      if (tdsMasterId || tdsType) {
        const supplier: any = await (prismadb as any).supplier.findUnique({ where: { id: supplierId } });
        const master = tdsMasterId ? await (prismadb as any).tDSMaster?.findUnique?.({ where: { id: tdsMasterId } }) : null;

        const resolvedType = (tdsType as any) || (master?.isGstTds ? 'GST' : 'INCOME_TAX');
        const base = computeBaseAmount(Number(price), Number(gstAmount), resolvedType);
        const rate = pickApplicableRate({
          tdsType: resolvedType as any,
          overrideRate: tdsOverrideRate,
          supplierHasPan: !!supplier?.panNumber,
          supplierLowerRate: supplier?.lowerTdsRate ?? null,
          supplierLowerValidFrom: supplier?.lowerValidFrom ?? null,
          supplierLowerValidTo: supplier?.lowerValidTo ?? null,
          tdsMaster: master ? {
            rateWithPan: master.rateWithPan ?? null,
            rateWithoutPan: master.rateWithoutPan ?? null,
            rateIndividual: master.rateIndividual ?? null,
            rateCompany: master.rateCompany ?? null,
            isIncomeTaxTds: master.isIncomeTaxTds,
            isGstTds: master.isGstTds,
          } : null,
          onDate: new Date(purchaseDate),
        });

        if (rate != null && base > 0) {
          const tdsAmount = calcTdsAmount(base, rate);
          await (prismadb as any).tDSTransaction?.create?.({
            data: {
              tdsType: resolvedType,
              sectionId: tdsMasterId || null,
              baseAmount: base,
              appliedRate: rate,
              tdsAmount,
              financialYear: getFinancialYear(new Date(purchaseDate)),
              quarter: getQuarter(new Date(purchaseDate)),
              status: 'pending',
              pan: supplier?.panNumber || null,
              notes: description || null,
              supplierId: supplierId,
              purchaseDetailId: purchaseDetail.id,
            }
          });

          // Update purchase with computed TDS summary
          await (prismadb as any).purchaseDetail.update({
            where: { id: purchaseDetail.id },
            data: ({
              tdsAmount,
              netPayable: Number(((price || 0) + (gstAmount || 0) - tdsAmount).toFixed(2)),
            } as any)
          });
        }
      }
    } catch (tdsError) {
      console.warn('[PURCHASES_POST][TDS]', tdsError);
      // Non-blocking: do not fail main purchase creation
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
    await requireFinanceOrAdmin(userId);

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

    const purchases = await (prismadb as any).purchaseDetail.findMany({
      where: query,
      include: {
        supplier: true,
        items: {
          include: {
            taxSlab: true,
            unitOfMeasure: true
          },
          orderBy: {
            orderIndex: 'asc'
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

