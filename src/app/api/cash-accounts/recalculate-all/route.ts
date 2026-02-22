import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prismadb from "@/lib/prismadb";
import { recalculateCashBalance } from "@/lib/cash-balance";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    console.log(`[CASH_ACCOUNTS_RECALCULATE_ALL] Recalculating balances for all cash accounts, requested by user: ${userId}`);
    
    // Get all cash accounts
    const cashAccounts = await prismadb.cashAccount.findMany();
    
    // Recalculate balance for each account
    const results = await Promise.all(
      cashAccounts.map(async (account) => {
        const newBalance = await recalculateCashBalance(account.id);
        return {
          id: account.id,
          accountName: account.accountName,
          newBalance
        };
      })
    );
    
    console.log(`[CASH_ACCOUNTS_RECALCULATE_ALL] Completed recalculation for ${results.length} accounts`);
  
    return NextResponse.json({ 
      success: true, 
      results
    });
  } catch (error) {
    console.log('[CASH_ACCOUNTS_RECALCULATE_ALL]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
