import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  props: { params: Promise<{ saleId: string }> }
) {
  const params = await props.params;
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sale = await prismadb.saleDetail.findUnique({
      where: { id: params.saleId },
      include: {
        receiptAllocations: {
          include: {
            receiptDetail: {
              select: { receiptDate: true, reference: true }
            }
          }
        },
        saleReturns: {
          select: { amount: true }
        }
      }
    });

    if (!sale) {
      return new NextResponse("Not found", { status: 404 });
    }

    const totalInvoiceAmount = (sale.salePrice || 0) + (sale.gstAmount || 0);
    const totalAllocated = sale.receiptAllocations.reduce(
      (sum, a) => sum + a.allocatedAmount, 0
    );
    const totalReturns = sale.saleReturns.reduce(
      (sum, r) => sum + (r.amount || 0), 0
    );
    const balanceDue = totalInvoiceAmount - totalAllocated - totalReturns;

    return NextResponse.json({
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      saleDate: sale.saleDate,
      salePrice: sale.salePrice,
      gstAmount: sale.gstAmount,
      totalInvoiceAmount,
      isGst: sale.isGst,
      totalAllocated,
      totalReturns,
      balanceDue,
      allocations: sale.receiptAllocations.map(a => ({
        receiptId: a.receiptDetailId,
        receiptDate: a.receiptDetail.receiptDate,
        allocatedAmount: a.allocatedAmount,
        receiptReference: a.receiptDetail.reference,
        note: a.note
      }))
    });
  } catch (error) {
    console.error('[SALE_BALANCE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
