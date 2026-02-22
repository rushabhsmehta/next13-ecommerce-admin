import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { accountName, openingBalance } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!accountName) {
      return new NextResponse("Account name is required", { status: 400 });
    }

    const cashAccount = await prismadb.cashAccount.create({
      data: {
        accountName,
        openingBalance: parseFloat(openingBalance) || 0,
        currentBalance: parseFloat(openingBalance) || 0,
      }
    });
  
    return NextResponse.json(cashAccount);
  } catch (error) {
    console.log('[CASH_ACCOUNTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cashAccounts = await prismadb.cashAccount.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  
    return NextResponse.json(cashAccounts);
  } catch (error) {
    console.log('[CASH_ACCOUNTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

