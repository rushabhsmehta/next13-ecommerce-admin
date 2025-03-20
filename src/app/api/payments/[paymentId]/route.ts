import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    const payment = await prismadb.paymentDetail.findUnique({
      where: {
        id: params.paymentId
      },
      include: {
        supplier: true,
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('[PAYMENT_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    const body = await req.json();
    const { 
      supplierId,
      tourPackageQueryId,
      paymentDate,
      amount,
      method,
      transactionId,
      note,
      bankAccountId,
      cashAccountId
    } = body;

    // Get existing payment to revert account balances
    const existingPayment = await prismadb.paymentDetail.findUnique({
      where: { id: params.paymentId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!existingPayment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Revert previous account balance
    if (existingPayment.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: existingPayment.bankAccountId },
        data: { 
          currentBalance: existingPayment.bankAccount!.currentBalance + existingPayment.amount
        }
      });
    } else if (existingPayment.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: existingPayment.cashAccountId },
        data: { 
          currentBalance: existingPayment.cashAccount!.currentBalance + existingPayment.amount
        }
      });
    }

    // Update payment detail
    const updatedPayment = await prismadb.paymentDetail.update({
      where: {
        id: params.paymentId
      },
      data: {
        supplierId,
        paymentDate: new Date(paymentDate),
        amount: parseFloat(amount.toString()),
        method: method || null,
        transactionId: transactionId || null,
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
            currentBalance: bankAccount.currentBalance - parseFloat(amount.toString())
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
            currentBalance: cashAccount.currentBalance - parseFloat(amount.toString())
          }
        });
      }
    }

    return NextResponse.json(updatedPayment);
  } catch (error) {
    console.error('[PAYMENT_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (!params.paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    // Get payment to revert account balances
    const payment = await prismadb.paymentDetail.findUnique({
      where: { id: params.paymentId },
      include: {
        bankAccount: true,
        cashAccount: true
      }
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    // Revert account balance
    if (payment.bankAccountId) {
      await prismadb.bankAccount.update({
        where: { id: payment.bankAccountId },
        data: { 
          currentBalance: payment.bankAccount!.currentBalance + payment.amount
        }
      });
    } else if (payment.cashAccountId) {
      await prismadb.cashAccount.update({
        where: { id: payment.cashAccountId },
        data: { 
          currentBalance: payment.cashAccount!.currentBalance + payment.amount
        }
      });
    }

    // Delete the payment
    await prismadb.paymentDetail.delete({
      where: {
        id: params.paymentId
      }
    });

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    console.error('[PAYMENT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
