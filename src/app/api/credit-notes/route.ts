import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status'); // "issued" | "partially_redeemed" | "redeemed"
    const includeExpired = searchParams.get('includeExpired') === 'true';

    const where: any = { creditType: 'credit_note' };
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (!includeExpired) {
      where.OR = [{ expiryDate: null }, { expiryDate: { gte: new Date() } }];
    }

    const creditNotes = await prismadb.saleReturn.findMany({
      where,
      include: {
        saleDetail: {
          include: {
            tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } }
          }
        },
        customer: true,
        creditReceipts: {
          where: { receiptType: 'credit_note_redemption' },
          select: { amount: true, receiptDate: true, tourPackageQueryId: true }
        }
      },
      orderBy: { returnDate: 'desc' }
    });

    const result = creditNotes.map((cn) => {
      const usedAmount = cn.creditReceipts.reduce((sum, r) => sum + r.amount, 0);
      const cnAmount = cn.creditNoteAmount ?? cn.amount;
      const availableCredit = cnAmount - usedAmount;
      const isExpired = cn.expiryDate ? cn.expiryDate < new Date() : false;
      const daysUntilExpiry = cn.expiryDate
        ? Math.ceil((cn.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: cn.id,
        creditNoteNumber: cn.creditNoteNumber,
        amount: cnAmount,
        gstAmount: cn.gstAmount,
        availableCredit,
        usedAmount,
        status: cn.status,
        returnDate: cn.returnDate,
        expiryDate: cn.expiryDate,
        isExpired,
        daysUntilExpiry,
        returnReason: cn.returnReason,
        customer: cn.customer,
        originalTour: cn.saleDetail.tourPackageQuery,
        redemptions: cn.creditReceipts
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CREDIT_NOTES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
