import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import { recalculateBankBalance } from "@/lib/bank-balance";

export async function GET(
  req: Request,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    if (!params.bankAccountId) {
      return new NextResponse("Bank Account ID is required", { status: 400 });
    }

    const bankAccount = await prismadb.bankAccount.findUnique({
      where: {
        id: params.bankAccountId,
      }
    });
  
    return NextResponse.json(bankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    const { userId } = auth();
    const body = await req.json();

    const { accountName, bankName, accountNumber, ifscCode, branch, openingBalance, isActive } = body;

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!accountName || !bankName || !accountNumber || !ifscCode || !branch) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // First, get the current bank account to check if opening balance has changed
    const currentBankAccount = await prismadb.bankAccount.findUnique({
      where: { id: params.bankAccountId }
    });
    
    if (!currentBankAccount) {
      return new NextResponse("Bank account not found", { status: 404 });
    }

    const newOpeningBalance = parseFloat(openingBalance) || 0;
    
    // Update the bank account
    const bankAccount = await prismadb.bankAccount.update({
      where: {
        id: params.bankAccountId,
      },
      data: {
        accountName,
        bankName,
        accountNumber,
        ifscCode,
        branch,
        openingBalance: newOpeningBalance,
        isActive
        // Don't update currentBalance here, we'll recalculate it
      }
    });
    
    // If opening balance changed, recalculate the current balance
    if (newOpeningBalance !== currentBankAccount.openingBalance) {
      await recalculateBankBalance(params.bankAccountId);
    }
    
    // Get the updated bank account with the correct current balance
    const updatedBankAccount = await prismadb.bankAccount.findUnique({
      where: { id: params.bankAccountId }
    });
  
    return NextResponse.json(updatedBankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const bankAccount = await prismadb.bankAccount.delete({
      where: {
        id: params.bankAccountId,
      }
    });
  
    return NextResponse.json(bankAccount);
  } catch (error) {
    console.log('[BANK_ACCOUNT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
