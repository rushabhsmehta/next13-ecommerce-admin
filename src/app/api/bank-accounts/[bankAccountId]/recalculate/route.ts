import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import { recalculateBankBalance } from "@/lib/bank-balance";

export async function POST(
  req: Request,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.bankAccountId) {
      return new NextResponse("Bank Account ID is required", { status: 400 });
    }

    console.log(`[BANK_ACCOUNT_RECALCULATE] Recalculating balance for bank account: ${params.bankAccountId}, requested by user: ${userId}`);
    
    // Recalculate the balance from scratch
    const newBalance = await recalculateBankBalance(params.bankAccountId);
  
    return NextResponse.json({ 
      success: true, 
      currentBalance: newBalance 
    });
  } catch (error) {
    console.log('[BANK_ACCOUNT_RECALCULATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
