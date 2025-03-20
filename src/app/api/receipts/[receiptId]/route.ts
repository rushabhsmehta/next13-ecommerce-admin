import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { receiptId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.receiptId) {
      return new NextResponse("Receipt ID is required", { status: 400 });
    }

    const receipt = await prismadb.receiptDetail.findUnique({
      where: {
        id: params.receiptId
      },
      include: {
        customer: true,
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!receipt) {
      return new NextResponse("Receipt not found", { status: 404 });
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error('[RECEIPT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { receiptId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.receiptId) {
      return new NextResponse("Receipt ID is required", { status: 400 });
    }

    const body = await req.json();
    const {
      customerId,
      tourPackageQueryId,
      receiptDate,
      amount,
      reference,
      note,
      bankAccountId,
      cashAccountId
    } = body;

    // Get existing receipt to revert account balances
    const existingReceipt = await prismadb.receiptDetail.findUnique({
      where: { id: params.receiptId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!existingReceipt) {
      return new NextResponse("Receipt not found", { status: 404 });
    }

    // Revert previous account balance
    if (existingReceipt.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: existingReceipt.bankAccountId },
        data: {
          currentBalance: existingReceipt.bankAccount!.currentBalance - existingReceipt.amount
        }
      });
    } else if (existingReceipt.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: existingReceipt.cashAccountId },
        data: {
          currentBalance: existingReceipt.cashAccount!.currentBalance - existingReceipt.amount
        }
      });
    }

    // Update receipt detail
    const updatedReceipt = await prismadb.receiptDetail.update({
      where: {
        id: params.receiptId
      },
      data: {
        customerId,
        receiptDate: new Date(receiptDate),
        amount: parseFloat(amount.toString()),
        reference: reference || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      }
    });

    // Update new account balance
    if (bankAccountId) {
      const bankAccount = await prismadb.bankAccount.findUnique({
        where: { id: bankAccountId }
      });

      if (bankAccount) {
        await prismadb.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: bankAccount.currentBalance + parseFloat(amount.toString())
          }
        });
      }
    } else if (cashAccountId) {
      const cashAccount = await prismadb.cashAccount.findUnique({
        where: { id: cashAccountId }
      });

      if (cashAccount) {
        await prismadb.cashAccount.update({
          where: { id: cashAccountId },
          data: {
            currentBalance: cashAccount.currentBalance + parseFloat(amount.toString())
          }
        });
      }
    }

    return NextResponse.json(updatedReceipt);
  } catch (error) {
    console.error('[RECEIPT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { receiptId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.receiptId) {
      return new NextResponse("Receipt ID is required", { status: 400 });
    }

    // Get receipt to revert account balances
    const receipt = await prismadb.receiptDetail.findUnique({
      where: { id: params.receiptId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!receipt) {
      return new NextResponse("Receipt not found", { status: 404 });
    }

    // Revert account balance
    if (receipt.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: receipt.bankAccountId },
        data: {
          currentBalance: receipt.bankAccount!.currentBalance - receipt.amount
        }
      });
    } else if (receipt.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: receipt.cashAccountId },
        data: {
          currentBalance: receipt.cashAccount!.currentBalance - receipt.amount
        }
      });
    }

    // Delete the receipt
    await prismadb.receiptDetail.delete({
      where: {
        id: params.receiptId
      }
    });

    return NextResponse.json({ message: "Receipt deleted successfully" });
  } catch (error) {
    console.error('[RECEIPT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
