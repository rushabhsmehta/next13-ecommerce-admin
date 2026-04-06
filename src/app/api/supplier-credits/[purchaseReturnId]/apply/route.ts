import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ purchaseReturnId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { purchaseReturnId } = await params;
    const body = await req.json();
    const { tourPackageQueryId, purchaseDetailId, amount } = body;

    if (!tourPackageQueryId) return new NextResponse("tourPackageQueryId is required", { status: 400 });
    if (!purchaseDetailId) return new NextResponse("purchaseDetailId is required", { status: 400 });
    if (!amount || amount <= 0) return new NextResponse("amount must be positive", { status: 400 });

    // Load the supplier credit (purchase return)
    const supplierCredit = await prismadb.purchaseReturn.findUnique({
      where: { id: purchaseReturnId },
      include: {
        creditPayments: {
          where: { paymentType: 'supplier_credit_redemption' },
          select: { amount: true }
        },
        purchaseDetail: { select: { supplierId: true } }
      }
    });

    if (!supplierCredit) return new NextResponse("Supplier credit not found", { status: 404 });
    if (supplierCredit.supplierCreditType !== 'rebooking_credit')
      return new NextResponse("Not a rebooking credit", { status: 400 });
    if (supplierCredit.status === 'redeemed')
      return new NextResponse("Supplier credit fully redeemed", { status: 400 });
    if (supplierCredit.supplierCreditExpiry && supplierCredit.supplierCreditExpiry < new Date())
      return new NextResponse("Supplier credit has expired", { status: 400 });

    const usedAmount = supplierCredit.creditPayments.reduce((sum, p) => sum + p.amount, 0);
    const availableCredit = supplierCredit.amount - usedAmount;

    if (amount > availableCredit + 0.01)
      return new NextResponse(`Amount exceeds available credit (₹${availableCredit.toFixed(2)})`, { status: 400 });

    // Validate the target purchase
    const targetPurchase = await prismadb.purchaseDetail.findUnique({
      where: { id: purchaseDetailId },
      include: { paymentAllocations: { select: { allocatedAmount: true } } }
    });
    if (!targetPurchase || targetPurchase.tourPackageQueryId !== tourPackageQueryId)
      return new NextResponse("Purchase not found in the given tour query", { status: 400 });

    const purchaseTotal = (targetPurchase.netPayable ?? targetPurchase.price) + (targetPurchase.gstAmount ?? 0);
    const purchaseAlreadyAllocated = targetPurchase.paymentAllocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const purchaseRemaining = purchaseTotal - purchaseAlreadyAllocated;
    if (amount > purchaseRemaining + 0.01)
      return new NextResponse(`Amount exceeds purchase outstanding (₹${purchaseRemaining.toFixed(2)})`, { status: 400 });

    const applyAmount = parseFloat(amount.toFixed(2));
    const newUsed = usedAmount + applyAmount;
    const newStatus = newUsed >= supplierCredit.amount - 0.01 ? 'redeemed' : 'partially_redeemed';

    const result = await prismadb.$transaction(async (tx) => {
      // Create the credit redemption payment on Tour 2 (no bank/cash account — no real cash out)
      const payment = await tx.paymentDetail.create({
        data: {
          tourPackageQueryId,
          paymentDate: new Date(),
          amount: applyAmount,
          paymentType: 'supplier_credit_redemption',
          supplierId: supplierCredit.purchaseDetail.supplierId || null,
          purchaseReturnId: purchaseReturnId,
          note: `Supplier rebooking credit applied`,
        }
      });

      // Allocate it to the target purchase
      await tx.paymentPurchaseAllocation.create({
        data: {
          paymentDetailId: payment.id,
          purchaseDetailId,
          allocatedAmount: applyAmount,
          note: `Applied from supplier credit`
        }
      });

      // Update supplier credit status
      await tx.purchaseReturn.update({
        where: { id: purchaseReturnId },
        data: {
          status: newStatus,
          creditUsedInQueryId: tourPackageQueryId
        }
      });

      return payment;
    });

    return NextResponse.json({
      payment: result,
      appliedAmount: applyAmount,
      remainingCredit: parseFloat((availableCredit - applyAmount).toFixed(2)),
      supplierCreditStatus: newStatus
    });
  } catch (error) {
    console.error('[SUPPLIER_CREDITS_APPLY_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
