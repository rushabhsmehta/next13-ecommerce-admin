import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
  { params }: { params: { saleReturnId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { saleReturnId } = params;
    const body = await req.json();
    const { tourPackageQueryId, saleDetailId, amount } = body;

    if (!tourPackageQueryId) return new NextResponse("tourPackageQueryId is required", { status: 400 });
    if (!saleDetailId) return new NextResponse("saleDetailId is required", { status: 400 });
    if (!amount || amount <= 0) return new NextResponse("amount must be positive", { status: 400 });

    // Load the credit note
    const creditNote = await prismadb.saleReturn.findUnique({
      where: { id: saleReturnId },
      include: {
        creditReceipts: {
          where: { receiptType: 'credit_note_redemption' },
          select: { amount: true }
        }
      }
    });

    if (!creditNote) return new NextResponse("Credit note not found", { status: 404 });
    if (creditNote.creditType !== 'credit_note') return new NextResponse("Not a credit note", { status: 400 });
    if (creditNote.status === 'redeemed') return new NextResponse("Credit note fully redeemed", { status: 400 });
    if (creditNote.expiryDate && creditNote.expiryDate < new Date())
      return new NextResponse("Credit note has expired", { status: 400 });

    const usedAmount = creditNote.creditReceipts.reduce((sum, r) => sum + r.amount, 0);
    const cnAmount = creditNote.creditNoteAmount ?? creditNote.amount;
    const availableCredit = cnAmount - usedAmount;

    if (amount > availableCredit + 0.01)
      return new NextResponse(`Amount exceeds available credit (₹${availableCredit.toFixed(2)})`, { status: 400 });

    // Validate the target sale
    const targetSale = await prismadb.saleDetail.findUnique({
      where: { id: saleDetailId },
      include: { receiptAllocations: { select: { allocatedAmount: true } } }
    });
    if (!targetSale || targetSale.tourPackageQueryId !== tourPackageQueryId)
      return new NextResponse("Sale not found in the given tour query", { status: 400 });

    const saleTotalAmount = targetSale.salePrice + (targetSale.gstAmount ?? 0);
    const saleAlreadyAllocated = targetSale.receiptAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const saleRemaining = saleTotalAmount - saleAlreadyAllocated;
    if (amount > saleRemaining + 0.01)
      return new NextResponse(`Amount exceeds sale outstanding (₹${saleRemaining.toFixed(2)})`, { status: 400 });

    const applyAmount = parseFloat(amount.toFixed(2));
    const newUsed = usedAmount + applyAmount;
    const newStatus = newUsed >= cnAmount - 0.01 ? 'redeemed' : 'partially_redeemed';

    const result = await prismadb.$transaction(async (tx) => {
      // Create the redemption receipt on Tour 2 (no bank/cash account — no real cash)
      const receipt = await (tx as any).receiptDetail.create({
        data: {
          tourPackageQueryId,
          receiptDate: new Date(),
          amount: applyAmount,
          receiptType: 'credit_note_redemption',
          customerId: creditNote.customerId || null,
          saleReturnId: saleReturnId,
          note: `Credit note ${creditNote.creditNoteNumber} applied`,
        }
      });

      // Allocate it to the target sale
      await (tx as any).receiptSaleAllocation.create({
        data: {
          receiptDetailId: receipt.id,
          saleDetailId,
          allocatedAmount: applyAmount,
          note: `Applied from CN ${creditNote.creditNoteNumber}`
        }
      });

      // Update credit note status
      await (tx as any).saleReturn.update({
        where: { id: saleReturnId },
        data: { status: newStatus }
      });

      return receipt;
    });

    return NextResponse.json({
      receipt: result,
      appliedAmount: applyAmount,
      remainingCredit: parseFloat((availableCredit - applyAmount).toFixed(2)),
      creditNoteStatus: newStatus
    });
  } catch (error) {
    console.error('[CREDIT_NOTES_APPLY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
