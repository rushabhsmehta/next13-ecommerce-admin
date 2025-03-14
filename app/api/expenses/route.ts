import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      console.log('[EXPENSE_POST] Unauthorized access attempt');
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
    if (!expenseDate) {
      console.log('[EXPENSE_POST] Missing required field: expenseDate');
      return new NextResponse("Expense date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      console.log('[EXPENSE_POST] Invalid amount:', amount);
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!expenseCategoryId) {
      console.log('[EXPENSE_POST] Missing required field: expenseCategoryId');
      return new NextResponse("Expense category is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      console.log('[EXPENSE_POST] Missing account information. accountId:', accountId, 'accountType:', accountType);
      return new NextResponse("Payment account is required", { status: 400 });
    }

    // Check if the category exists
    const category = await prismadb.expenseCategory.findUnique({
      where: { id: expenseCategoryId }
    });

    if (!category) {
      console.log('[EXPENSE_POST] Invalid expense category ID:', expenseCategoryId);
      return new NextResponse("Invalid expense category", { status: 400 });
    }

    console.log('[EXPENSE_POST] Creating expense with data:', { 
      expenseDate, 
      amount, 
      expenseCategoryId, 
      tourPackageQueryId: tourPackageQueryId || 'none', 
      accountType 
    });

    const expenseDetail = await prismadb.expenseDetail.create({
      data: {
        expenseDate: new Date(expenseDate),
        amount: parseFloat(amount.toString()),
        expenseCategoryId,
        description,
        tourPackageQueryId: tourPackageQueryId || undefined, // This is now optional
        bankAccountId: accountType === 'bank' ? accountId : undefined,
        cashAccountId: accountType === 'cash' ? accountId : undefined,
      }
    });

    console.log('[EXPENSE_POST] Successfully created expense with ID:', expenseDetail.id);
    return NextResponse.json(expenseDetail);
  } catch (error: any) {
    console.error('[EXPENSE_POST] Error details:', { 
      message: error.message, 
      stack: error.stack,
      code: error.code
    });
    
    if (error.code === 'P2003') {
      return new NextResponse("Foreign key constraint failed. Invalid related record ID.", { status: 400 });
    }
    
    if (error.code === 'P2002') {
      return new NextResponse("A unique constraint would be violated.", { status: 400 });
    }
    
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const tourPackageQueryId = searchParams.get("tourPackageQueryId");

    let whereClause = {};
    
    if (category) {
      whereClause = {
        ...whereClause,
        expenseCategory: category
      };
    }

    if (tourPackageQueryId) {
      whereClause = {
        ...whereClause,
        tourPackageQueryId
      };
    }

    const expenseDetails = await prismadb.expenseDetail.findMany({
      where: whereClause,
      include: {
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true,
        expenseCategory: true  // Add this to include the category relation
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });

    return NextResponse.json(expenseDetails);
  } catch (error) {
    console.log('[EXPENSES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
