import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { recalculateCashBalance } from "@/lib/cash-balance";

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

    // First, get the current cash account to check if opening balance has changed
    const currentCashAccount = await prismadb.cashAccount.findUnique({
      where: { id: params.cashAccountId }
    });
    
    if (!currentCashAccount) {
      return new NextResponse("Cash account not found", { status: 404 });
    }

    const newOpeningBalance = parseFloat(openingBalance) || 0;
    
    console.log(`[CASH_ACCOUNT_PATCH] Updating cash account: ${currentCashAccount.accountName} (${params.cashAccountId})`);
    console.log(`[CASH_ACCOUNT_PATCH] Current opening balance: ${currentCashAccount.openingBalance}, new opening balance: ${newOpeningBalance}`);
    console.log(`[CASH_ACCOUNT_PATCH] Current current balance: ${currentCashAccount.currentBalance}`);
    
    // Update the cash account
    const cashAccount = await prismadb.cashAccount.update({
      where: {
        id: params.cashAccountId,
      },
      data: {
        accountName,
        openingBalance: newOpeningBalance,
        isActive
        // Don't update currentBalance here, we'll recalculate it
      }
    });
    
    // If opening balance changed, recalculate the current balance
    if (newOpeningBalance !== currentCashAccount.openingBalance) {
      console.log(`[CASH_ACCOUNT_PATCH] Opening balance changed from ${currentCashAccount.openingBalance} to ${newOpeningBalance}. Recalculating current balance...`);
      await recalculateCashBalance(params.cashAccountId);
    } else {
      console.log(`[CASH_ACCOUNT_PATCH] Opening balance unchanged. No recalculation needed.`);
    }
    
    // Get the updated cash account with the correct current balance
    const updatedCashAccount = await prismadb.cashAccount.findUnique({
      where: { id: params.cashAccountId }
    });
    
    console.log(`[CASH_ACCOUNT_PATCH] Update complete. New current balance: ${updatedCashAccount?.currentBalance}`);
  
    return NextResponse.json(updatedCashAccount);
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
