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
  
  console.log(`[RECALCULATE_CASH_BALANCE] New calculated balance: ${currentBalance}`);
  
  // Update the cash account with the new balance
  await prismadb.cashAccount.update({
    where: { id: cashAccountId },
    data: { currentBalance }
  });
  
  console.log(`[RECALCULATE_CASH_BALANCE] Updated cash account with new balance: ${currentBalance}`);
  
  return currentBalance;
}
