import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';
import { requireFinanceOrAdmin } from '@/lib/authz';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);
    const body = await req.json();
    const { 
      incomeCategoryId,
      tourPackageQueryId,
      incomeDate,
      amount,
      description,
      bankAccountId,
      cashAccountId,
      images
    } = body;

    // Validate required fields
    if (!incomeDate) {
      return new NextResponse("Income date is required", { status: 400 });
    }

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    // Ensure either bank or cash account is selected
    if (!bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected", { status: 400 });
    }    // Create income detail
    const incomeDetail = await prismadb.incomeDetail.create({
      data: {
        tourPackageQueryId: tourPackageQueryId || null,
        incomeDate: dateToUtc(incomeDate)!,
        amount: parseFloat(amount.toString()),
        incomeCategoryId: incomeCategoryId || null,
        description: description || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      }
    });

    // Create images separately if provided
    if (images && images.length > 0) {
      for (const url of images) {
        await prismadb.images.create({
          data: {
            url,
            incomeDetailsId: incomeDetail.id
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

    return NextResponse.json(incomeDetail);
  } catch (error) {
    console.error('[INCOMES_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    await requireFinanceOrAdmin(userId);

    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const categoryId = searchParams.get('incomeCategoryId');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (categoryId) {
      query.incomeCategoryId = categoryId;
    }    const incomes = await prismadb.incomeDetail.findMany({
      where: query,
      include: {
        incomeCategory: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      },
      orderBy: {
        incomeDate: 'desc'
      }
    });

    return NextResponse.json(incomes);
  } catch (error) {
    console.error('[INCOMES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

