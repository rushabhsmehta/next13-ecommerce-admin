import prismadb from "@/lib/prismadb";
import type { Prisma, Transfer } from "@prisma/client";

type Tx = Prisma.TransactionClient;

type TransferAccountRef = { type: 'bank' | 'cash'; id: string };

/**
 * Confirms both legs of a transfer point at real, active accounts.
 * Returns an error message, or null when valid.
 */
export async function validateTransferAccounts(
  from: TransferAccountRef,
  to: TransferAccountRef
): Promise<string | null> {
  const lookup = async (ref: TransferAccountRef) =>
    ref.type === 'bank'
      ? prismadb.bankAccount.findUnique({ where: { id: ref.id }, select: { id: true } })
      : prismadb.cashAccount.findUnique({ where: { id: ref.id }, select: { id: true } });

  const [fromAccount, toAccount] = await Promise.all([lookup(from), lookup(to)]);
  if (!fromAccount) return `Source ${from.type} account not found`;
  if (!toAccount) return `Destination ${to.type} account not found`;
  return null;
}

/**
 * Applies (direction = 1) or reverses (direction = -1) a transfer's effect on
 * the linked account balances using atomic increments, so concurrent writes
 * never lose updates. Must be called inside a prismadb.$transaction.
 */
export async function applyTransferBalances(
  tx: Tx,
  transfer: Pick<Transfer, 'amount' | 'fromBankAccountId' | 'fromCashAccountId' | 'toBankAccountId' | 'toCashAccountId'>,
  direction: 1 | -1
): Promise<void> {
  const outflow = transfer.amount * direction;
  const inflow = transfer.amount * direction;

  if (transfer.fromBankAccountId) {
    await tx.bankAccount.update({
      where: { id: transfer.fromBankAccountId },
      data: { currentBalance: { decrement: outflow } },
    });
  } else if (transfer.fromCashAccountId) {
    await tx.cashAccount.update({
      where: { id: transfer.fromCashAccountId },
      data: { currentBalance: { decrement: outflow } },
    });
  }

  if (transfer.toBankAccountId) {
    await tx.bankAccount.update({
      where: { id: transfer.toBankAccountId },
      data: { currentBalance: { increment: inflow } },
    });
  } else if (transfer.toCashAccountId) {
    await tx.cashAccount.update({
      where: { id: transfer.toCashAccountId },
      data: { currentBalance: { increment: inflow } },
    });
  }
}
