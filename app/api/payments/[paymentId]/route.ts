import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { paymentId: string } }
) {
  try {
    if (!params.paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    const payment = await prismadb.paymentDetail.findUnique({
      where: {
        id: params.paymentId,
      },
      include: {
        supplier: true,
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true
      }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.log('[PAYMENT_GET]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { 
      paymentDate,
      amount,
      method,
      transactionId,
      note,
      supplierId,
      tourPackageQueryId,
      accountId,
      accountType 
    } = body;

    if (!params.paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    if (!paymentDate) {
      return new NextResponse("Payment date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      return new NextResponse("Payment account is required", { status: 400 });
    }

    const paymentDetail = await prismadb.paymentDetail.update({
      where: {
        id: params.paymentId
      },
      data: {
        paymentDate: new Date(paymentDate),
        amount: parseFloat(amount.toString()),
        method,
        transactionId,
        note,
        supplierId: supplierId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      }
    });

    return NextResponse.json(paymentDetail);
  } catch (error) {
    console.log('[PAYMENT_PATCH]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.paymentId) {
      return new NextResponse("Payment ID is required", { status: 400 });
    }

    const paymentDetail = await prismadb.paymentDetail.delete({
      where: {
        id: params.paymentId
      }
    });

    return NextResponse.json(paymentDetail);
  } catch (error) {
    console.log('[PAYMENT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
