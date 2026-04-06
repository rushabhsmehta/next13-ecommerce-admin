import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

// Generate sequential credit note number: CN-YYYY-NNNN
async function generateCreditNoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CN-${year}-`;
  const latest = await prismadb.saleReturn.findFirst({
    where: { creditNoteNumber: { startsWith: prefix } },
    orderBy: { creditNoteNumber: 'desc' },
    select: { creditNoteNumber: true }
  });
  if (!latest?.creditNoteNumber) return `${prefix}0001`;
  const seq = parseInt(latest.creditNoteNumber.slice(prefix.length), 10);
  return `${prefix}${String(seq + 1).padStart(4, '0')}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ saleReturnId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { saleReturnId } = await params;

    // Load sale return with its sale and existing allocations
    const saleReturn = await prismadb.saleReturn.findUnique({
      where: { id: saleReturnId },
      include: {
        saleDetail: {
          include: {
            receiptAllocations: { select: { allocatedAmount: true } }
          }
        },
        creditReceipts: { select: { amount: true } }
      }
    });

    if (!saleReturn) return new NextResponse("Sale return not found", { status: 404 });
    if (saleReturn.creditType === 'credit_note')
      return new NextResponse("Already issued as a credit note", { status: 400 });

    const sale = saleReturn.saleDetail;
    const saleTotal = sale.salePrice + (sale.gstAmount ?? 0);
    const alreadyAllocated = sale.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const remainingBalance = Math.max(0, saleTotal - alreadyAllocated);

    // Get 1-year expiry from body, default to today + 1 year
    let expiryDate: Date;
    try {
      const body = await req.json().catch(() => ({}));
      expiryDate = body.expiryDate ? new Date(body.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } catch {
      expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    }

    const creditNoteNumber = await generateCreditNoteNumber();

    const result = await prismadb.$transaction(async (tx) => {
      // 1. If there's a remaining balance on the sale, create a writeoff receipt to close it
      if (remainingBalance > 0.01) {
        const writeoffReceipt = await tx.receiptDetail.create({
          data: {
            tourPackageQueryId: sale.tourPackageQueryId,
            receiptDate: new Date(),
            amount: remainingBalance,
            receiptType: 'cancellation_writeoff',
            customerId: sale.customerId || null,
            saleReturnId: saleReturnId,
            note: `Cancellation writeoff for credit note ${creditNoteNumber}`,
          }
        });
        await tx.receiptSaleAllocation.create({
          data: {
            receiptDetailId: writeoffReceipt.id,
            saleDetailId: sale.id,
            allocatedAmount: remainingBalance,
            note: `Auto-closed on CN issuance: ${creditNoteNumber}`
          }
        });
      }

      // 2. Update SaleReturn to become a credit note
      return tx.saleReturn.update({
        where: { id: saleReturnId },
        data: {
          creditType: 'credit_note',
          creditNoteNumber,
          expiryDate,
          customerId: sale.customerId || null,
          status: 'issued',
        }
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CREDIT_NOTES_ISSUE_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
