import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function PATCH(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.expenseId) {
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    const body = await req.json();
    const { bankAccountId, cashAccountId } = body;

    // Validate that either bank or cash account is provided
    if (!bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected", { status: 400 });
    }

    // Get the existing accrued expense
    const existingExpense = await prismadb.expenseDetail.findUnique({
      where: { id: params.expenseId }
    });

    if (!existingExpense) {
      return new NextResponse("Expense not found", { status: 404 });
    }

    if (!existingExpense.isAccrued) {
      return new NextResponse("Expense is already paid", { status: 400 });
    }

    // Convert accrued expense to paid expense
    const updatedExpense = await prismadb.expenseDetail.update({
      where: { id: params.expenseId },
      data: {
        isAccrued: false,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
        paidDate: new Date(),
      },
      include: {
        expenseCategory: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      }
    });

    // Update account balance
    if (bankAccountId) {
      const bankAccount = await prismadb.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      
      if (bankAccount) {
        await prismadb.bankAccount.update({
          where: { id: bankAccountId },
          data: { 
            currentBalance: bankAccount.currentBalance - existingExpense.amount
          }
        });
      }
    } else if (cashAccountId) {
      const cashAccount = await prismadb.cashAccount.findUnique({
        where: { id: cashAccountId }
      });
      
      if (cashAccount) {
        await prismadb.cashAccount.update({
          where: { id: cashAccountId },
          data: { 
            currentBalance: cashAccount.currentBalance - existingExpense.amount
          }
        });
      }
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('[EXPENSE_PAY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
