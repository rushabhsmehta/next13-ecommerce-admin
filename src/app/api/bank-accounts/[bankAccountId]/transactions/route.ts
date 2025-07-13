import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";
import { auth } from "@clerk/nextjs";
import { dateToUtc } from "@/lib/timezone-utils";

export async function GET(
  req: Request,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.bankAccountId) {
      return new NextResponse("Bank account ID is required", { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Parse date parameters using timezone-safe conversion
    const startDate = startDateParam ? dateToUtc(startDateParam) || new Date(0) : new Date(0);
    const endDate = endDateParam ? dateToUtc(endDateParam) || new Date() : new Date();
    
    // Make sure end date is set to the end of the day in UTC
    if (endDate) {
      endDate.setUTCHours(23, 59, 59, 999);
    }

    // Fetch the bank account to get opening balance
    const bankAccount = await prismadb.bankAccount.findUnique({
      where: { id: params.bankAccountId }
    });

    if (!bankAccount) {
      return new NextResponse("Bank account not found", { status: 404 });
    }

    // Calculate opening balance based on transactions before the start date
    let openingBalance = bankAccount.openingBalance;
    
    // For reports with start date close to account creation (or from the beginning of time),
    // we don't need to calculate additional historic transactions
    const isHistoricReport = startDate.getTime() > new Date(0).getTime() + 86400000; // More than 1 day after epoch

    // Only adjust opening balance with historic transactions if we're looking at a specific date range
    // and not the entire history of the account
    if (isHistoricReport) {
      // Get all transactions before start date to calculate the actual opening balance for the selected period
      const [receiptsBefore, paymentsBefore, incomesBefore, expensesBefore, transfersInBefore, transfersOutBefore] = await Promise.all([
        // Receipts (inflows) before start date
        prismadb.receiptDetail.findMany({
          where: {
            bankAccountId: params.bankAccountId,
            receiptDate: { lt: startDate }
          },
          select: { amount: true }
        }),
        // Payments (outflows) before start date
        prismadb.paymentDetail.findMany({
          where: {
            bankAccountId: params.bankAccountId,
            paymentDate: { lt: startDate }
          },
          select: { amount: true }
        }),
        // Incomes (inflows) before start date
        prismadb.incomeDetail.findMany({
          where: {
            bankAccountId: params.bankAccountId,
            incomeDate: { lt: startDate }
          },
          select: { amount: true }
        }),
        // Expenses (outflows) before start date
        prismadb.expenseDetail.findMany({
          where: {
            bankAccountId: params.bankAccountId,
            expenseDate: { lt: startDate }
          },
          select: { amount: true }
        }),
        // Incoming transfers before start date
        prismadb.transfer.findMany({
          where: {
            toBankAccountId: params.bankAccountId,
            transferDate: { lt: startDate }
          },
          select: { amount: true }
        }),
        // Outgoing transfers before start date
        prismadb.transfer.findMany({
          where: {
            fromBankAccountId: params.bankAccountId,
            transferDate: { lt: startDate }
          },
          select: { amount: true }
        }),
      ]);
      
      // Calculate the actual opening balance by adding/subtracting all transactions before start date
      receiptsBefore.forEach(receipt => openingBalance += receipt.amount);
      paymentsBefore.forEach(payment => openingBalance -= payment.amount);
      incomesBefore.forEach(income => openingBalance += income.amount);
      expensesBefore.forEach(expense => openingBalance -= expense.amount);
      transfersInBefore.forEach(transfer => openingBalance += transfer.amount);
      transfersOutBefore.forEach(transfer => openingBalance -= transfer.amount);
    }

    // Now fetch all transactions for the selected date range
    const [receipts, payments, incomes, expenses, transfersIn, transfersOut] = await Promise.all([
      // Receipts (inflows)
      prismadb.receiptDetail.findMany({
        where: {
          bankAccountId: params.bankAccountId,
          receiptDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          customer: true,
          supplier: true,
          tourPackageQuery: true
        },
        orderBy: { receiptDate: 'asc' }
      }),
      // Payments (outflows)
      prismadb.paymentDetail.findMany({
        where: {
          bankAccountId: params.bankAccountId,
          paymentDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          supplier: true,
          customer: true,
          tourPackageQuery: true
        },
        orderBy: { paymentDate: 'asc' }
      }),
      // Incomes (inflows)
      prismadb.incomeDetail.findMany({
        where: {
          bankAccountId: params.bankAccountId,
          incomeDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          tourPackageQuery: true,
          incomeCategory: true  // Include the incomeCategory relation
        },
        orderBy: { incomeDate: 'asc' }
      }),
      // Expenses (outflows)
      prismadb.expenseDetail.findMany({
        where: {
          bankAccountId: params.bankAccountId,
          expenseDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          tourPackageQuery: true,
          expenseCategory: true  // Include the expenseCategory relation
        },
        orderBy: { expenseDate: 'asc' }
      }),
      // Incoming transfers
      prismadb.transfer.findMany({
        where: {
          toBankAccountId: params.bankAccountId,
          transferDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          fromBankAccount: true,
          fromCashAccount: true
        },
        orderBy: { transferDate: 'asc' }
      }),
      // Outgoing transfers
      prismadb.transfer.findMany({
        where: {
          fromBankAccountId: params.bankAccountId,
          transferDate: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          toBankAccount: true,
          toCashAccount: true
        },
        orderBy: { transferDate: 'asc' }
      }),
    ]);

    // Format all transactions into a common structure
    const transactions = [
      // Format receipts
      ...receipts.map(receipt => ({
        id: receipt.id,
        date: receipt.receiptDate,
        type: receipt.receiptType === 'supplier_refund' ? 'Supplier Refund' : 'Receipt',
        description: receipt.receiptType === 'supplier_refund'
          ? `Refund from Supplier ${receipt.supplier?.name || 'Supplier'}${receipt.tourPackageQuery ? ` for ${receipt.tourPackageQuery.tourPackageQueryName || 'Tour Package'}` : ''}`
          : `Receipt from ${receipt.customer?.name || 'Customer'}${receipt.tourPackageQuery ? ` for ${receipt.tourPackageQuery.tourPackageQueryName || 'Tour Package'}` : ''}`,
        reference: receipt.reference || '',
        amount: receipt.amount,
        isInflow: true,
        note: receipt.note || '',
      })),
      // Format payments
      ...payments.map(payment => ({
        id: payment.id,
        date: payment.paymentDate,
        type: payment.paymentType === 'customer_refund' ? 'Customer Refund' : 'Payment',
        description: payment.paymentType === 'customer_refund' 
          ? `Refund to Customer ${payment.customer?.name || 'Customer'}${payment.tourPackageQuery ? ` for ${payment.tourPackageQuery.tourPackageQueryName || 'Tour Package'}` : ''}`
          : `Payment to ${payment.supplier?.name || 'Supplier'}${payment.tourPackageQuery ? ` for ${payment.tourPackageQuery.tourPackageQueryName || 'Tour Package'}` : ''}`,
        reference: payment.transactionId || '',
        amount: payment.amount,
        isInflow: false,
        note: payment.note || '',
      })),
      // Format incomes
      ...incomes.map(income => ({
        id: income.id,
        date: income.incomeDate,
        type: `Income (${income.incomeCategory?.name || 'Uncategorized'})`,
        description: income.description || `${income.incomeCategory?.name || 'Uncategorized'} income${income.tourPackageQuery ? ` for ${income.tourPackageQuery.tourPackageQueryName || 'Tour Package'}` : ''}`,
        reference: '',
        amount: income.amount,
        isInflow: true,
        note: income.description || '',
      })),
      // Format expenses
      ...expenses.map(expense => ({
        id: expense.id,
        date: expense.expenseDate,
        type: `Expense (${expense.expenseCategory?.name || 'Uncategorized'})`,
        description: expense.description || `${expense.expenseCategory?.name || 'Uncategorized'} expense${expense.tourPackageQuery ? ` for ${expense.tourPackageQuery.tourPackageQueryName || 'Tour Package'}` : ''}`,
        reference: '',
        amount: expense.amount,
        isInflow: false,
        note: expense.description || '',
      })),
      // Format incoming transfers
      ...transfersIn.map(transfer => ({
        id: transfer.id,
        date: transfer.transferDate,
        type: 'Transfer In',
        description: `Transfer from ${transfer.fromBankAccount?.accountName || transfer.fromCashAccount?.accountName || 'Unknown Account'}`,
        reference: transfer.reference || '',
        amount: transfer.amount,
        isInflow: true,
        note: transfer.description || '',
      })),
      // Format outgoing transfers
      ...transfersOut.map(transfer => ({
        id: transfer.id,
        date: transfer.transferDate,
        type: 'Transfer Out',
        description: `Transfer to ${transfer.toBankAccount?.accountName || transfer.toCashAccount?.accountName || 'Unknown Account'}`,
        reference: transfer.reference || '',
        amount: transfer.amount,
        isInflow: false,
        note: transfer.description || '',
      })),
    ];

    // Sort transactions by date
    const sortedTransactions = transactions.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return NextResponse.json({
      transactions: sortedTransactions,
      openingBalance
    });
  } catch (error) {
    console.error("[BANK_ACCOUNT_TRANSACTIONS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
