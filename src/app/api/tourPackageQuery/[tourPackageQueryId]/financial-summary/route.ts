import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.tourPackageQueryId) {
      return new NextResponse("Query ID is required", { status: 400 });
    }

    // Fetch all sales for this query
    const sales = await prismadb.saleDetail.findMany({
      where: { tourPackageQueryId: params.tourPackageQueryId },
      include: {
        receiptAllocations: { select: { allocatedAmount: true } },
        saleReturns: { select: { amount: true } }
      }
    });

    // Fetch all purchases for this query
    const purchases = await prismadb.purchaseDetail.findMany({
      where: { tourPackageQueryId: params.tourPackageQueryId },
      include: {
        paymentAllocations: { select: { allocatedAmount: true } },
        purchaseReturns: { select: { amount: true } }
      }
    });

    // Fetch all receipts for this query (unallocated advances)
    const receipts = await prismadb.receiptDetail.findMany({
      where: { tourPackageQueryId: params.tourPackageQueryId },
      select: { amount: true, receiptType: true }
    });

    // Fetch all payments for this query
    const payments = await prismadb.paymentDetail.findMany({
      where: { tourPackageQueryId: params.tourPackageQueryId },
      select: { amount: true, paymentType: true }
    });

    // Sales aggregation
    const totalSalesInvoiced = sales.reduce((sum, s) => {
      return sum + (s.salePrice || 0) + (s.gstAmount || 0);
    }, 0);
    const totalSalesReceived = sales.reduce((sum, s) => {
      return sum + s.receiptAllocations.reduce((a, r) => a + r.allocatedAmount, 0);
    }, 0);
    const totalSalesReturns = sales.reduce((sum, s) => {
      return sum + s.saleReturns.reduce((a, r) => a + (r.amount || 0), 0);
    }, 0);
    const customerBalance = totalSalesInvoiced - totalSalesReceived - totalSalesReturns;

    // Purchases aggregation
    const totalPurchasesBilled = purchases.reduce((sum, p) => {
      return sum + (p.netPayable ?? ((p.price || 0) + (p.gstAmount || 0)));
    }, 0);
    const totalPurchasesPaid = purchases.reduce((sum, p) => {
      return sum + p.paymentAllocations.reduce((a, pa) => a + pa.allocatedAmount, 0);
    }, 0);
    const totalPurchasesReturns = purchases.reduce((sum, p) => {
      return sum + p.purchaseReturns.reduce((a, r) => a + (r.amount || 0), 0);
    }, 0);
    const supplierBalance = totalPurchasesBilled - totalPurchasesPaid - totalPurchasesReturns;

    // Gross profit
    const grossProfit = totalSalesInvoiced - totalPurchasesBilled;
    const grossMargin = totalSalesInvoiced > 0 ? (grossProfit / totalSalesInvoiced) * 100 : 0;

    return NextResponse.json({
      queryId: params.tourPackageQueryId,
      sales: {
        count: sales.length,
        invoiced: totalSalesInvoiced,
        received: totalSalesReceived,
        returns: totalSalesReturns,
        balance: customerBalance
      },
      purchases: {
        count: purchases.length,
        billed: totalPurchasesBilled,
        paid: totalPurchasesPaid,
        returns: totalPurchasesReturns,
        balance: supplierBalance
      },
      grossProfit,
      grossMargin: Math.round(grossMargin * 100) / 100,
      receiptsCount: receipts.length,
      paymentsCount: payments.length
    });
  } catch (error) {
    console.error('[FINANCIAL_SUMMARY_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
