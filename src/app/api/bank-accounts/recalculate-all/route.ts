import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { recalculateBankBalance } from "@/lib/bank-balance";

export async function POST(req: Request) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    console.log(`[BANK_ACCOUNTS_RECALCULATE_ALL] Recalculating balances for all bank accounts, requested by user: ${userId}`);
    
    // Get all bank accounts
    const bankAccounts = await prismadb.bankAccount.findMany();
    
    // Recalculate balance for each account
    const results = await Promise.all(
      bankAccounts.map(async (account) => {
        const newBalance = await recalculateBankBalance(account.id);
        return {
          id: account.id,
          accountName: account.accountName,
          newBalance
        };
      })
    );
    
    console.log(`[BANK_ACCOUNTS_RECALCULATE_ALL] Completed recalculation for ${results.length} accounts`);
  
    return NextResponse.json({ 
      success: true, 
      results
    });
  } catch (error) {
    console.log('[BANK_ACCOUNTS_RECALCULATE_ALL]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}