import prismadb from "./prismadb";

/**
 * Updates a bank account's current balance based on transaction details
 */
export async function updateBankBalance(
  bankAccountId: string,
  amount: number,
  isInflow: boolean,
  isNewTransaction: boolean = true
) {
  // Retrieve the current bank account
  const bankAccount = await prismadb.bankAccount.findUnique({
    where: { id: bankAccountId }
  });

  if (!bankAccount) {
    throw new Error(`Bank account with ID ${bankAccountId} not found`);
  }

  // Calculate the new balance
  // For a new transaction: Add for inflow, subtract for outflow
  // For removing a transaction: Subtract for inflow, add for outflow (reverse the effect)
  const balanceChange = isInflow ? amount : -amount;
  const changeToApply = isNewTransaction ? balanceChange : -balanceChange;
  
  const updatedBalance = bankAccount.currentBalance + changeToApply;

  // Update the bank account with the new balance
  await prismadb.bankAccount.update({
    where: { id: bankAccountId },
    data: { currentBalance: updatedBalance }
  });

  return updatedBalance;
}

/**
 * Recalculates the entire bank account balance from scratch based on all transactions
 */
export async function recalculateBankBalance(bankAccountId: string) {
  const bankAccount = await prismadb.bankAccount.findUnique({
    where: { id: bankAccountId }
  });

  if (!bankAccount) {
    throw new Error(`Bank account with ID ${bankAccountId} not found`);
  }

  // Start with opening balance
  let currentBalance = bankAccount.openingBalance || 0;

  // Add all receipts
  const receipts = await prismadb.receiptDetail.findMany({
    where: { bankAccountId }
  });
  
  for (const receipt of receipts) {
    currentBalance += receipt.amount;
  }

  // Subtract all payments
  const payments = await prismadb.paymentDetail.findMany({
    where: { bankAccountId }
  });
  
  for (const payment of payments) {
    currentBalance -= payment.amount;
  }

  // Subtract all expenses
  const expenses = await prismadb.expenseDetail.findMany({
    where: { bankAccountId }
  });
  
  for (const expense of expenses) {
    currentBalance -= expense.amount;
  }

  // Update the bank account with recalculated balance
  await prismadb.bankAccount.update({
    where: { id: bankAccountId },
    data: { currentBalance }
  });

  return currentBalance;
}
