import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { recalculateCashBalance } from "@/lib/cash-balance";

export async function POST(req: Request, props: { params: Promise<{ cashAccountId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.cashAccountId) {
      return new NextResponse("Cash Account ID is required", { status: 400 });
    }

    console.log(`[CASH_ACCOUNT_RECALCULATE] Recalculating balance for cash account: ${params.cashAccountId}, requested by user: ${userId}`);
    
    // Recalculate the balance from scratch
    const newBalance = await recalculateCashBalance(params.cashAccountId);
  
    return NextResponse.json({ 
      success: true, 
      currentBalance: newBalance 
    });
  } catch (error) {
    console.log('[CASH_ACCOUNT_RECALCULATE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
