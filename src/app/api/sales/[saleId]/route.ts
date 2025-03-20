import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
    req: Request,
    { params }: { params: { saleId: string } }
) {
    try {
        const { userId } = auth();
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
                customer: true,
                items: {
                    include: {
                        taxSlab: true,
                    }
                }
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

export async function PATCH(
    req: Request,
    { params }: { params: { saleId: string } }
) {
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
            // Delete existing items
            await prismadb.saleItem.deleteMany({
                where: {
                    saleDetailId: params.saleId
                }
            });

            // Update sale detail - REMOVED connect syntax
            const updatedSale = await prismadb.saleDetail.update({
                where: {
                    id: params.saleId
                },
                data: {
                    customerId,
                    saleDate: new Date(saleDate),
                    invoiceNumber: invoiceNumber || null,
                    salePrice: parseFloat(salePrice.toString()),
                    gstAmount: gstAmount !== undefined ? parseFloat(gstAmount.toString()) : null,
                    gstPercentage: gstPercentage !== undefined ? parseFloat(gstPercentage.toString()) : null,
                    description: description || null,
                    status: status || "completed",
                }
            });

            // Create new sale items
            if (items && Array.isArray(items) && items.length > 0) {
                for (const item of items) {
                    await prismadb.saleItem.create({
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
                        }
                    });
                }
            }

            // Return the updated sale with items
            const updatedSaleWithItems = await prismadb.saleDetail.findUnique({
                where: {
                    id: params.saleId
                },
                include: {
                    customer: true,
                    items: {
                        include: {
                            taxSlab: true
                        }
                    }
                }
            });

            return NextResponse.json(updatedSaleWithItems);
        } catch (updateError: any) {
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

export async function DELETE(
    req: Request,
    { params }: { params: { saleId: string } }
) {
    try {
        const { userId } = auth();
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
