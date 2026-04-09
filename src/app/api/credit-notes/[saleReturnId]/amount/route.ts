import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ saleReturnId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    const { saleReturnId } = await params;
    const body = await req.json();
    const { creditNoteAmount } = body;

    if (creditNoteAmount === undefined || creditNoteAmount === null) {
      return new NextResponse('creditNoteAmount is required', { status: 400 });
    }

    const newAmount = parseFloat(creditNoteAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      return new NextResponse('creditNoteAmount must be a positive number', { status: 400 });
    }

    // Load the credit note
    const creditNote = await prismadb.saleReturn.findUnique({
      where: { id: saleReturnId },
      include: {
        creditReceipts: {
          where: { receiptType: 'credit_note_redemption' },
          select: { amount: true },
        },
        saleDetail: {
          include: {
            receiptAllocations: { select: { allocatedAmount: true } },
          },
        },
      },
    });

    if (!creditNote) return new NextResponse('Credit note not found', { status: 404 });
    if (creditNote.creditType !== 'credit_note')
      return new NextResponse('This sale return has not been issued as a credit note', { status: 400 });

    // Cannot set amount below what has already been redeemed
    const usedAmount = creditNote.creditReceipts.reduce((sum, r) => sum + r.amount, 0);
    if (newAmount < usedAmount - 0.01) {
      return new NextResponse(
        `Cannot set credit note amount below already redeemed amount (₹${usedAmount.toFixed(2)})`,
        { status: 400 }
      );
    }

    // Cannot exceed what was received from the customer on the original sale
    const alreadyAllocated = creditNote.saleDetail.receiptAllocations.reduce(
      (sum, a) => sum + a.allocatedAmount,
      0
    );
    // The received amount = everything allocated excluding cancellation writeoffs (which were system-generated)
    // We use the original sale's total receipt allocations as the upper bound
    if (newAmount > alreadyAllocated + 0.01) {
      return new NextResponse(
        `Credit note amount cannot exceed amount already received (₹${alreadyAllocated.toFixed(2)})`,
        { status: 400 }
      );
    }

    // Determine new status
    let newStatus = creditNote.status;
    if (usedAmount >= newAmount - 0.01) {
      newStatus = 'redeemed';
    } else if (usedAmount > 0.01) {
      newStatus = 'partially_redeemed';
    } else {
      newStatus = 'issued';
    }

    const updated = await prismadb.saleReturn.update({
      where: { id: saleReturnId },
      data: {
        creditNoteAmount: parseFloat(newAmount.toFixed(2)),
        status: newStatus,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[CREDIT_NOTES_AMOUNT_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
