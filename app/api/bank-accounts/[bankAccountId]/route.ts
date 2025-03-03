import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

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
        openingBalance: parseFloat(openingBalance) || 0,
        currentBalance: parseFloat(openingBalance) || 0,
        isActive
      }
    });
  
    return NextResponse.json(bankAccount);
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
