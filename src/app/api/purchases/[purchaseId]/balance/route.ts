import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  props: { params: Promise<{ purchaseId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const purchase = await prismadb.purchaseDetail.findUnique({
      where: { id: params.purchaseId },
      include: {
        paymentAllocations: {
          include: {
            paymentDetail: {
              select: { paymentDate: true, transactionId: true }
            }
          }
        },
        purchaseReturns: {
          select: { amount: true }
        }
      }
    });

    if (!purchase) {
      return new NextResponse("Not found", { status: 404 });
    }

    const totalBillAmount = purchase.netPayable ?? ((purchase.price || 0) + (purchase.gstAmount || 0));
    const totalAllocated = purchase.paymentAllocations.reduce(
      (sum, a) => sum + a.allocatedAmount, 0
    );
    const totalReturns = purchase.purchaseReturns.reduce(
      (sum, r) => sum + (r.amount || 0), 0
    );
    const balanceDue = totalBillAmount - totalAllocated - totalReturns;

    return NextResponse.json({
      purchaseId: purchase.id,
      billNumber: purchase.billNumber,
      purchaseDate: purchase.purchaseDate,
      price: purchase.price,
      gstAmount: purchase.gstAmount,
      netPayable: purchase.netPayable,
      totalBillAmount,
      isGst: purchase.isGst,
      totalAllocated,
      totalReturns,
      balanceDue,
      allocations: purchase.paymentAllocations.map(a => ({
        paymentId: a.paymentDetailId,
        paymentDate: a.paymentDetail.paymentDate,
        allocatedAmount: a.allocatedAmount,
        transactionId: a.paymentDetail.transactionId,
        note: a.note
      }))
    });
  } catch (error) {
    console.error('[PURCHASE_BALANCE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
