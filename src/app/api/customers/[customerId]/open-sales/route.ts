import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  props: { params: Promise<{ customerId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const includeSettled = searchParams.get('includeSettled') === 'true';
    const excludeReceiptId = searchParams.get('excludeReceiptId');

    const sales = await prismadb.saleDetail.findMany({
      where: {
        customerId: params.customerId,
        ...(tourPackageQueryId ? { tourPackageQueryId } : {})
      },
      include: {
        receiptAllocations: {
          where: excludeReceiptId ? { receiptDetailId: { not: excludeReceiptId } } : undefined,
          select: { allocatedAmount: true }
        },
        saleReturns: {
          select: { amount: true }
        },
        tourPackageQuery: {
          select: { id: true, tourPackageQueryName: true }
        }
      },
      orderBy: { saleDate: 'asc' }
    });

    const openSales = sales.map(sale => {
      const totalInvoiceAmount = (sale.salePrice || 0) + (sale.gstAmount || 0);
      const totalAllocated = sale.receiptAllocations.reduce(
        (sum, a) => sum + a.allocatedAmount, 0
      );
      const totalReturns = sale.saleReturns.reduce(
        (sum, r) => sum + (r.amount || 0), 0
      );
      const balanceDue = totalInvoiceAmount - totalAllocated - totalReturns;

      return {
        saleId: sale.id,
        invoiceNumber: sale.invoiceNumber,
        invoiceDate: sale.invoiceDate,
        saleDate: sale.saleDate,
        tourPackageQueryId: sale.tourPackageQueryId,
        tourPackageQueryName: sale.tourPackageQuery?.tourPackageQueryName,
        totalInvoiceAmount,
        totalAllocated,
        totalReturns,
        balanceDue,
        isGst: sale.isGst,
        status: sale.status
      };
    }).filter(s => includeSettled || excludeReceiptId || s.balanceDue > 0.01);

    const customer = await prismadb.customer.findUnique({
      where: { id: params.customerId },
      select: { id: true, name: true }
    });

    return NextResponse.json({
      customerId: params.customerId,
      customerName: customer?.name,
      openSales
    });
  } catch (error) {
    console.error('[CUSTOMER_OPEN_SALES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
