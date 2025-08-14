import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { jsonError, handleApi, noStore } from '@/lib/api-response';
import { z } from 'zod';

const paymentPatchSchema = z.object({
  supplierId: z.string().uuid().optional(),
  tourPackageQueryId: z.string().uuid().optional(),
  paymentDate: z.string().datetime(),
  amount: z.number().positive(),
  method: z.string().max(50).optional(),
  transactionId: z.string().max(100).optional(),
  note: z.string().max(1000).optional(),
  bankAccountId: z.string().uuid().nullable().optional(),
  cashAccountId: z.string().uuid().nullable().optional(),
  images: z.array(z.string().url()).optional()
}).refine(d => d.bankAccountId || d.cashAccountId, { message: 'Either bankAccountId or cashAccountId required', path: ['bankAccountId'] });

export async function GET(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    if (!params.paymentId) return jsonError('paymentId required', 400, 'VALIDATION');
    const payment = await (prismadb as any).paymentDetail.findUnique({
      where: { id: params.paymentId },
      include: { supplier: true, bankAccount: true, cashAccount: true, images: true }
    });
    if (!payment) return jsonError('Not found', 404, 'NOT_FOUND');
    return noStore(NextResponse.json(payment));
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    if (!params.paymentId) return jsonError('paymentId required', 400, 'VALIDATION');
    const parsed = paymentPatchSchema.parse(await req.json());
    const { supplierId, tourPackageQueryId, paymentDate, amount, method, transactionId, note, bankAccountId, cashAccountId, images } = parsed;

    const existingPayment = await (prismadb as any).paymentDetail.findUnique({
      where: { id: params.paymentId },
      include: { bankAccount: true, cashAccount: true }
    });
    if (!existingPayment) return jsonError('Not found', 404, 'NOT_FOUND');

    // revert previous balances
    if (existingPayment.bankAccountId && existingPayment.bankAccount) {
      await (prismadb as any).bankAccount.update({ where: { id: existingPayment.bankAccountId }, data: { currentBalance: existingPayment.bankAccount.currentBalance + existingPayment.amount } });
    } else if (existingPayment.cashAccountId && existingPayment.cashAccount) {
      await (prismadb as any).cashAccount.update({ where: { id: existingPayment.cashAccountId }, data: { currentBalance: existingPayment.cashAccount.currentBalance + existingPayment.amount } });
    }

    if (images) {
      await (prismadb as any).images.deleteMany({ where: { paymentDetailsId: params.paymentId } });
      if (images.length) {
        await Promise.all(images.map(url => (prismadb as any).images.create({ data: { url, paymentDetailsId: params.paymentId } })));
      }
    }

    const updatedPayment = await (prismadb as any).paymentDetail.update({
      where: { id: params.paymentId },
      data: {
        supplierId: supplierId ?? existingPayment.supplierId,
        tourPackageQueryId: tourPackageQueryId ?? existingPayment.tourPackageQueryId,
        paymentDate: dateToUtc(paymentDate)!,
        amount,
        method: method || null,
        transactionId: transactionId || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      },
      include: { supplier: true, bankAccount: true, cashAccount: true, images: true }
    });

    if (bankAccountId) {
      const bankAccount = await (prismadb as any).bankAccount.findUnique({ where: { id: bankAccountId } });
      if (bankAccount) await (prismadb as any).bankAccount.update({ where: { id: bankAccountId }, data: { currentBalance: bankAccount.currentBalance - amount } });
    } else if (cashAccountId) {
      const cashAccount = await (prismadb as any).cashAccount.findUnique({ where: { id: cashAccountId } });
      if (cashAccount) await (prismadb as any).cashAccount.update({ where: { id: cashAccountId }, data: { currentBalance: cashAccount.currentBalance - amount } });
    }

    return noStore(NextResponse.json(updatedPayment));
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  return handleApi(async () => {
    const { userId } = auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);
    if (!params.paymentId) return jsonError('paymentId required', 400, 'VALIDATION');
    const payment = await (prismadb as any).paymentDetail.findUnique({ where: { id: params.paymentId }, include: { bankAccount: true, cashAccount: true } });
    if (!payment) return jsonError('Not found', 404, 'NOT_FOUND');
    if (payment.bankAccountId && payment.bankAccount) {
      await (prismadb as any).bankAccount.update({ where: { id: payment.bankAccountId }, data: { currentBalance: payment.bankAccount.currentBalance + payment.amount } });
    } else if (payment.cashAccountId && payment.cashAccount) {
      await (prismadb as any).cashAccount.update({ where: { id: payment.cashAccountId }, data: { currentBalance: payment.cashAccount.currentBalance + payment.amount } });
    }
    await (prismadb as any).paymentDetail.delete({ where: { id: params.paymentId } });
    return noStore(NextResponse.json({ success: true }));
  });
}
