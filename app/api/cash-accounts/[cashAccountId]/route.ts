import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { cashAccountId: string } }
) {
  try {
    if (!params.cashAccountId) {
      return new NextResponse("Cash Account ID is required", { status: 400 });
    }

    const cashAccount = await prismadb.cashAccount.findUnique({
      where: {
        id: params.cashAccountId,
      }
    });
  
    return NextResponse.json(cashAccount);
  } catch (error) {
    console.log('[CASH_ACCOUNT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { cashAccountId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { accountName, openingBalance, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!accountName) {
      return new NextResponse("Account name is required", { status: 400 });
    }

    const cashAccount = await prismadb.cashAccount.update({
      where: {
        id: params.cashAccountId,
      },
      data: {
        accountName,
        openingBalance: parseFloat(openingBalance) || 0,
        currentBalance: parseFloat(openingBalance) || 0,
        isActive
      }
    });
  
    return NextResponse.json(cashAccount);
  } catch (error) {
    console.log('[CASH_ACCOUNT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { cashAccountId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const cashAccount = await prismadb.cashAccount.delete({
      where: {
        id: params.cashAccountId,
      }
    });
  
    return NextResponse.json(cashAccount);
  } catch (error) {
    console.log('[CASH_ACCOUNT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
