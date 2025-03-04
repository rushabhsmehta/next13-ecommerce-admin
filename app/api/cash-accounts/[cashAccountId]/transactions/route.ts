import { NextResponse } from "next/server";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { cashAccountId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!params.cashAccountId) {
      return new NextResponse("Cash Account ID is required", { status: 400 });
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

    // Get payments (outflows)
    const payments = await prismadb.paymentDetail.findMany({
      where: {
        cashAccountId: params.cashAccountId,
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
        cashAccountId: params.cashAccountId,
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
        cashAccountId: params.cashAccountId,
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

    // Get the cash account for starting balance
    const cashAccount = await prismadb.cashAccount.findUnique({
      where: {
        id: params.cashAccountId
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
        note: payment.note || ''
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

    return NextResponse.json({
      transactions,
      openingBalance: cashAccount?.openingBalance || 0
    });
  } catch (error) {
    console.log('[CASH_TRANSACTIONS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
