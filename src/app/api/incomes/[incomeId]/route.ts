import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.incomeId) {
      return new NextResponse("Income ID is required", { status: 400 });
    }

    const income = await prismadb.incomeDetail.findUnique({
      where: {
        id: params.incomeId
      },
      include: {
        incomeCategory: true,
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!income) {
      return new NextResponse("Income not found", { status: 404 });
    }

    return NextResponse.json(income);
  } catch (error) {
    console.error('[INCOME_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.incomeId) {
      return new NextResponse("Income ID is required", { status: 400 });
    }

    const body = await req.json();
    const { 
      incomeCategoryId,
      tourPackageQueryId,
      incomeDate,
      amount,
      description,
      bankAccountId,
      cashAccountId
    } = body;

    // Get existing income to revert account balances
    const existingIncome = await prismadb.incomeDetail.findUnique({
      where: { id: params.incomeId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!existingIncome) {
      return new NextResponse("Income not found", { status: 404 });
    }

    // Revert previous account balance
    if (existingIncome.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: existingIncome.bankAccountId },
        data: { 
          currentBalance: existingIncome.bankAccount!.currentBalance - existingIncome.amount
        }
      });
    } else if (existingIncome.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: existingIncome.cashAccountId },
        data: { 
          currentBalance: existingIncome.cashAccount!.currentBalance - existingIncome.amount
        }
      });
    }

    // Update income detail
    const updatedIncome = await prismadb.incomeDetail.update({
      where: {
        id: params.incomeId
      },
      data: {        
        incomeDate: new Date(incomeDate),
        amount: parseFloat(amount.toString()),
        incomeCategoryId: incomeCategoryId || null,
        description: description || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
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
            currentBalance: bankAccount.currentBalance + parseFloat(amount.toString())
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
            currentBalance: cashAccount.currentBalance + parseFloat(amount.toString())
          }
        });
      }
    }

    return NextResponse.json(updatedIncome);
  } catch (error) {
    console.error('[INCOME_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.incomeId) {
      return new NextResponse("Income ID is required", { status: 400 });
    }

    // Get income to revert account balances
    const income = await prismadb.incomeDetail.findUnique({
      where: { id: params.incomeId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!income) {
      return new NextResponse("Income not found", { status: 404 });
    }

    // Revert account balance
    if (income.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: income.bankAccountId },
        data: { 
          currentBalance: income.bankAccount!.currentBalance - income.amount
        }
      });
    } else if (income.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: income.cashAccountId },
        data: { 
          currentBalance: income.cashAccount!.currentBalance - income.amount
        }
      });
    }

    // Delete the income
    await prismadb.incomeDetail.delete({
      where: {
        id: params.incomeId
      }
    });

    return NextResponse.json({ message: "Income deleted successfully" });
  } catch (error) {
    console.error('[INCOME_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
