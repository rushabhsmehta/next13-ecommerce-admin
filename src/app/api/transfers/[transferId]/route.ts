import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";

export async function GET(
  req: Request,
  { params }: { params: { transferId: string } }
) {
  try {
    if (!params.transferId) {
      return new NextResponse("Transfer ID is required", { status: 400 });
    }

    const transfer = await prismadb.transfer.findUnique({
      where: {
        id: params.transferId,
      },
      include: {
        fromBankAccount: true,
        fromCashAccount: true,
        toBankAccount: true,
        toCashAccount: true
      }
    });

    return NextResponse.json(transfer);
  } catch (error) {
    console.log('[TRANSFER_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { transferId: string } }
) {
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

    if (!params.transferId) {
      return new NextResponse("Transfer ID is required", { status: 400 });
    }

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

    const transferDetail = await prismadb.transfer.update({
      where: {
        id: params.transferId
      },
      data: {
        transferDate: new Date(transferDate),
        amount: parseFloat(amount.toString()),
        reference,
        description,
        fromBankAccountId: fromAccountType === 'bank' ? fromAccountId : null,
        fromCashAccountId: fromAccountType === 'cash' ? fromAccountId : null,
        toBankAccountId: toAccountType === 'bank' ? toAccountId : null,
        toCashAccountId: toAccountType === 'cash' ? toAccountId : null,
      }
    });

    return NextResponse.json(transferDetail);
  } catch (error: any) {
    console.error("[TRANSFER_PATCH]", error);
    return new Response(
      JSON.stringify({
        message: error.message || "Failed to update transfer",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }), 
      { status: 500 }
    );
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

    if (!params.transferId) {
      return new NextResponse("Transfer ID is required", { status: 400 });
    }

    const transfer = await prismadb.transfer.delete({
      where: {
        id: params.transferId
      }
    });

    return NextResponse.json(transfer);
  } catch (error: any) {
    console.error("[TRANSFER_DELETE]", error);
    return new Response(
      JSON.stringify({
        message: error.message || "Failed to delete transfer",
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }), 
      { status: 500 }
    );
  }
}
