import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { dateToUtc } from '@/lib/timezone-utils';
import { requireFinanceOrAdmin } from '@/lib/authz';
import { handleApi, jsonError, noStore } from '@/lib/api-response';
import { applyTransferBalances, validateTransferAccounts } from '../transfer-balance';

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: { params: Promise<{ transferId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    if (!params.transferId) {
      return jsonError("Transfer ID is required", 400, 'VALIDATION');
    }

    const transfer = await prismadb.transfer.findUnique({
      where: {
        id: params.transferId,
      },
      include: {
        fromBankAccount: true,
        fromCashAccount: true,
        toBankAccount: true,
        toCashAccount: true
      }
    });

    if (!transfer) return jsonError("Transfer not found", 404, 'NOT_FOUND');

    return noStore(NextResponse.json(transfer));
  });
}

export async function PATCH(req: Request, props: { params: Promise<{ transferId: string }> }) {
  const params = await props.params;
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

    if (!params.transferId) {
      return jsonError("Transfer ID is required", 400, 'VALIDATION');
    }

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

    const existing = await prismadb.transfer.findUnique({
      where: { id: params.transferId }
    });
    if (!existing) return jsonError("Transfer not found", 404, 'NOT_FOUND');

    // Reverse the old transfer's balance effect, rewrite the record, then
    // apply the new effect — all atomically with increment/decrement so
    // concurrent writes can't lose updates.
    const transferDetail = await prismadb.$transaction(async (tx) => {
      await applyTransferBalances(tx, existing, -1);

      const updated = await tx.transfer.update({
        where: { id: params.transferId },
        data: {
          transferDate: dateToUtc(transferDate)!,
          amount: parsedAmount,
          reference,
          description,
          fromBankAccountId: fromAccountType === 'bank' ? fromAccountId : null,
          fromCashAccountId: fromAccountType === 'cash' ? fromAccountId : null,
          toBankAccountId: toAccountType === 'bank' ? toAccountId : null,
          toCashAccountId: toAccountType === 'cash' ? toAccountId : null,
        }
      });

      await applyTransferBalances(tx, updated, 1);

      return updated;
    });

    return noStore(NextResponse.json(transferDetail));
  });
}

export async function DELETE(req: Request, props: { params: Promise<{ transferId: string }> }) {
  const params = await props.params;
  return handleApi(async () => {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthenticated", 403, 'AUTH');
    await requireFinanceOrAdmin(userId);

    if (!params.transferId) {
      return jsonError("Transfer ID is required", 400, 'VALIDATION');
    }

    const existing = await prismadb.transfer.findUnique({
      where: { id: params.transferId }
    });
    if (!existing) return jsonError("Transfer not found", 404, 'NOT_FOUND');

    const transfer = await prismadb.$transaction(async (tx) => {
      await applyTransferBalances(tx, existing, -1);
      return tx.transfer.delete({
        where: { id: params.transferId }
      });
    });

    return noStore(NextResponse.json(transfer));
  });
}
