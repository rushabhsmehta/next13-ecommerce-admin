import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { 
      transferDate,
      amount,
      reference,
      description,
      fromAccountType,
      fromAccountId,
      toAccountType,
      toAccountId 
    } = body;

    if (!transferDate) {
      return new NextResponse("Transfer date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!fromAccountType || !fromAccountId) {
      return new NextResponse("Source account is required", { status: 400 });
    }

    if (!toAccountType || !toAccountId) {
      return new NextResponse("Destination account is required", { status: 400 });
    }

    // Cannot transfer to the same account
    if (fromAccountType === toAccountType && fromAccountId === toAccountId) {
      return new NextResponse("Cannot transfer to the same account", { status: 400 });
    }

    const transferDetail = await prismadb.transfer.create({
      data: {
        transferDate: new Date(transferDate),
        amount: parseFloat(amount.toString()),
        reference,
        description,
        fromBankAccountId: fromAccountType === 'bank' ? fromAccountId : undefined,
        fromCashAccountId: fromAccountType === 'cash' ? fromAccountId : undefined,
        toBankAccountId: toAccountType === 'bank' ? toAccountId : undefined,
        toCashAccountId: toAccountType === 'cash' ? toAccountId : undefined,
      }
    });

    return NextResponse.json(transferDetail);
  } catch (error) {
    console.log('[TRANSFER_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const transfers = await prismadb.transfer.findMany({
      include: {
        fromBankAccount: true,
        fromCashAccount: true,
        toBankAccount: true,
        toCashAccount: true
      },
      orderBy: {
        transferDate: 'desc'
      }
    });

    return NextResponse.json(transfers);
  } catch (error) {
    console.log('[TRANSFERS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
