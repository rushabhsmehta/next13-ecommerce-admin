import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { jsonError, handleApi, noStore } from '@/lib/api-response';
import { z } from 'zod';

const cleanEmptyString = (val: unknown) =>
  val === '' || val === undefined ? undefined : val;

const saleAllocationItemSchema = z.object({
  saleDetailId: z.string().uuid(),
  allocatedAmount: z.number().positive(),
  note: z.preprocess(cleanEmptyString, z.string().nullable().optional())
});

const receiptPatchSchema = z.object({
  customerId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  supplierId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  receiptType: z.string().min(1).optional(),
  tourPackageQueryId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  receiptDate: z.string().datetime(),
  amount: z.number().positive(),
  reference: z.preprocess(cleanEmptyString, z.string().max(100).nullable().optional()),
  transactionId: z.preprocess(cleanEmptyString, z.string().max(100).nullable().optional()),
  note: z.preprocess(cleanEmptyString, z.string().max(1000).nullable().optional()),
  bankAccountId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  cashAccountId: z.preprocess(cleanEmptyString, z.string().uuid().nullable().optional()),
  images: z.array(z.string().url()).optional(),
  saleAllocations: z.array(saleAllocationItemSchema).optional()
}).refine(d => d.bankAccountId || d.cashAccountId, {
  message: 'Either bankAccountId or cashAccountId required',
  path: ['bankAccountId']
}).refine(d => {
  if (!d.saleAllocations?.length) return true;
  const allocTotal = d.saleAllocations.reduce((s, a) => s + a.allocatedAmount, 0);
  return allocTotal <= d.amount + 0.01;
}, {
  message: 'Total allocated amount cannot exceed receipt amount',
  path: ['saleAllocations']
});

export async function GET(req: Request, props: { params: Promise<{ receiptId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    if (!params.receiptId) {
      return jsonError('Receipt ID is required', 400, 'VALIDATION');
    }

    const receipt = await prismadb.receiptDetail.findUnique({
      where: { id: params.receiptId },
      include: {
        customer: true,
        supplier: true,
        bankAccount: true,
        cashAccount: true,
        images: true,
        saleAllocations: {
          select: { saleDetailId: true, allocatedAmount: true, note: true }
        }
      }
    });

    if (!receipt) {
      return jsonError('Receipt not found', 404, 'NOT_FOUND');
    }

    return noStore(NextResponse.json(receipt));
  });
}

export async function PATCH(req: Request, props: { params: Promise<{ receiptId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    if (!params.receiptId) {
      return jsonError('Receipt ID is required', 400, 'VALIDATION');
    }

    const parsed = receiptPatchSchema.parse(await req.json());
    const {
      customerId,
      supplierId,
      receiptType,
      tourPackageQueryId,
      receiptDate,
      amount,
      reference,
      transactionId,
      note,
      bankAccountId,
      cashAccountId,
      images,
      saleAllocations
    } = parsed;

    const existingReceipt = await prismadb.receiptDetail.findUnique({
      where: { id: params.receiptId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!existingReceipt) {
      return jsonError('Receipt not found', 404, 'NOT_FOUND');
    }

    // Revert previous account balance
    if (existingReceipt.bankAccountId && existingReceipt.bankAccount) {
      await prismadb.bankAccount.update({
        where: { id: existingReceipt.bankAccountId },
        data: {
          currentBalance: existingReceipt.bankAccount.currentBalance - existingReceipt.amount
        }
      });
    } else if (existingReceipt.cashAccountId && existingReceipt.cashAccount) {
      await prismadb.cashAccount.update({
        where: { id: existingReceipt.cashAccountId },
        data: {
          currentBalance: existingReceipt.cashAccount.currentBalance - existingReceipt.amount
        }
      });
    }

    const updatedReceipt = await prismadb.receiptDetail.update({
      where: { id: params.receiptId },
      data: {
        customerId: customerId ?? existingReceipt.customerId,
        supplierId: supplierId ?? existingReceipt.supplierId,
        receiptType: receiptType ?? existingReceipt.receiptType,
        tourPackageQueryId: tourPackageQueryId ?? existingReceipt.tourPackageQueryId,
        receiptDate: dateToUtc(receiptDate)!,
        amount,
        reference: transactionId ?? reference ?? null,
        note: note ?? null,
        bankAccountId: bankAccountId ?? null,
        cashAccountId: cashAccountId ?? null,
      },
      include: {
        customer: true,
        supplier: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      }
    });

    // Update new account balance
    if (bankAccountId) {
      const bankAccount = await prismadb.bankAccount.findUnique({
        where: { id: bankAccountId }
      });

      if (bankAccount) {
        await prismadb.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: bankAccount.currentBalance + amount
          }
        });
      }
    } else if (cashAccountId) {
      const cashAccount = await prismadb.cashAccount.findUnique({
        where: { id: cashAccountId }
      });

      if (cashAccount) {
        await prismadb.cashAccount.update({
          where: { id: cashAccountId },
          data: {
            currentBalance: cashAccount.currentBalance + amount
          }
        });
      }
    }

    if (images) {
      await prismadb.images.deleteMany({
        where: { receiptDetailsId: params.receiptId }
      });

      if (images.length > 0) {
        for (const url of images) {
          await prismadb.images.create({
            data: {
              url,
              receiptDetailsId: params.receiptId
            }
          });
        }
      }
    }

    if (saleAllocations !== undefined) {
      await prismadb.receiptSaleAllocation.deleteMany({
        where: { receiptDetailId: params.receiptId }
      });

      if (saleAllocations.length > 0) {
        for (const alloc of saleAllocations) {
          if (Number(alloc.allocatedAmount) > 0) {
            await prismadb.receiptSaleAllocation.create({
              data: {
                receiptDetailId: params.receiptId,
                saleDetailId: alloc.saleDetailId,
                allocatedAmount: Number(alloc.allocatedAmount),
                note: alloc.note || null
              }
            });
          }
        }
      }
    }

    return noStore(NextResponse.json(updatedReceipt));
  });
}

export async function DELETE(req: Request, props: { params: Promise<{ receiptId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError('Unauthenticated', 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    if (!params.receiptId) {
      return jsonError('Receipt ID is required', 400, 'VALIDATION');
    }

    const receipt = await prismadb.receiptDetail.findUnique({
      where: { id: params.receiptId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!receipt) {
      return jsonError('Receipt not found', 404, 'NOT_FOUND');
    }

    if (receipt.bankAccountId && receipt.bankAccount) {
      await prismadb.bankAccount.update({
        where: { id: receipt.bankAccountId },
        data: {
          currentBalance: receipt.bankAccount.currentBalance - receipt.amount
        }
      });
    } else if (receipt.cashAccountId && receipt.cashAccount) {
      await prismadb.cashAccount.update({
        where: { id: receipt.cashAccountId },
        data: {
          currentBalance: receipt.cashAccount.currentBalance - receipt.amount
        }
      });
    }

    await prismadb.receiptDetail.delete({
      where: { id: params.receiptId }
    });

    return noStore(NextResponse.json({ message: 'Receipt deleted successfully' }));
  });
}
