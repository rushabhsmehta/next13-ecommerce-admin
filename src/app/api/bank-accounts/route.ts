import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    const body = await req.json();

    const { accountName, bankName, accountNumber, ifscCode, branch, openingBalance } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!accountName || !bankName || !accountNumber || !ifscCode || !branch) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const parsedOpeningBalance = parseFloat(openingBalance) || 0;
    
    console.log(`[BANK_ACCOUNTS_POST] Creating bank account: ${accountName} with opening balance: ${parsedOpeningBalance}`);

    const bankAccount = await prismadb.bankAccount.create({
      data: {
        accountName,
        bankName,
        accountNumber,
        ifscCode,
        branch,
        openingBalance: parsedOpeningBalance,
        currentBalance: parsedOpeningBalance,
      }
    });
    
    console.log(`[BANK_ACCOUNTS_POST] Bank account created: ${bankAccount.id} with current balance: ${bankAccount.currentBalance}`);
  
    return NextResponse.json(bankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const bankAccounts = await prismadb.bankAccount.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  
    return NextResponse.json(bankAccounts);
  } catch (error) {
    console.log('[BANK_ACCOUNTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

