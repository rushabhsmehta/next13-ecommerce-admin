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
      incomeDate,
      amount,
      incomeCategory,
      description,
      tourPackageQueryId,
      accountId,
      accountType 
    } = body;

    if (!incomeDate) {
      return new NextResponse("Income date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!incomeCategory) {
      return new NextResponse("Income category is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      return new NextResponse("Payment account is required", { status: 400 });
    }

    const incomeDetail = await prismadb.incomeDetail.create({
      data: {
        incomeDate: new Date(incomeDate),
        amount: parseFloat(amount.toString()),
        incomeCategory,
        description,
        tourPackageQueryId: tourPackageQueryId || undefined,
        bankAccountId: accountType === 'bank' ? accountId : undefined,
        cashAccountId: accountType === 'cash' ? accountId : undefined,
      }
    });

    return NextResponse.json(incomeDetail);
  } catch (error) {
    console.log('[INCOME_POST]', error);
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
        incomeCategory: category
      };
    }

    if (tourPackageQueryId) {
      whereClause = {
        ...whereClause,
        tourPackageQueryId
      };
    }

    const incomeDetails = await prismadb.incomeDetail.findMany({
      where: whereClause,
      include: {
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true
      },
      orderBy: {
        incomeDate: 'desc'
      }
    });

    return NextResponse.json(incomeDetails);
  } catch (error) {
    console.log('[INCOMES_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
