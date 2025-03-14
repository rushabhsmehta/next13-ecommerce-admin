import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
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

    return NextResponse.json(expenseDetail);
  } catch (error) {
    console.log('[EXPENSE_POST]', error);
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
        cashAccount: true
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
