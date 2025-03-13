import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  try {
    if (!params.expenseId) {
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    const expense = await prismadb.expenseDetail.findUnique({
      where: {
        id: params.expenseId,
      },
      include: {
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true,
        expenseCategory: true, // Updated relation name
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.log('[EXPENSE_GET]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { 
      expenseDate,
      amount,
      expenseCategoryId, // Category ID for the relation
      description,
      tourPackageQueryId,
      accountId,
      accountType 
    } = body;

    if (!params.expenseId) {
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    if (!expenseDate) {
      return new NextResponse("Expense date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!expenseCategoryId) {
      return new NextResponse("Expense category is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      return new NextResponse("Payment account is required", { status: 400 });
    }

    // Check if the category exists
    const category = await prismadb.expenseCategory.findUnique({
      where: { id: expenseCategoryId }
    });

    if (!category) {
      return new NextResponse("Invalid expense category", { status: 400 });
    }

    const expenseDetail = await prismadb.expenseDetail.update({
      where: {
        id: params.expenseId
      },
      data: {
        expenseDate: new Date(expenseDate),
        amount: parseFloat(amount.toString()),
        expenseCategoryId, // Store only the relation via ID
        description,
        tourPackageQueryId: tourPackageQueryId || null,
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      }
    });

    return NextResponse.json(expenseDetail);
  } catch (error) {
    console.log('[EXPENSE_PATCH]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.expenseId) {
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    const expenseDetail = await prismadb.expenseDetail.delete({
      where: {
        id: params.expenseId
      }
    });

    return NextResponse.json(expenseDetail);
  } catch (error) {
    console.log('[EXPENSE_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
