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
      amount, 
      transferDate, 
      fromAccountType, 
      fromAccountId, 
      toAccountType, 
      toAccountId, 
      reference, 
      description 
    } = body;

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!transferDate) {
      return new NextResponse("Transfer date is required", { status: 400 });
    }

    if (!fromAccountId || !fromAccountType) {
      return new NextResponse("Source account is required", { status: 400 });
    }

    if (!toAccountId || !toAccountType) {
      return new NextResponse("Destination account is required", { status: 400 });
    }

    // Check if source and destination are the same
    if (fromAccountType === toAccountType && fromAccountId === toAccountId) {
      return new NextResponse("Source and destination cannot be the same account", { status: 400 });
    }

    // Check if source account exists and has sufficient balance
    let sourceAccount;
    if (fromAccountType === 'bank') {
      sourceAccount = await prismadb.bankAccount.findUnique({
        where: { id: fromAccountId }
      });
    } else {
      sourceAccount = await prismadb.cashAccount.findUnique({
        where: { id: fromAccountId }
      });
    }

    if (!sourceAccount) {
      return new NextResponse("Source account not found", { status: 404 });
    }

    if (sourceAccount.currentBalance < amount) {
      return new NextResponse("Insufficient funds in source account", { status: 400 });
    }

    // Check if destination account exists
    let destinationAccount;
    if (toAccountType === 'bank') {
      destinationAccount = await prismadb.bankAccount.findUnique({
        where: { id: toAccountId }
      });
    } else {
      destinationAccount = await prismadb.cashAccount.findUnique({
        where: { id: toAccountId }
      });
    }

    if (!destinationAccount) {
      return new NextResponse("Destination account not found", { status: 404 });
    }

    // Create the transfer in a transaction to ensure atomicity
    const transfer = await prismadb.$transaction(async (prisma) => {
      // 1. Create the transfer record
      const transfer = await prisma.transfer.create({
        data: {
          amount: parseFloat(amount.toString()),
          transferDate: new Date(transferDate),
          fromBankAccountId: fromAccountType === 'bank' ? fromAccountId : null,
          fromCashAccountId: fromAccountType === 'cash' ? fromAccountId : null,
          toBankAccountId: toAccountType === 'bank' ? toAccountId : null,
          toCashAccountId: toAccountType === 'cash' ? toAccountId : null,
          reference,
          description,
        }
      });

      // 2. Update the source account balance
      if (fromAccountType === 'bank') {
        await prisma.bankAccount.update({
          where: { id: fromAccountId },
          data: {
            currentBalance: {
              decrement: parseFloat(amount.toString())
            }
          }
        });
      } else {
        await prisma.cashAccount.update({
          where: { id: fromAccountId },
          data: {
            currentBalance: {
              decrement: parseFloat(amount.toString())
            }
          }
        });
      }

      // 3. Update the destination account balance
      if (toAccountType === 'bank') {
        await prisma.bankAccount.update({
          where: { id: toAccountId },
          data: {
            currentBalance: {
              increment: parseFloat(amount.toString())
            }
          }
        });
      } else {
        await prisma.cashAccount.update({
          where: { id: toAccountId },
          data: {
            currentBalance: {
              increment: parseFloat(amount.toString())
            }
          }
        });
      }

      return transfer;
    });

    return NextResponse.json(transfer);
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
