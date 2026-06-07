import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dateToUtc } from '@/lib/timezone-utils';
import prismadb from '@/lib/prismadb';
import {
    calculateDiscountedTaxAmounts,
    CouponError,
    markCouponApplied,
    prepareCouponApplication,
} from '@/lib/coupons';

export async function GET(req: Request, props: { params: Promise<{ saleId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!params.saleId) {
            return new NextResponse("Sale ID is required", { status: 400 });
        }

        const sale = await prismadb.saleDetail.findUnique({
            where: {
                id: params.saleId
            },
            include: {
                customer: true,                items: {
                    include: {
                        taxSlab: true,
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                couponRedemption: true
            }
        });

        if (!sale) {
            return new NextResponse("Sale not found", { status: 404 });
        }

        return NextResponse.json(sale);
    } catch (error) {
        console.error('[SALE_GET]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}

export async function PATCH(req: Request, props: { params: Promise<{ saleId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();
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

        if (!params.saleId) {
            return new NextResponse(JSON.stringify({ message: "Sale ID is required" }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate required fields
        if (!customerId) {
            return new NextResponse(JSON.stringify({ message: "Customer is required" }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!saleDate) {
            return new NextResponse(JSON.stringify({ message: "Sale date is required" }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if sale exists
        const existingSale = await prismadb.saleDetail.findUnique({
            where: {
                id: params.saleId
            }
        });

        if (!existingSale) {
            return new NextResponse(JSON.stringify({ message: "Sale not found" }), { 
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            const originalSalePrice = parseFloat(salePrice.toString());
            const hasCouponInput = Boolean(couponCode || couponRedemptionId);

            await prismadb.$transaction(async (tx: any) => {
                await tx.saleItem.deleteMany({
                    where: {
                        saleDetailId: params.saleId
                    }
                });

                const [customer, query] = await Promise.all([
                    tx.customer.findUnique({
                        where: { id: customerId },
                        select: { name: true, contact: true },
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

                const couponApplication = hasCouponInput
                    ? await prepareCouponApplication(tx, {
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
                    })
                    : null;

                const finalSalePrice =
                    couponApplication?.taxableAmountAfterDiscount ?? originalSalePrice;
                const taxAmounts = couponApplication
                    ? calculateDiscountedTaxAmounts({
                        originalSalePrice,
                        taxableAmountAfterDiscount: finalSalePrice,
                        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage.toString()) : null,
                        isGst: isGst !== undefined ? Boolean(isGst) : existingSale.isGst,
                        preferIgst: Boolean(igstAmount && parseFloat(igstAmount.toString()) > 0),
                    })
                    : {
                        gstAmount: gstAmount !== undefined ? parseFloat(gstAmount.toString()) : null,
                        cgstAmount: cgstAmount !== undefined ? (cgstAmount ? parseFloat(cgstAmount.toString()) : null) : undefined,
                        sgstAmount: sgstAmount !== undefined ? (sgstAmount ? parseFloat(sgstAmount.toString()) : null) : undefined,
                        igstAmount: igstAmount !== undefined ? (igstAmount ? parseFloat(igstAmount.toString()) : null) : undefined,
                    };

                await tx.saleDetail.update({
                    where: {
                        id: params.saleId
                    },
                    data: {
                        customerId,
                        saleDate: dateToUtc(saleDate)!,
                        invoiceNumber: invoiceNumber || null,
                        salePrice: finalSalePrice,
                        preDiscountSalePrice: couponApplication?.originalBookingAmount ?? existingSale.preDiscountSalePrice ?? null,
                        couponCode: couponApplication?.code ?? existingSale.couponCode ?? null,
                        couponDiscountAmount: couponApplication?.discountAmount ?? existingSale.couponDiscountAmount ?? null,
                        couponRedemptionId: couponApplication?.redemptionId ?? existingSale.couponRedemptionId ?? null,
                        gstAmount: taxAmounts.gstAmount,
                        gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage.toString()) : null,
                        description: description || null,
                        status: status || "completed",
                        isGst: isGst !== undefined ? Boolean(isGst) : undefined,
                        cgstAmount: taxAmounts.cgstAmount,
                        sgstAmount: taxAmounts.sgstAmount,
                        igstAmount: taxAmounts.igstAmount,
                        gstin: gstin !== undefined ? (gstin || null) : undefined,
                        hsnCode: hsnCode !== undefined ? (hsnCode || null) : undefined,
                    }
                });

            // Create new sale items
            if (items && Array.isArray(items) && items.length > 0) {
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                        await tx.saleItem.create({
                        data: {
                            saleDetailId: params.saleId,
                            productName: item.productName,
                            description: item.description || null,
                            quantity: parseFloat(item.quantity.toString()),
                            unitOfMeasureId: item.unitOfMeasureId || null,
                            pricePerUnit: parseFloat(item.pricePerUnit.toString()),
                            taxSlabId: item.taxSlabId || null,
                            taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
                            totalAmount: parseFloat(item.totalAmount.toString()),
                            orderIndex: i, // Preserve the order based on array index
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
            });

            // Return the updated sale with items
            const updatedSaleWithItems = await prismadb.saleDetail.findUnique({
                where: {
                    id: params.saleId
                },
                include: {
                    customer: true,
                    couponRedemption: true,
                    items: {
                        include: {
                            taxSlab: true
                        },
                        orderBy: {
                            orderIndex: 'asc'
                        }
                    }
                }
            });

            return NextResponse.json(updatedSaleWithItems);
        } catch (updateError: any) {
            if (updateError instanceof CouponError) {
                return NextResponse.json(
                    { message: updateError.message, code: updateError.code, details: updateError.details },
                    { status: updateError.status }
                );
            }
            console.error("Sale update error details:", updateError);
            return new NextResponse(JSON.stringify({ 
                message: "Error updating sale details", 
                error: updateError.message,
                code: updateError.code
            }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error: any) {
        console.error('[SALE_PATCH]', error);
        return new NextResponse(JSON.stringify({ 
            message: "Internal error", 
            error: error instanceof Error ? error.message : "Unknown error" 
        }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ saleId: string }> }) {
    const params = await props.params;
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!params.saleId) {
            return new NextResponse("Sale ID is required", { status: 400 });
        }

        // Check if sale exists
        const sale = await prismadb.saleDetail.findUnique({
            where: {
                id: params.saleId
            }
        });

        if (!sale) {
            return new NextResponse("Sale not found", { status: 404 });
        }

        // Delete sale items first (they will be deleted automatically due to cascade, but let's be explicit)
        await prismadb.saleItem.deleteMany({
            where: {
                saleDetailId: params.saleId
            }
        });

        // Then delete the sale
        await prismadb.saleDetail.delete({
            where: {
                id: params.saleId
            }
        });

        return NextResponse.json({ message: "Sale deleted successfully" });
    } catch (error) {
        console.error('[SALE_DELETE]', error);
        return new NextResponse("Internal error", { status: 500 });
    }
}
