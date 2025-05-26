import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
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
    }    const expense = await prismadb.expenseDetail.findUnique({
      where: {
        id: params.expenseId
      },
      include: {
        expenseCategory: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      }
    });

    if (!expense) {
      return new NextResponse("Expense not found", { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error('[EXPENSE_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

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
    }    const body = await req.json();
    const { 
      expenseCategoryId,
      tourPackageQueryId,
      expenseDate,
      amount,
      description,
      bankAccountId,
      cashAccountId,
      images
    } = body;

    // Get existing expense to revert account balances
    const existingExpense = await prismadb.expenseDetail.findUnique({
      where: { id: params.expenseId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!existingExpense) {
      return new NextResponse("Expense not found", { status: 404 });
    }

    // Revert previous account balance
    if (existingExpense.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: existingExpense.bankAccountId },
        data: { 
          currentBalance: existingExpense.bankAccount!.currentBalance + existingExpense.amount
        }
      });
    } else if (existingExpense.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: existingExpense.cashAccountId },
        data: { 
          currentBalance: existingExpense.cashAccount!.currentBalance + existingExpense.amount
        }
      });    }    // Handle image operations if images are provided
    if (images !== undefined) {
      // Delete existing images
      await prismadb.images.deleteMany({
        where: { expenseDetailsId: params.expenseId }
      });

      // Create new images
      if (images && images.length > 0) {
        for (const url of images) {
          await prismadb.images.create({
            data: {
              url,
              expenseDetailsId: params.expenseId
            }
          });
        }
      }
    }

    // Update expense detail
    const updatedExpense = await prismadb.expenseDetail.update({
      where: {
        id: params.expenseId
      },
      data: {  
        expenseDate: new Date(expenseDate),
        amount: parseFloat(amount.toString()),
        expenseCategoryId: expenseCategoryId || null,
        description: description || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      },      include: {
        expenseCategory: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      }
    });

    // Update new account balance
    if (bankAccountId) {
      const bankAccount = await prismadb.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      
      if (bankAccount) {
        await prismadb.bankAccount.update({
          where: { id: bankAccountId },
          data: { 
            currentBalance: bankAccount.currentBalance - parseFloat(amount.toString())
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
            currentBalance: cashAccount.currentBalance - parseFloat(amount.toString())
          }
        });
      }
    }

    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('[EXPENSE_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
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

    // Get expense to revert account balances
    const expense = await prismadb.expenseDetail.findUnique({
      where: { id: params.expenseId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!expense) {
      return new NextResponse("Expense not found", { status: 404 });
    }

    // Revert account balance
    if (expense.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: expense.bankAccountId },
        data: { 
          currentBalance: expense.bankAccount!.currentBalance + expense.amount
        }
      });
    } else if (expense.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: expense.cashAccountId },
        data: { 
          currentBalance: expense.cashAccount!.currentBalance + expense.amount
        }
      });
    }

    // Delete the expense
    await prismadb.expenseDetail.delete({
      where: {
        id: params.expenseId
      }
    });

    return NextResponse.json({ message: "Expense deleted successfully" });
  } catch (error) {
    console.error('[EXPENSE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
