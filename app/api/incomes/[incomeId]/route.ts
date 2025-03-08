import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { incomeId: string } }
) {
  try {
    if (!params.incomeId) {
      return new NextResponse("Income ID is required", { status: 400 });
    }

    const income = await prismadb.incomeDetail.findUnique({
      where: {
        id: params.incomeId,
      },
      include: {
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true,
      }
    });

    return NextResponse.json(income);
  } catch (error) {
    console.log('[INCOME_GET]', error);
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

    if (!params.incomeId) {
      return new NextResponse("Income ID is required", { status: 400 });
    }

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

    const incomeDetail = await prismadb.incomeDetail.update({
      where: {
        id: params.incomeId
      },
      data: {
        incomeDate: new Date(incomeDate),
        amount: parseFloat(amount.toString()),
        incomeCategory,
        description,
        tourPackageQueryId: tourPackageQueryId || null,
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      }
    });

    return NextResponse.json(incomeDetail);
  } catch (error) {
    console.log('[INCOME_PATCH]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.incomeId) {
      return new NextResponse("Income ID is required", { status: 400 });
    }

    const incomeDetail = await prismadb.incomeDetail.delete({
      where: {
        id: params.incomeId
      }
    });

    return NextResponse.json(incomeDetail);
  } catch (error) {
    console.log('[INCOME_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
