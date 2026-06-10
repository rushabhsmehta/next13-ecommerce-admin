import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { handleApi, jsonError, noStore } from '@/lib/api-response';
import { applyTransferBalances, validateTransferAccounts } from './transfer-balance';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    const body = await req.json();
    const {
      transferDate,
      amount,
      reference,
      description,
      fromAccountType,
      fromAccountId,
      toAccountType,
      toAccountId
    } = body;

    if (!transferDate) {
      return jsonError("Transfer date is required", 400, 'VALIDATION');
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return jsonError("Valid amount is required", 400, 'VALIDATION');
    }

    if (!fromAccountType || !fromAccountId) {
      return jsonError("Source account is required", 400, 'VALIDATION');
    }

    if (!toAccountType || !toAccountId) {
      return jsonError("Destination account is required", 400, 'VALIDATION');
    }

    if (fromAccountType === toAccountType && fromAccountId === toAccountId) {
      return jsonError("Cannot transfer to the same account", 400, 'VALIDATION');
    }

    const accountError = await validateTransferAccounts(
      { type: fromAccountType, id: fromAccountId },
      { type: toAccountType, id: toAccountId }
    );
    if (accountError) return jsonError(accountError, 400, 'VALIDATION');

    // Create the transfer and move money between accounts atomically.
    const transferDetail = await prismadb.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          transferDate: dateToUtc(transferDate)!,
          amount: parsedAmount,
          reference,
          description,
          fromBankAccountId: fromAccountType === 'bank' ? fromAccountId : undefined,
          fromCashAccountId: fromAccountType === 'cash' ? fromAccountId : undefined,
          toBankAccountId: toAccountType === 'bank' ? toAccountId : undefined,
          toCashAccountId: toAccountType === 'cash' ? toAccountId : undefined,
        }
      });

      await applyTransferBalances(tx, transfer, 1);

      return transfer;
    });

    return noStore(NextResponse.json(transferDetail, { status: 201 }));
  });
}

export async function GET(req: Request) {
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    const transfers = await prismadb.transfer.findMany({
      include: {
        fromBankAccount: true,
        fromCashAccount: true,
        toBankAccount: true,
        toCashAccount: true
      },
      orderBy: {
        transferDate: 'desc'
      }
    });

    return noStore(NextResponse.json(transfers));
  });
}
