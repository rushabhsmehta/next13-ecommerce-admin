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
  
  const oldBalance = bankAccount.currentBalance;
  const updatedBalance = oldBalance + changeToApply;

  console.log(`[BALANCE_UPDATE] Bank account: ${bankAccount.accountName} (${bankAccountId})`);
  console.log(`[BALANCE_UPDATE] Previous balance: ${oldBalance}`);
  console.log(`[BALANCE_UPDATE] ${isNewTransaction ? 'New' : 'Removing'} ${isInflow ? 'inflow' : 'outflow'} transaction of ${amount}`);
  console.log(`[BALANCE_UPDATE] Change to apply: ${changeToApply}`);
  console.log(`[BALANCE_UPDATE] New balance: ${updatedBalance}`);

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
export async function recalculateBankBalance(bankAccountId: string): Promise<number> {
  console.log(`[RECALCULATE_BANK_BALANCE] Starting recalculation for bank account: ${bankAccountId}`);

  // Get the bank account
  const bankAccount = await prismadb.bankAccount.findUnique({
    where: { id: bankAccountId }
  });

  if (!bankAccount) {
    console.error(`[RECALCULATE_BANK_BALANCE] Bank account not found: ${bankAccountId}`);
    throw new Error(`Bank account not found: ${bankAccountId}`);
  }

  console.log(`[RECALCULATE_BANK_BALANCE] Found bank account: ${bankAccount.accountName} with opening balance: ${bankAccount.openingBalance}`);

  // Start with the opening balance
  let currentBalance = bankAccount.openingBalance || 0;

  // Get all inflows (receipts)
  const receipts = await prismadb.receiptDetail.findMany({
    where: { bankAccountId }
  });

  // Add up all inflows
  const totalReceipts = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
  console.log(`[RECALCULATE_BANK_BALANCE] Total receipts: ${totalReceipts}`);
  currentBalance += totalReceipts;

  // Get all outflows (payments)
  const payments = await prismadb.paymentDetail.findMany({
    where: { bankAccountId }
  });

  // Subtract all outflows
  const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  console.log(`[RECALCULATE_BANK_BALANCE] Total payments: ${totalPayments}`);
  currentBalance -= totalPayments;

  // Get all expenses (outflows)
  const expenses = await prismadb.expenseDetail.findMany({
    where: { bankAccountId }
  });

  // Subtract all expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  console.log(`[RECALCULATE_BANK_BALANCE] Total expenses: ${totalExpenses}`);
  currentBalance -= totalExpenses;

  // Account for transfers TO this bank account (inflows)
  const transfersIn = await prismadb.transfer.findMany({
    where: { 
      toBankAccountId: bankAccountId 
    },
    orderBy: {
      transferDate: 'asc'
    }
  });

  console.log(`[RECALCULATE_BANK_BALANCE] Found ${transfersIn.length} transfers TO this bank account (inflows)`);
  let totalTransfersIn = 0;
  for (const transfer of transfersIn) {
    totalTransfersIn += transfer.amount;
    const previousBalance = currentBalance;
    currentBalance += transfer.amount;

    console.log(`[RECALCULATE_BANK_BALANCE] Transfer IN (${transfer.id}): From ${transfer.fromCashAccountId ? 'Cash' : 'Bank'}, ${transfer.transferDate.toISOString().split('T')[0]}, Amount: +${transfer.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }
  console.log(`[RECALCULATE_BANK_BALANCE] Total transfers in: ${totalTransfersIn}`);

  // Account for transfers FROM this bank account (outflows)
  const transfersOut = await prismadb.transfer.findMany({
    where: { 
      fromBankAccountId: bankAccountId 
    },
    orderBy: {
      transferDate: 'asc'
    }
  });

  console.log(`[RECALCULATE_BANK_BALANCE] Found ${transfersOut.length} transfers FROM this bank account (outflows)`);
  let totalTransfersOut = 0;
  for (const transfer of transfersOut) {
    totalTransfersOut += transfer.amount;
    const previousBalance = currentBalance;
    currentBalance -= transfer.amount;

    console.log(`[RECALCULATE_BANK_BALANCE] Transfer OUT (${transfer.id}): To ${transfer.toCashAccountId ? 'Cash' : 'Bank'}, ${transfer.transferDate.toISOString().split('T')[0]}, Amount: -${transfer.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }
  console.log(`[RECALCULATE_BANK_BALANCE] Total transfers out: ${totalTransfersOut}`);

  console.log(`[RECALCULATE_BANK_BALANCE] New calculated balance: ${currentBalance}`);

  // Update ONLY the current balance, not the opening balance
  await prismadb.bankAccount.update({
    where: { id: bankAccountId },
    data: { 
      currentBalance
    }
  });

  console.log(`[RECALCULATE_BANK_BALANCE] Updated bank account with new balance: ${currentBalance}`);

  return currentBalance;
}

