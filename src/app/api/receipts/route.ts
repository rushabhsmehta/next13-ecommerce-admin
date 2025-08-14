import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { computeBaseAmount, pickApplicableRate, calcTdsAmount, getFinancialYear, getQuarter } from '@/lib/tds';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { jsonError, handleApi, noStore } from '@/lib/api-response';
import { z } from 'zod';

const receiptCreateSchema = z.object({
  customerId: z.string().uuid(),
  receiptType: z.string().min(1),
  paymentDate: z.string().datetime(),
  amount: z.number().positive(),
  method: z.string().max(50).optional(),
  transactionId: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
  bankAccountId: z.string().uuid().optional(),
  cashAccountId: z.string().uuid().optional(),
  images: z.array(z.string().url()).optional(),
  tourPackageQueryId: z.string().uuid().optional(),
  tdsMasterId: z.string().uuid().optional(),
  tdsOverrideRate: z.number().min(0).max(100).optional(),
  tdsType: z.enum(['GST','INCOME_TAX']).optional(),
  linkTdsTransactionId: z.string().uuid().optional()
}).refine(d => d.bankAccountId || d.cashAccountId, { message: 'Either bankAccountId or cashAccountId required', path: ['bankAccountId'] });

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    const parsed = receiptCreateSchema.parse(await req.json());
    const { customerId, receiptType, paymentDate, amount, method, transactionId, note, bankAccountId, cashAccountId, images, tourPackageQueryId, tdsMasterId, tdsOverrideRate, tdsType, linkTdsTransactionId } = parsed;

    const receiptDetail = await (prismadb as any).receiptDetail.create({
      data: ({
        customerId,
        receiptType,
        receiptDate: dateToUtc(paymentDate)!,
        amount,
        method: method || null,
        transactionId: transactionId || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
        tourPackageQueryId: tourPackageQueryId || null,
      } as any)
    });

    if (images?.length) {
      await Promise.all(images.map(url => (prismadb as any).images.create({ data: { url, receiptDetailsId: receiptDetail.id } })));
    }

    const balanceChange = amount;
    if (bankAccountId) {
      const bankAccount = await (prismadb as any).bankAccount.findUnique({ where: { id: bankAccountId } });
      if (bankAccount) await (prismadb as any).bankAccount.update({ where: { id: bankAccountId }, data: { currentBalance: bankAccount.currentBalance + balanceChange } });
    } else if (cashAccountId) {
      const cashAccount = await (prismadb as any).cashAccount.findUnique({ where: { id: cashAccountId } });
      if (cashAccount) await (prismadb as any).cashAccount.update({ where: { id: cashAccountId }, data: { currentBalance: cashAccount.currentBalance + balanceChange } });
    }

    try {
      if (tdsMasterId || tdsType || linkTdsTransactionId) {
        if (linkTdsTransactionId) {
          await (prismadb as any).tDSTransaction.update({ where: { id: linkTdsTransactionId }, data: { receiptDetailId: receiptDetail.id, status: 'certified' } });
        } else {
          const customer: any = await (prismadb as any).customer.findUnique({ where: { id: customerId } });
          const master = tdsMasterId ? await (prismadb as any).tDSMaster.findUnique({ where: { id: tdsMasterId } }) : null;
          const resolvedType = (tdsType as any) || (master?.isGstTds ? 'GST' : 'INCOME_TAX');
          const base = computeBaseAmount(Number(amount), 0, resolvedType);
          const rate = pickApplicableRate({
            tdsType: resolvedType as any,
            overrideRate: tdsOverrideRate,
            supplierHasPan: !!customer?.panNumber,
            supplierLowerRate: null,
            supplierLowerValidFrom: null,
            supplierLowerValidTo: null,
            tdsMaster: master ? { rateWithPan: master.rateWithPan ?? null, rateWithoutPan: master.rateWithoutPan ?? null, rateIndividual: master.rateIndividual ?? null, rateCompany: master.rateCompany ?? null, isIncomeTaxTds: master.isIncomeTaxTds, isGstTds: master.isGstTds } : null,
            onDate: new Date(paymentDate),
          });
          if (rate != null && base > 0) {
            const tdsAmount = calcTdsAmount(base, rate);
            const txn = await (prismadb as any).tDSTransaction.create({ data: ({ tdsType: resolvedType, sectionId: tdsMasterId || null, baseAmount: base, appliedRate: rate, tdsAmount, financialYear: getFinancialYear(new Date(paymentDate)), quarter: getQuarter(new Date(paymentDate)), status: 'pending', pan: customer?.panNumber || null, notes: note || null, customerId: customerId, receiptDetailId: receiptDetail.id } as any) });
            await (prismadb as any).receiptDetail.update({ where: { id: receiptDetail.id }, data: ({ tdsDeductedAmount: tdsAmount, tdsTransactionId: txn.id } as any) });
          }
        }
      }
    } catch (tdsErr) { console.warn('[RECEIPTS_POST][TDS]', tdsErr); }

    return noStore(NextResponse.json(receiptDetail, { status: 201 }));
  });
}

export async function GET(req: Request) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const customerId = searchParams.get('customerId');
    const query: any = {};
    if (tourPackageQueryId) query.tourPackageQueryId = tourPackageQueryId;
    if (customerId) query.customerId = customerId;
    const receipts = await (prismadb as any).receiptDetail.findMany({
      where: query,
      include: { customer: true, bankAccount: true, cashAccount: true, images: true },
      orderBy: { receiptDate: 'desc' }
    });
    return noStore(NextResponse.json(receipts));
  });
}

