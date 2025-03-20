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
export async function recalculateBankBalance(bankAccountId: string) {
  const bankAccount = await prismadb.bankAccount.findUnique({
    where: { id: bankAccountId }
  });

  if (!bankAccount) {
    throw new Error(`Bank account with ID ${bankAccountId} not found`);
  }

  console.log(`\n[RECALCULATE_BALANCE] Starting recalculation for bank account: ${bankAccount.accountName} (${bankAccountId})`);
  
  // Start with opening balance
  let currentBalance = bankAccount.openingBalance || 0;
  console.log(`[RECALCULATE_BALANCE] Starting with opening balance: ${currentBalance}`);

  // Add all receipts
  const receipts = await prismadb.receiptDetail.findMany({
    where: { bankAccountId },
    include: {
      customer: true,
      tourPackageQuery: true
    },
    orderBy: {
      receiptDate: 'asc'
    }
  });
  
  console.log(`[RECALCULATE_BALANCE] Found ${receipts.length} receipts (inflows)`);
  for (const receipt of receipts) {
    const previousBalance = currentBalance;
    currentBalance += receipt.amount;
    
    const customerName = receipt.customer?.name || receipt.tourPackageQuery?.customerName || 'Unknown';
    console.log(`[RECALCULATE_BALANCE] Receipt (${receipt.id}): ${customerName}, ${receipt.receiptDate.toISOString().split('T')[0]}, Amount: +${receipt.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }

  // Subtract all payments
  const payments = await prismadb.paymentDetail.findMany({
    where: { bankAccountId },
    include: {
      supplier: true,
      tourPackageQuery: true
    },
    orderBy: {
      paymentDate: 'asc'
    }
  });
  
  console.log(`[RECALCULATE_BALANCE] Found ${payments.length} payments (outflows)`);
  for (const payment of payments) {
    const previousBalance = currentBalance;
    currentBalance -= payment.amount;
    
    const supplierName = payment.supplier?.name || 'Unknown';
    console.log(`[RECALCULATE_BALANCE] Payment (${payment.id}): ${supplierName}, ${payment.paymentDate.toISOString().split('T')[0]}, Amount: -${payment.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }

  // Subtract all expenses
  const expenses = await prismadb.expenseDetail.findMany({
    where: { bankAccountId },
    include: {
      tourPackageQuery: true,
      expenseCategory: true  // Include the expense category relation
    },
    orderBy: {
      expenseDate: 'asc'
    }
  });
  
  console.log(`[RECALCULATE_BALANCE] Found ${expenses.length} expenses (outflows)`);
  for (const expense of expenses) {
    const previousBalance = currentBalance;
    currentBalance -= expense.amount;
    
    console.log(`[RECALCULATE_BALANCE] Expense (${expense.id}): ${expense.expenseCategory?.name || 'Uncategorized'}, ${expense.expenseDate.toISOString().split('T')[0]}, Amount: -${expense.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }

  console.log(`[RECALCULATE_BALANCE] Final balance: ${currentBalance}`);
  console.log(`[RECALCULATE_BALANCE] Previous saved balance: ${bankAccount.currentBalance}`);
  console.log(`[RECALCULATE_BALANCE] Updating bank account balance...`);

  // Update the bank account with recalculated balance
  await prismadb.bankAccount.update({
    where: { id: bankAccountId },
    data: { currentBalance }
  });

  console.log(`[RECALCULATE_BALANCE] Recalculation complete. New balance set to: ${currentBalance}\n`);
  return currentBalance;
}

