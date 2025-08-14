import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { computeBaseAmount, pickApplicableRate, calcTdsAmount, getFinancialYear, getQuarter } from '@/lib/tds';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { jsonError, handleApi, noStore } from '@/lib/api-response';
import { z } from 'zod';

// Zod schemas
const paymentCreateSchema = z.object({
  supplierId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  paymentType: z.enum(['supplier_payment','customer_refund']),
  saleReturnId: z.string().uuid().optional(),
  tourPackageQueryId: z.string().uuid().optional(),
  paymentDate: z.string().datetime(),
  amount: z.number().positive(),
  method: z.string().max(50).optional(),
  transactionId: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  images: z.array(z.string().url()).optional(),
  tdsMasterId: z.string().uuid().optional(),
  tdsOverrideRate: z.number().min(0).max(100).optional(),
  tdsType: z.enum(['GST','INCOME_TAX']).optional(),
  linkTdsTransactionId: z.string().uuid().optional()
}).refine(d => d.bankAccountId || d.cashAccountId, { message: 'Either bankAccountId or cashAccountId required', path: ['bankAccountId'] })
  .refine(d => !(d.paymentType === 'supplier_payment' && !d.supplierId), { message: 'supplierId required for supplier_payment', path: ['supplierId'] })
  .refine(d => !(d.paymentType === 'customer_refund' && !d.customerId), { message: 'customerId required for customer_refund', path: ['customerId'] });

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    const parsed = paymentCreateSchema.parse(await req.json());
    const { paymentType, supplierId, customerId, saleReturnId, tourPackageQueryId, paymentDate, amount, method, transactionId, note, bankAccountId, cashAccountId, images, tdsMasterId, tdsOverrideRate, tdsType, linkTdsTransactionId } = parsed;

    const paymentDetail = await (prismadb as any).paymentDetail.create({
      data: {
        supplierId: paymentType === 'supplier_payment' ? supplierId : null,
        customerId: paymentType === 'customer_refund' ? customerId : null,
        paymentType,
        saleReturnId: saleReturnId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        paymentDate: dateToUtc(paymentDate)!,
        amount,
        method: method || null,
        transactionId: transactionId || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      } as any
    });

    if (images?.length) {
      await Promise.all(images.map(url => (prismadb as any).images.create({ data: { url, paymentDetailsId: paymentDetail.id } })));
    }

    const balanceChange = amount;
    if (bankAccountId) {
      const bankAccount = await (prismadb as any).bankAccount.findUnique({ where: { id: bankAccountId } });
      if (bankAccount) await (prismadb as any).bankAccount.update({ where: { id: bankAccountId }, data: { currentBalance: bankAccount.currentBalance - balanceChange } });
    } else if (cashAccountId) {
      const cashAccount = await (prismadb as any).cashAccount.findUnique({ where: { id: cashAccountId } });
      if (cashAccount) await (prismadb as any).cashAccount.update({ where: { id: cashAccountId }, data: { currentBalance: cashAccount.currentBalance - balanceChange } });
    }

    // TDS logic (best-effort)
    try {
      if (paymentType === 'supplier_payment') {
        if (linkTdsTransactionId) {
          await (prismadb as any).tDSTransaction.update({ where: { id: linkTdsTransactionId }, data: { paymentDetailId: paymentDetail.id, status: 'certified' } });
        } else if (tdsMasterId || tdsType) {
          const supplier: any = await (prismadb as any).supplier.findUnique({ where: { id: supplierId } });
            const master = tdsMasterId ? await (prismadb as any).tDSMaster.findUnique({ where: { id: tdsMasterId } }) : null;
            const resolvedType = (tdsType as any) || (master?.isGstTds ? 'GST' : 'INCOME_TAX');
            const base = computeBaseAmount(Number(amount), 0, resolvedType);
            const rate = pickApplicableRate({
              tdsType: resolvedType as any,
              overrideRate: tdsOverrideRate,
              supplierHasPan: !!supplier?.panNumber,
              supplierLowerRate: supplier?.lowerTdsRate ?? null,
              supplierLowerValidFrom: supplier?.lowerValidFrom ?? null,
              supplierLowerValidTo: supplier?.lowerValidTo ?? null,
              tdsMaster: master ? { rateWithPan: master.rateWithPan ?? null, rateWithoutPan: master.rateWithoutPan ?? null, rateIndividual: master.rateIndividual ?? null, rateCompany: master.rateCompany ?? null, isIncomeTaxTds: master.isIncomeTaxTds, isGstTds: master.isGstTds } : null,
              onDate: new Date(paymentDate),
            });
            if (rate != null && base > 0) {
              const tdsAmount = calcTdsAmount(base, rate);
              const txn = await (prismadb as any).tDSTransaction.create({ data: ({ tdsType: resolvedType, sectionId: tdsMasterId || null, baseAmount: base, appliedRate: rate, tdsAmount, financialYear: getFinancialYear(new Date(paymentDate)), quarter: getQuarter(new Date(paymentDate)), status: 'pending', pan: supplier?.panNumber || null, notes: note || null, supplierId: supplierId, paymentDetailId: paymentDetail.id } as any) });
              await (prismadb as any).paymentDetail.update({ where: { id: paymentDetail.id }, data: ({ tdsDeductedAmount: tdsAmount, tdsTransactionId: txn.id } as any) });
            }
        }
      }
    } catch (tdsErr) { console.warn('[PAYMENTS_POST][TDS]', tdsErr); }

    return noStore(NextResponse.json(paymentDetail, { status: 201 }));
  });
}

export async function GET(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId); // restrict list to finance/admin for now
    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const supplierId = searchParams.get('supplierId');
    const query: any = {};
    if (tourPackageQueryId) query.tourPackageQueryId = tourPackageQueryId;
    if (supplierId) query.supplierId = supplierId;
    const payments = await (prismadb as any).paymentDetail.findMany({
      where: query,
      include: { supplier: true, bankAccount: true, cashAccount: true, images: true },
      orderBy: { paymentDate: 'desc' }
    });
    return noStore(NextResponse.json(payments));
  });
}

