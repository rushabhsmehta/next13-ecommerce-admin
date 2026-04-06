import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const includeExpired = searchParams.get('includeExpired') === 'true';

    const where: any = { supplierCreditType: 'rebooking_credit' };
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (!includeExpired) {
      where.OR = [{ supplierCreditExpiry: null }, { supplierCreditExpiry: { gte: new Date() } }];
    }

    const credits = await prismadb.purchaseReturn.findMany({
      where,
      include: {
        purchaseDetail: {
          include: {
            tourPackageQuery: { select: { id: true, tourPackageQueryNumber: true } },
            supplier: { select: { id: true, name: true } }
          }
        },
        supplier: true,
        creditPayments: {
          where: { paymentType: 'supplier_credit_redemption' },
          select: { amount: true, paymentDate: true, tourPackageQueryId: true }
        }
      },
      orderBy: { returnDate: 'desc' }
    });

    const result = credits.map((sc) => {
      const usedAmount = sc.creditPayments.reduce((sum, p) => sum + p.amount, 0);
      const availableCredit = sc.amount - usedAmount;
      const isExpired = sc.supplierCreditExpiry ? sc.supplierCreditExpiry < new Date() : false;
      const daysUntilExpiry = sc.supplierCreditExpiry
        ? Math.ceil((sc.supplierCreditExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      const supplier = sc.supplier || sc.purchaseDetail?.supplier;

      return {
        id: sc.id,
        supplierName: supplier?.name || 'Unknown',
        supplierId: supplier?.id || null,
        amount: sc.amount,
        availableCredit,
        usedAmount,
        status: sc.status,
        returnDate: sc.returnDate,
        supplierCreditExpiry: sc.supplierCreditExpiry,
        isExpired,
        daysUntilExpiry,
        returnReason: sc.returnReason,
        originalTour: sc.purchaseDetail?.tourPackageQuery?.tourPackageQueryNumber || '-',
        redemptions: sc.creditPayments
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SUPPLIER_CREDITS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
