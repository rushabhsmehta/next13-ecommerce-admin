import { format } from "date-fns";
import { formatLocalDate } from "@/lib/timezone-utils";
import prismadb from "@/lib/prismadb";
import { FormattedTransaction } from "../../types";

/**
 * Fetches all transactions for a bank account and formats them
 */
export async function getBankAccountTransactions(bankAccountId: string): Promise<FormattedTransaction[]> {
  // Fetch all different types of transactions for this bank account
  const [payments, receipts, expenses, incomes, outgoingTransfers, incomingTransfers] = await Promise.all([
    // Payments (outflows)
    prismadb.paymentDetail.findMany({
      where: { bankAccountId },
      include: {
        supplier: true,
        tourPackageQuery: true
      },
      orderBy: { paymentDate: 'asc' }
    }),
    // Receipts (inflows)
    prismadb.receiptDetail.findMany({
      where: { bankAccountId },
      include: {
        customer: true,
        tourPackageQuery: true
      },
      orderBy: { receiptDate: 'asc' }
    }),
    // Expenses (outflows)
    prismadb.expenseDetail.findMany({
      where: { bankAccountId },
      include: {
        expenseCategory: true,
        tourPackageQuery: true
      },
      orderBy: { expenseDate: 'asc' }
    }),
    // Income (inflows)
    prismadb.incomeDetail.findMany({
      where: { bankAccountId },
      include: {
        incomeCategory: true,
        tourPackageQuery: true
      },
      orderBy: { incomeDate: 'asc' }
    }),
    // Transfers out (outflows)
    prismadb.transfer.findMany({
      where: { fromBankAccountId: bankAccountId },
      include: {
        toBankAccount: true,
        toCashAccount: true
      },
      orderBy: { transferDate: 'asc' }
    }),
    // Transfers in (inflows)
    prismadb.transfer.findMany({
      where: { toBankAccountId: bankAccountId },
      include: {
        fromBankAccount: true,
        fromCashAccount: true
      },
      orderBy: { transferDate: 'asc' }
    })
  ]);

  // Format all transactions into a common structure
  const formattedTransactions: FormattedTransaction[] = [
    // Payment transactions (outflows)
    ...payments.map(payment => ({
      id: payment.id,
      date: format(payment.paymentDate, "yyyy-MM-dd"),
      type: "Payment",
      description: payment.note || `Payment to ${payment.supplier?.name || 'supplier'}${payment.tourPackageQuery ? ` for ${payment.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: 0,
      outflow: payment.amount,
      balance: 0, // Will be calculated later
      reference: payment.transactionId || payment.method || undefined
    })),
    // Receipt transactions (inflows)
    ...receipts.map(receipt => ({
      id: receipt.id,
      date: format(receipt.receiptDate, "yyyy-MM-dd"),
      type: "Receipt",
      description: receipt.note || `Receipt from ${receipt.customer?.name || 'customer'}${receipt.tourPackageQuery ? ` for ${receipt.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: receipt.amount,
      outflow: 0,
      balance: 0, // Will be calculated later
      reference: receipt.reference || undefined
    })),
    // Expense transactions (outflows)
    ...expenses.map(expense => ({
      id: expense.id,
      date: format(expense.expenseDate, "yyyy-MM-dd"),
      type: "Expense",
      description: expense.description || `${expense.expenseCategory?.name || 'Expense'} ${expense.tourPackageQuery ? `for ${expense.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: 0,
      outflow: expense.amount,
      balance: 0, // Will be calculated later
      reference: undefined
    })),
    // Income transactions (inflows)
    ...incomes.map(income => ({
      id: income.id,
      date: format(income.incomeDate, "yyyy-MM-dd"),
      type: "Income",
      description: income.description || `${income.incomeCategory?.name || 'Income'} ${income.tourPackageQuery ? `for ${income.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: income.amount,
      outflow: 0,
      balance: 0, // Will be calculated later
      reference: undefined
    })),
    // Outgoing transfers (outflows)
    ...outgoingTransfers.map(transfer => ({
      id: transfer.id,
      date: format(transfer.transferDate, "yyyy-MM-dd"),
      type: "Transfer Out",
      description: transfer.description || `Transfer to ${transfer.toBankAccount?.accountName || transfer.toCashAccount?.accountName || 'account'}`,
      inflow: 0,
      outflow: transfer.amount,
      balance: 0, // Will be calculated later
      reference: transfer.reference || undefined
    })),
    // Incoming transfers (inflows)
    ...incomingTransfers.map(transfer => ({
      id: transfer.id,
      date: format(transfer.transferDate, "yyyy-MM-dd"),
      type: "Transfer In",
      description: transfer.description || `Transfer from ${transfer.fromBankAccount?.accountName || transfer.fromCashAccount?.accountName || 'account'}`,
      inflow: transfer.amount,
      outflow: 0,
      balance: 0, // Will be calculated later
      reference: transfer.reference || undefined
    }))
  ];

  // Sort all transactions by date
  const sortedTransactions = formattedTransactions.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sortedTransactions;
}

/**
 * Fetches all transactions for a cash account and formats them
 */
export async function getCashAccountTransactions(cashAccountId: string): Promise<FormattedTransaction[]> {
  // Fetch all different types of transactions for this cash account
  const [payments, receipts, expenses, incomes, outgoingTransfers, incomingTransfers] = await Promise.all([
    // Payments (outflows)
    prismadb.paymentDetail.findMany({
      where: { cashAccountId },
      include: {
        supplier: true,
        tourPackageQuery: true
      },
      orderBy: { paymentDate: 'asc' }
    }),
    // Receipts (inflows)
    prismadb.receiptDetail.findMany({
      where: { cashAccountId },
      include: {
        customer: true,
        tourPackageQuery: true
      },
      orderBy: { receiptDate: 'asc' }
    }),
    // Expenses (outflows)
    prismadb.expenseDetail.findMany({
      where: { cashAccountId },
      include: {
        expenseCategory: true,
        tourPackageQuery: true
      },
      orderBy: { expenseDate: 'asc' }
    }),
    // Income (inflows)
    prismadb.incomeDetail.findMany({
      where: { cashAccountId },
      include: {
        incomeCategory: true,
        tourPackageQuery: true
      },
      orderBy: { incomeDate: 'asc' }
    }),
    // Transfers out (outflows)
    prismadb.transfer.findMany({
      where: { fromCashAccountId: cashAccountId },
      include: {
        toBankAccount: true,
        toCashAccount: true
      },
      orderBy: { transferDate: 'asc' }
    }),
    // Transfers in (inflows)
    prismadb.transfer.findMany({
      where: { toCashAccountId: cashAccountId },
      include: {
        fromBankAccount: true,
        fromCashAccount: true
      },
      orderBy: { transferDate: 'asc' }
    })
  ]);

  // Format all transactions into a common structure
  const formattedTransactions: FormattedTransaction[] = [
    // Payment transactions (outflows)
    ...payments.map(payment => ({
      id: payment.id,
      date: format(payment.paymentDate, "yyyy-MM-dd"),
      type: "Payment",
      description: payment.note || `Payment to ${payment.supplier?.name || 'supplier'}${payment.tourPackageQuery ? ` for ${payment.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: 0,
      outflow: payment.amount,
      balance: 0, // Will be calculated later
      reference: payment.transactionId || payment.method || undefined
    })),
    // Receipt transactions (inflows)
    ...receipts.map(receipt => ({
      id: receipt.id,
      date: format(receipt.receiptDate, "yyyy-MM-dd"),
      type: "Receipt",
      description: receipt.note || `Receipt from ${receipt.customer?.name || 'customer'}${receipt.tourPackageQuery ? ` for ${receipt.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: receipt.amount,
      outflow: 0,
      balance: 0, // Will be calculated later
      reference: receipt.reference || undefined
    })),
    // Expense transactions (outflows)
    ...expenses.map(expense => ({
      id: expense.id,
      date: format(expense.expenseDate, "yyyy-MM-dd"),
      type: "Expense",
      description: expense.description || `${expense.expenseCategory?.name || 'Expense'} ${expense.tourPackageQuery ? `for ${expense.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: 0,
      outflow: expense.amount,
      balance: 0, // Will be calculated later
      reference: undefined
    })),
    // Income transactions (inflows)
    ...incomes.map(income => ({
      id: income.id,
      date: format(income.incomeDate, "yyyy-MM-dd"),
      type: "Income",
      description: income.description || `${income.incomeCategory?.name || 'Income'} ${income.tourPackageQuery ? `for ${income.tourPackageQuery.tourPackageQueryName || 'tour package'}` : ''}`,
      inflow: income.amount,
      outflow: 0,
      balance: 0, // Will be calculated later
      reference: undefined
    })),
    // Outgoing transfers (outflows)
    ...outgoingTransfers.map(transfer => ({
      id: transfer.id,
      date: format(transfer.transferDate, "yyyy-MM-dd"),
      type: "Transfer Out",
      description: transfer.description || `Transfer to ${transfer.toBankAccount?.accountName || transfer.toCashAccount?.accountName || 'account'}`,
      inflow: 0,
      outflow: transfer.amount,
      balance: 0, // Will be calculated later
      reference: transfer.reference || undefined
    })),
    // Incoming transfers (inflows)
    ...incomingTransfers.map(transfer => ({
      id: transfer.id,
      date: format(transfer.transferDate, "yyyy-MM-dd"),
      type: "Transfer In",
      description: transfer.description || `Transfer from ${transfer.fromBankAccount?.accountName || transfer.fromCashAccount?.accountName || 'account'}`,
      inflow: transfer.amount,
      outflow: 0,
      balance: 0, // Will be calculated later
      reference: transfer.reference || undefined
    }))
  ];

  // Sort all transactions by date
  const sortedTransactions = formattedTransactions.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sortedTransactions;
}

/**
 * Calculates running balance for a list of transactions
 */
export function calculateRunningBalance(transactions: FormattedTransaction[], openingBalance: number): FormattedTransaction[] {
  let runningBalance = openingBalance;
  
  return transactions.map(transaction => {
    runningBalance = runningBalance + transaction.inflow - transaction.outflow;
    return {
      ...transaction,
      balance: runningBalance
    };
  });
}

