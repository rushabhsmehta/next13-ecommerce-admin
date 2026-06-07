import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dateToUtc } from '@/lib/timezone-utils';
import prismadb from '@/lib/prismadb';
import { requireFinanceOrAdmin } from '@/lib/authz';
import {
  calculateDiscountedTaxAmounts,
  CouponError,
  markCouponApplied,
  prepareCouponApplication,
} from '@/lib/coupons';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);

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
      items,
      isGst,
      cgstAmount,
      sgstAmount,
      igstAmount,
      gstin,
      hsnCode,
      couponCode,
      couponRedemptionId
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
    }

    const originalSalePrice = parseFloat(salePrice.toString());
    const saleDetail = await prismadb.$transaction(async (tx: any) => {
      const [customer, query] = await Promise.all([
        tx.customer.findUnique({
          where: { id: customerId },
          select: { name: true, contact: true, email: true },
        }),
        tourPackageQueryId
          ? tx.tourPackageQuery.findUnique({
              where: { id: tourPackageQueryId },
              select: {
                inquiryId: true,
                locationId: true,
                selectedTemplateId: true,
                tourCategory: true,
                customerName: true,
                customerNumber: true,
                tourStartsFrom: true,
                numAdults: true,
              },
            })
          : Promise.resolve(null),
      ]);

      const couponApplication = await prepareCouponApplication(tx, {
        couponCode,
        couponRedemptionId,
        bookingAmount: originalSalePrice,
        customerId,
        customerName: customer?.name || query?.customerName || null,
        customerMobile: customer?.contact || query?.customerNumber || null,
        inquiryId: query?.inquiryId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        locationId: query?.locationId || null,
        tourPackageId: query?.selectedTemplateId || null,
        tourCategory: query?.tourCategory || null,
        travelDate: query?.tourStartsFrom || null,
        numAdults: query?.numAdults || null,
        appliedByUserId: userId,
      });

      const finalSalePrice =
        couponApplication?.taxableAmountAfterDiscount ?? originalSalePrice;
      const taxAmounts = couponApplication
        ? calculateDiscountedTaxAmounts({
            originalSalePrice,
            taxableAmountAfterDiscount: finalSalePrice,
            gstPercentage: gstPercentage ? parseFloat(gstPercentage.toString()) : null,
            isGst: isGst !== undefined ? Boolean(isGst) : true,
            preferIgst: Boolean(igstAmount && parseFloat(igstAmount.toString()) > 0),
          })
        : {
            gstAmount: gstAmount ? parseFloat(gstAmount.toString()) : null,
            cgstAmount: cgstAmount ? parseFloat(cgstAmount.toString()) : null,
            sgstAmount: sgstAmount ? parseFloat(sgstAmount.toString()) : null,
            igstAmount: igstAmount ? parseFloat(igstAmount.toString()) : null,
          };

      const created = await tx.saleDetail.create({
        data: {
          customerId,
          tourPackageQueryId: tourPackageQueryId || null,
          saleDate: dateToUtc(saleDate)!,
          invoiceNumber: invoiceNumber || null,
          salePrice: finalSalePrice,
          preDiscountSalePrice: couponApplication?.originalBookingAmount ?? null,
          couponCode: couponApplication?.code ?? null,
          couponDiscountAmount: couponApplication?.discountAmount ?? null,
          couponRedemptionId: couponApplication?.redemptionId ?? null,
          gstAmount: taxAmounts.gstAmount,
          gstPercentage: gstPercentage ? parseFloat(gstPercentage.toString()) : null,
          description: description || null,
          status: status || "completed",
          isGst: isGst !== undefined ? Boolean(isGst) : true,
          cgstAmount: taxAmounts.cgstAmount,
          sgstAmount: taxAmounts.sgstAmount,
          igstAmount: taxAmounts.igstAmount,
          gstin: gstin || null,
          hsnCode: hsnCode || null,
        }
      });

      if (items && Array.isArray(items) && items.length > 0) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await tx.saleItem.create({
            data: {
              saleDetailId: created.id,
              productName: item.productName,
              description: item.description || null,
              quantity: parseFloat(item.quantity.toString()),
              unitOfMeasureId: item.unitOfMeasureId || null,
              pricePerUnit: parseFloat(item.pricePerUnit.toString()),
              taxSlabId: item.taxSlabId || null,
              taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
              totalAmount: parseFloat(item.totalAmount.toString()),
              orderIndex: i,
            }
          });
        }
      }

      if (couponApplication) {
        await markCouponApplied(tx, {
          redemptionId: couponApplication.redemptionId,
          couponCodeId: couponApplication.couponCodeId,
          originalBookingAmount: couponApplication.originalBookingAmount,
          discountAmount: couponApplication.discountAmount,
          taxableAmountAfterDiscount: couponApplication.taxableAmountAfterDiscount,
          gstAfterDiscount: taxAmounts.gstAmount,
          appliedByUserId: userId,
        });
      }

      return created;
    });

    return NextResponse.json(saleDetail);
  } catch (error) {
    if (error instanceof CouponError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status }
      );
    }
    console.error('[SALES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);

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
        receiptAllocations: { select: { allocatedAmount: true } },
        couponRedemption: true,
        items: {
          include: {
            taxSlab: true,
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

    return NextResponse.json(sales);
  } catch (error) {
    console.error('[SALES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

