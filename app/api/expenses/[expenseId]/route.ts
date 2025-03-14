import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { expenseId: string } }
) {
  try {
    if (!params.expenseId) {
      console.log('[EXPENSE_GET] Missing expense ID in request');
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    console.log('[EXPENSE_GET] Fetching expense with ID:', params.expenseId);
    const expense = await prismadb.expenseDetail.findUnique({
      where: {
        id: params.expenseId,
      },
      include: {
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true,
        expenseCategory: true,
      }
    });

    if (!expense) {
      console.log('[EXPENSE_GET] Expense not found with ID:', params.expenseId);
      return new NextResponse("Expense not found", { status: 404 });
    }

    console.log('[EXPENSE_GET] Successfully retrieved expense');
    return NextResponse.json(expense);
  } catch (error: any) {
    console.error('[EXPENSE_GET] Error details:', { 
      message: error.message, 
      stack: error.stack,
      expenseId: params.expenseId
    });
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
      console.log('[EXPENSE_PATCH] Unauthorized access attempt');
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { 
      expenseDate,
      amount,
      expenseCategoryId,
      description,
      tourPackageQueryId,
      accountId,
      accountType 
    } = body;

    // Input validation with logging
    if (!params.expenseId) {
      console.log('[EXPENSE_PATCH] Missing expense ID in request');
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    if (!expenseDate) {
      console.log('[EXPENSE_PATCH] Missing required field: expenseDate');
      return new NextResponse("Expense date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      console.log('[EXPENSE_PATCH] Invalid amount:', amount);
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!expenseCategoryId) {
      console.log('[EXPENSE_PATCH] Missing required field: expenseCategoryId');
      return new NextResponse("Expense category is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      console.log('[EXPENSE_PATCH] Missing account information. accountId:', accountId, 'accountType:', accountType);
      return new NextResponse("Payment account is required", { status: 400 });
    }

    // Check if the category exists
    const category = await prismadb.expenseCategory.findUnique({
      where: { id: expenseCategoryId }
    });

    if (!category) {
      console.log('[EXPENSE_PATCH] Invalid expense category ID:', expenseCategoryId);
      return new NextResponse("Invalid expense category", { status: 400 });
    }

    // Verify expense exists before updating
    const existingExpense = await prismadb.expenseDetail.findUnique({
      where: { id: params.expenseId }
    });

    if (!existingExpense) {
      console.log('[EXPENSE_PATCH] Attempt to update non-existent expense with ID:', params.expenseId);
      return new NextResponse("Expense not found", { status: 404 });
    }

    console.log('[EXPENSE_PATCH] Updating expense with ID:', params.expenseId, 'with data:', { 
      expenseDate, 
      amount, 
      expenseCategoryId,
      tourPackageQueryId: tourPackageQueryId || 'none', 
      accountType 
    });

    const expenseDetail = await prismadb.expenseDetail.update({
      where: {
        id: params.expenseId
      },
      data: {
        expenseDate: new Date(expenseDate),
        amount: parseFloat(amount.toString()),
        expenseCategoryId,
        description,
        tourPackageQueryId: tourPackageQueryId || null,
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      }
    });

    console.log('[EXPENSE_PATCH] Successfully updated expense with ID:', params.expenseId);
    return NextResponse.json(expenseDetail);
  } catch (error: any) {
    console.error('[EXPENSE_PATCH] Error details:', { 
      message: error.message, 
      stack: error.stack,
      code: error.code,
      expenseId: params.expenseId
    });
    
    if (error.code === 'P2025') {
      return new NextResponse("Record to update not found.", { status: 404 });
    }
    
    if (error.code === 'P2003') {
      return new NextResponse("Foreign key constraint failed. Invalid related record ID.", { status: 400 });
    }
    
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
      console.log('[EXPENSE_DELETE] Unauthorized access attempt');
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.expenseId) {
      console.log('[EXPENSE_DELETE] Missing expense ID in request');
      return new NextResponse("Expense ID is required", { status: 400 });
    }

    // Verify expense exists before deleting
    const existingExpense = await prismadb.expenseDetail.findUnique({
      where: { id: params.expenseId }
    });

    if (!existingExpense) {
      console.log('[EXPENSE_DELETE] Attempt to delete non-existent expense with ID:', params.expenseId);
      return new NextResponse("Expense not found", { status: 404 });
    }

    console.log('[EXPENSE_DELETE] Deleting expense with ID:', params.expenseId);
    const expenseDetail = await prismadb.expenseDetail.delete({
      where: {
        id: params.expenseId
      }
    });

    console.log('[EXPENSE_DELETE] Successfully deleted expense with ID:', params.expenseId);
    return NextResponse.json(expenseDetail);
  } catch (error: any) {
    console.error('[EXPENSE_DELETE] Error details:', { 
      message: error.message, 
      stack: error.stack,
      code: error.code,
      expenseId: params.expenseId
    });
    
    if (error.code === 'P2025') {
      return new NextResponse("Record to delete not found.", { status: 404 });
    }
    
    if (error.code === 'P2003') {
      return new NextResponse("This expense is referenced by another record and cannot be deleted.", { status: 400 });
    }
    
    return new NextResponse("Internal error", { status: 500 });
  }
}
