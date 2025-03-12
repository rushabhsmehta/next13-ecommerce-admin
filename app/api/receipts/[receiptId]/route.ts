import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { receiptId: string } }
) {
  try {
    if (!params.receiptId) {
      return new NextResponse("Receipt ID is required", { status: 400 });
    }

    const receipt = await prismadb.receiptDetail.findUnique({
      where: {
        id: params.receiptId,
      },
      include: {
        customer: true,
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true
      }
    });

    return NextResponse.json(receipt);
  } catch (error) {
    console.log('[RECEIPT_GET]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    const body = await req.json();
    const { 
      receiptDate,
      amount,
      reference,
      note,
      customerId,
      tourPackageQueryId,
      accountId,
      accountType 
    } = body;

    if (!params.receiptId) {
      return new NextResponse("Receipt ID is required", { status: 400 });
    }

    if (!receiptDate) {
      return new NextResponse("Receipt date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      return new NextResponse("Receipt account is required", { status: 400 });
    }

    const receiptDetail = await prismadb.receiptDetail.update({
      where: {
        id: params.receiptId
      },
      data: {
        receiptDate: new Date(receiptDate),
        amount: parseFloat(amount.toString()),
        reference,
        note,
        customerId: customerId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        bankAccountId: accountType === 'bank' ? accountId : null,
        cashAccountId: accountType === 'cash' ? accountId : null,
      }
    });

    return NextResponse.json(receiptDetail);
  } catch (error) {
    console.log('[RECEIPT_PATCH]', error);
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
      return new NextResponse("Unauthenticated", { status: 403 });
    }

    if (!params.receiptId) {
      return new NextResponse("Receipt ID is required", { status: 400 });
    }

    const receiptDetail = await prismadb.receiptDetail.delete({
      where: {
        id: params.receiptId
      }
    });

    return NextResponse.json(receiptDetail);
  } catch (error) {
    console.log('[RECEIPT_DELETE]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
