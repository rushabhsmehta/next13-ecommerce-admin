import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { computeBaseAmount, pickApplicableRate, calcTdsAmount, getFinancialYear, getQuarter } from '@/lib/tds';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { jsonError, handleApi, noStore } from '@/lib/api-response';
import { z } from 'zod';

// Helper function to clean empty strings to null for UUID fields
const cleanEmptyString = (val: any) => (val === "" || val === undefined) ? null : val;

const receiptCreateSchema = z.object({
  customerId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  supplierId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  receiptType: z.string().min(1),
  receiptDate: z.string().datetime(),
  amount: z.number().positive(),
  method: z.preprocess(cleanEmptyString, z.string().max(50).nullable().optional()).optional(), // Make method completely optional since frontend doesn't send it
  transactionId: z.preprocess(cleanEmptyString, z.string().max(100).nullable().optional()),
  note: z.preprocess(cleanEmptyString, z.string().max(1000).nullable().optional()),
  bankAccountId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  cashAccountId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  images: z.array(z.string().url()).optional().default([]),
  tourPackageQueryId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  tdsMasterId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  tdsOverrideRate: z.number().min(0).max(100).nullable().optional(),
  tdsType: z.enum(['GST','INCOME_TAX']).nullable().optional(),
  linkTdsTransactionId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional())
}).refine(d => d.bankAccountId || d.cashAccountId, { 
  message: 'Either bankAccountId or cashAccountId required', 
  path: ['bankAccountId'] 
}).refine(d => {
  if (d.receiptType === 'customer_payment' && !d.customerId) return false;
  if (d.receiptType === 'supplier_refund' && !d.supplierId) return false;
  return true;
}, { 
  message: 'Customer ID required for customer payments, Supplier ID required for supplier refunds', 
  path: ['customerId'] 
});

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    
    const requestBody = await req.json();
    console.log('[RECEIPTS_POST] Processing receipt creation request (v2)');
    console.log('[RECEIPTS_POST] Raw request body:', JSON.stringify(requestBody, null, 2));
    
    const parsed = receiptCreateSchema.parse(requestBody);
    console.log('[RECEIPTS_POST] Successfully parsed and validated request data');
    const { customerId, supplierId, receiptType, receiptDate, amount, method, transactionId, note, bankAccountId, cashAccountId, images, tourPackageQueryId, tdsMasterId, tdsOverrideRate, tdsType, linkTdsTransactionId } = parsed;

    // Store method and transactionId info in the note if provided (since DB doesn't have these fields)
    let finalNote = note || null;
    if (method && method.trim && method.trim()) {
      finalNote = finalNote ? `${finalNote}\nPayment Method: ${method}` : `Payment Method: ${method}`;
    }

    const receiptDetail = await (prismadb as any).receiptDetail.create({
      data: ({
        customerId: customerId || null,
        supplierId: supplierId || null,
        receiptType,
        receiptDate: dateToUtc(receiptDate)!,
        amount,
        reference: transactionId || null, // Map transactionId to reference field
        note: finalNote,
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
          const customer: any = customerId ? await (prismadb as any).customer.findUnique({ where: { id: customerId } }) : null;
          const supplier: any = supplierId ? await (prismadb as any).supplier.findUnique({ where: { id: supplierId } }) : null;
          const entityWithPan = customer || supplier;
          const master = tdsMasterId ? await (prismadb as any).tDSMaster.findUnique({ where: { id: tdsMasterId } }) : null;
          const resolvedType = (tdsType as any) || (master?.isGstTds ? 'GST' : 'INCOME_TAX');
          const base = computeBaseAmount(Number(amount), 0, resolvedType);
          const rate = pickApplicableRate({
            tdsType: resolvedType as any,
            overrideRate: tdsOverrideRate,
            supplierHasPan: !!entityWithPan?.panNumber,
            supplierLowerRate: null,
            supplierLowerValidFrom: null,
            supplierLowerValidTo: null,
            tdsMaster: master ? { rateWithPan: master.rateWithPan ?? null, rateWithoutPan: master.rateWithoutPan ?? null, rateIndividual: master.rateIndividual ?? null, rateCompany: master.rateCompany ?? null, isIncomeTaxTds: master.isIncomeTaxTds, isGstTds: master.isGstTds } : null,
            onDate: new Date(receiptDate),
          });
          if (rate != null && base > 0) {
            const tdsAmount = calcTdsAmount(base, rate);
            const txn = await (prismadb as any).tDSTransaction.create({ data: ({ tdsType: resolvedType, sectionId: tdsMasterId || null, baseAmount: base, appliedRate: rate, tdsAmount, financialYear: getFinancialYear(new Date(receiptDate)), quarter: getQuarter(new Date(receiptDate)), status: 'pending', pan: entityWithPan?.panNumber || null, notes: note || null, customerId: customerId || null, supplierId: supplierId || null, receiptDetailId: receiptDetail.id } as any) });
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
    const { userId } = await auth();
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

