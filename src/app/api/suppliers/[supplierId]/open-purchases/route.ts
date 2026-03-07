import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  props: { params: Promise<{ supplierId: string }> }
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

    const purchases = await prismadb.purchaseDetail.findMany({
      where: {
        supplierId: params.supplierId,
        ...(tourPackageQueryId ? { tourPackageQueryId } : {})
      },
      include: {
        paymentAllocations: {
          select: { allocatedAmount: true }
        },
        purchaseReturns: {
          select: { amount: true }
        },
        tourPackageQuery: {
          select: { id: true, tourPackageQueryName: true }
        }
      },
      orderBy: { purchaseDate: 'asc' }
    });

    const openPurchases = purchases.map(purchase => {
      const totalBillAmount = purchase.netPayable ?? ((purchase.price || 0) + (purchase.gstAmount || 0));
      const totalAllocated = purchase.paymentAllocations.reduce(
        (sum, a) => sum + a.allocatedAmount, 0
      );
      const totalReturns = purchase.purchaseReturns.reduce(
        (sum, r) => sum + (r.amount || 0), 0
      );
      const balanceDue = totalBillAmount - totalAllocated - totalReturns;

      return {
        purchaseId: purchase.id,
        billNumber: purchase.billNumber,
        billDate: purchase.billDate,
        purchaseDate: purchase.purchaseDate,
        tourPackageQueryId: purchase.tourPackageQueryId,
        tourPackageQueryName: purchase.tourPackageQuery?.tourPackageQueryName,
        totalBillAmount,
        totalAllocated,
        totalReturns,
        balanceDue,
        isGst: purchase.isGst,
        status: purchase.status
      };
    }).filter(p => includeSettled || p.balanceDue > 0.01);

    const supplier = await prismadb.supplier.findUnique({
      where: { id: params.supplierId },
      select: { id: true, name: true }
    });

    return NextResponse.json({
      supplierId: params.supplierId,
      supplierName: supplier?.name,
      openPurchases
    });
  } catch (error) {
    console.error('[SUPPLIER_OPEN_PURCHASES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
