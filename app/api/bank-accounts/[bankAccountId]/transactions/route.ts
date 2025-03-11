import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!params.bankAccountId) {
      return new NextResponse("Bank Account ID is required", { status: 400 });
    }

    // Create date filter conditions for each transaction type
    let paymentDateFilter = {};
    let receiptDateFilter = {};
    let expenseDateFilter = {};
    
    if (startDate && endDate) {
      paymentDateFilter = {
        paymentDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
      
      receiptDateFilter = {
        receiptDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
      
      expenseDateFilter = {
        expenseDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };
    }

    // Get the bank account for starting balance
    const bankAccount = await prismadb.bankAccount.findUnique({
      where: {
        id: params.bankAccountId
      }
    });

    if (!bankAccount) {
      console.log(`[BANK_TRANSACTIONS_GET] Bank account not found: ${params.bankAccountId}`);
      return new NextResponse("Bank account not found", { status: 404 });
    }

    console.log(`\n[BANK_TRANSACTIONS_GET] Getting transactions for bank account: ${bankAccount.accountName} (${params.bankAccountId})`);
    console.log(`[BANK_TRANSACTIONS_GET] Bank opening balance: ${bankAccount.openingBalance}, current balance: ${bankAccount.currentBalance}`);
    
    // Get payments (outflows)
    const payments = await prismadb.paymentDetail.findMany({
      where: {
        bankAccountId: params.bankAccountId,
        ...paymentDateFilter
      },
      include: {
        tourPackageQuery: {
          select: {
            tourPackageQueryName: true,
            customerName: true
          }
        },
        supplier: true
      },
      orderBy: {
        paymentDate: 'asc'
      }
    });

    // Get receipts (inflows)
    const receipts = await prismadb.receiptDetail.findMany({
      where: {
        bankAccountId: params.bankAccountId,
        ...receiptDateFilter
      },
      include: {
        tourPackageQuery: {
          select: {
            tourPackageQueryName: true,
            customerName: true
          }
        },
        customer: true
      },
      orderBy: {
        receiptDate: 'asc'
      }
    });

    // Get expenses (outflows)
    const expenses = await prismadb.expenseDetail.findMany({
      where: {
        bankAccountId: params.bankAccountId,
        ...expenseDateFilter
      },
      include: {
        tourPackageQuery: {
          select: {
            tourPackageQueryName: true,
            customerName: true
          }
        }
      },
      orderBy: {
        expenseDate: 'asc'
      }
    });

    // Combine and process all transactions
    const transactions = [
      ...payments.map(payment => ({
        id: payment.id,
        date: payment.paymentDate,
        type: 'PAYMENT',
        description: `Payment to ${payment.supplier?.name || 'Unknown'} - ${payment.tourPackageQuery?.tourPackageQueryName || 'No package'}`,
        reference: payment.tourPackageQuery?.tourPackageQueryName || '',
        amount: payment.amount,
        isInflow: false,
        note: payment.note || '',
        transactionId: payment.transactionId || ''
      })),
      ...receipts.map(receipt => ({
        id: receipt.id,
        date: receipt.receiptDate,
        type: 'RECEIPT',
        description: `Receipt from ${receipt.customer?.name || receipt.tourPackageQuery?.customerName || 'Unknown'} - ${receipt.tourPackageQuery?.tourPackageQueryName || 'No package'}`,
        reference: receipt.reference || '',
        amount: receipt.amount,
        isInflow: true,
        note: receipt.note || ''
      })),
      ...expenses.map(expense => ({
        id: expense.id,
        date: expense.expenseDate,
        type: 'EXPENSE',
        description: `Expense: ${expense.expenseCategory} - ${expense.tourPackageQuery?.tourPackageQueryName || 'No package'}`,
        reference: expense.tourPackageQuery?.tourPackageQueryName || '',
        amount: expense.amount,
        isInflow: false,
        note: expense.description || ''
      }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance for each transaction
    let runningBalance = bankAccount.openingBalance || 0;
    console.log(`[BANK_TRANSACTIONS_GET] Starting running balance calculation with opening balance: ${runningBalance}`);
    
    // Sort transactions by date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Add running balance to each transaction
    const transactionsWithBalance = transactions.map(transaction => {
      const prevBalance = runningBalance;
      runningBalance += transaction.isInflow ? transaction.amount : -transaction.amount;
      
      console.log(`[BANK_TRANSACTIONS_GET] Transaction ${transaction.id} (${transaction.type}): ${transaction.description}, Date: ${new Date(transaction.date).toISOString().split('T')[0]}, Amount: ${transaction.isInflow ? '+' : '-'}${transaction.amount}, Previous Balance: ${prevBalance}, New Balance: ${runningBalance}`);
      
      return {
        ...transaction,
        runningBalance
      };
    });

    console.log(`[BANK_TRANSACTIONS_GET] Final calculated balance: ${runningBalance}`);
    console.log(`[BANK_TRANSACTIONS_GET] Stored current balance: ${bankAccount.currentBalance}`);
    if (runningBalance !== bankAccount.currentBalance) {
      console.log(`[BANK_TRANSACTIONS_GET] WARNING: Calculated balance (${runningBalance}) does not match stored balance (${bankAccount.currentBalance})!`);
    }

    return NextResponse.json({
      transactions: transactionsWithBalance,
      openingBalance: bankAccount.openingBalance || 0,
      calculatedEndingBalance: runningBalance,
      currentBalance: bankAccount.currentBalance || 0
    });
  } catch (error) {
    console.log('[BANK_TRANSACTIONS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
