import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { transferId: string } }
) {
  try {
    const { transferId } = params;

    if (!transferId) {
      return new NextResponse("Transfer ID is required", { status: 400 });
    }

    const transfer = await prismadb.transfer.findUnique({
      where: {
        id: transferId,
      },
      include: {
        fromBankAccount: true,
        fromCashAccount: true,
        toBankAccount: true,
        toCashAccount: true,
      },
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.log('[TRANSFER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { transferId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const { transferId } = params;
    if (!transferId) {
      return new NextResponse("Transfer ID is required", { status: 400 });
    }

    // First get the transfer details to revert the balances
    const transfer = await prismadb.transfer.findUnique({
      where: {
        id: transferId,
      }
    });

    if (!transfer) {
      return new NextResponse("Transfer not found", { status: 404 });
    }

    // Use a transaction to ensure atomicity when reverting balances
    await prismadb.$transaction(async (prisma) => {
      // 1. Revert source account balance (add the amount back)
      if (transfer.fromBankAccountId) {
        await prisma.bankAccount.update({
          where: { id: transfer.fromBankAccountId },
          data: {
            currentBalance: {
              increment: transfer.amount
            }
          }
        });
      } else if (transfer.fromCashAccountId) {
        await prisma.cashAccount.update({
          where: { id: transfer.fromCashAccountId },
          data: {
            currentBalance: {
              increment: transfer.amount
            }
          }
        });
      }

      // 2. Revert destination account balance (subtract the amount)
      if (transfer.toBankAccountId) {
        await prisma.bankAccount.update({
          where: { id: transfer.toBankAccountId },
          data: {
            currentBalance: {
              decrement: transfer.amount
            }
          }
        });
      } else if (transfer.toCashAccountId) {
        await prisma.cashAccount.update({
          where: { id: transfer.toCashAccountId },
          data: {
            currentBalance: {
              decrement: transfer.amount
            }
          }
        });
      }

      // 3. Delete the transfer record
      await prisma.transfer.delete({
        where: {
          id: transferId
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log('[TRANSFER_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
