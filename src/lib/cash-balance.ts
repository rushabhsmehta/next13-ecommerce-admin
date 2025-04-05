import prismadb from "@/lib/prismadb";

export async function recalculateCashBalance(cashAccountId: string): Promise<number> {
  console.log(`[RECALCULATE_CASH_BALANCE] Starting recalculation for cash account: ${cashAccountId}`);
  
  // Get the cash account
  const cashAccount = await prismadb.cashAccount.findUnique({
    where: { id: cashAccountId }
  });
  
  if (!cashAccount) {
    console.error(`[RECALCULATE_CASH_BALANCE] Cash account not found: ${cashAccountId}`);
    throw new Error(`Cash account not found: ${cashAccountId}`);
  }
  
  console.log(`[RECALCULATE_CASH_BALANCE] Found cash account: ${cashAccount.accountName} with opening balance: ${cashAccount.openingBalance}`);
  
  // Start with the opening balance
  let currentBalance = cashAccount.openingBalance || 0;
  
  // Get all inflows (receipts)
  const receipts = await prismadb.receiptDetail.findMany({
    where: { cashAccountId }
  });
  
  // Add up all inflows
  const totalReceipts = receipts.reduce((sum, receipt) => sum + (receipt.amount || 0), 0);
  console.log(`[RECALCULATE_CASH_BALANCE] Total receipts: ${totalReceipts}`);
  currentBalance += totalReceipts;
  
  // Get all outflows (payments)
  const payments = await prismadb.paymentDetail.findMany({
    where: { cashAccountId }
  });
  
  // Subtract all outflows
  const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  console.log(`[RECALCULATE_CASH_BALANCE] Total payments: ${totalPayments}`);
  currentBalance -= totalPayments;
  
  // Get all expenses (outflows)
  const expenses = await prismadb.expenseDetail.findMany({
    where: { cashAccountId }
  });
  
  // Subtract all expenses
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  console.log(`[RECALCULATE_CASH_BALANCE] Total expenses: ${totalExpenses}`);
  currentBalance -= totalExpenses;
  
  // Account for transfers TO this cash account (inflows)
  const transfersIn = await prismadb.transfer.findMany({
    where: { 
      toCashAccountId: cashAccountId 
    },
    orderBy: {
      transferDate: 'asc'
    }
  });
  
  console.log(`[RECALCULATE_CASH_BALANCE] Found ${transfersIn.length} transfers TO this cash account (inflows)`);
  let totalTransfersIn = 0;
  for (const transfer of transfersIn) {
    totalTransfersIn += transfer.amount;
    const previousBalance = currentBalance;
    currentBalance += transfer.amount;
    
    console.log(`[RECALCULATE_CASH_BALANCE] Transfer IN (${transfer.id}): From ${transfer.fromBankAccountId ? 'Bank' : 'Cash'}, ${transfer.transferDate.toISOString().split('T')[0]}, Amount: +${transfer.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }
  console.log(`[RECALCULATE_CASH_BALANCE] Total transfers in: ${totalTransfersIn}`);
  
  // Account for transfers FROM this cash account (outflows)
  const transfersOut = await prismadb.transfer.findMany({
    where: { 
      fromCashAccountId: cashAccountId 
    },
    orderBy: {
      transferDate: 'asc'
    }
  });
  
  console.log(`[RECALCULATE_CASH_BALANCE] Found ${transfersOut.length} transfers FROM this cash account (outflows)`);
  let totalTransfersOut = 0;
  for (const transfer of transfersOut) {
    totalTransfersOut += transfer.amount;
    const previousBalance = currentBalance;
    currentBalance -= transfer.amount;
    
    console.log(`[RECALCULATE_CASH_BALANCE] Transfer OUT (${transfer.id}): To ${transfer.toBankAccountId ? 'Bank' : 'Cash'}, ${transfer.transferDate.toISOString().split('T')[0]}, Amount: -${transfer.amount}, Previous Balance: ${previousBalance}, New Balance: ${currentBalance}`);
  }
  console.log(`[RECALCULATE_CASH_BALANCE] Total transfers out: ${totalTransfersOut}`);
  
  console.log(`[RECALCULATE_CASH_BALANCE] New calculated balance: ${currentBalance}`);
  
  // Update ONLY the current balance, not the opening balance
  await prismadb.cashAccount.update({
    where: { id: cashAccountId },
    data: { 
      currentBalance
      // Removed the line that was updating openingBalance
    }
  });
  
  console.log(`[RECALCULATE_CASH_BALANCE] Updated cash account with new balance: ${currentBalance}`);
  
  return currentBalance;
}

