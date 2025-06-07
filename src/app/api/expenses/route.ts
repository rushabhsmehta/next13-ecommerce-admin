import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
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

    // Validate required fields
    if (!expenseDate) {
      return new NextResponse("Expense date is required", { status: 400 });
    }

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    // Ensure either bank or cash account is selected
    if (!bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected", { status: 400 });
    }    // Create expense detail
    const expenseDetail = await prismadb.expenseDetail.create({
      data: {        tourPackageQueryId: tourPackageQueryId || null,
        expenseDate: new Date(new Date(expenseDate).toISOString()),
        amount: parseFloat(amount.toString()),
        expenseCategoryId: expenseCategoryId || null,
        description: description || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      }
    });    // Create images separately if provided
    if (images && images.length > 0) {
      for (const url of images) {
        await prismadb.images.create({
          data: {
            url,
            expenseDetailsId: expenseDetail.id
          }
        });
      }
    }

    // Update account balance
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

    return NextResponse.json(expenseDetail);
  } catch (error) {
    console.error('[EXPENSES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const categoryId = searchParams.get('expenseCategoryId');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (categoryId) {
      query.expenseCategoryId = categoryId;
    }    const expenses = await prismadb.expenseDetail.findMany({
      where: query,
      include: {
        expenseCategory: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      },
      orderBy: {
        expenseDate: 'desc'
      }
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('[EXPENSES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

