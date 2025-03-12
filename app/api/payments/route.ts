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

    if (!paymentDate) {
      return new NextResponse("Payment date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      return new NextResponse("Payment account is required", { status: 400 });
    }

    const paymentDetail = await prismadb.paymentDetail.create({
      data: {
        paymentDate: new Date(paymentDate),
        amount: parseFloat(amount.toString()),
        method,
        transactionId,
        note,
        supplierId: supplierId || undefined,
        tourPackageQueryId: tourPackageQueryId || undefined,
        bankAccountId: accountType === 'bank' ? accountId : undefined,
        cashAccountId: accountType === 'cash' ? accountId : undefined,
      }
    });

    return NextResponse.json(paymentDetail);
  } catch (error) {
    console.log('[PAYMENT_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const tourPackageQueryId = searchParams.get("tourPackageQueryId");

    let whereClause = {};
    
    if (supplierId) {
      whereClause = {
        ...whereClause,
        supplierId
      };
    }

    if (tourPackageQueryId) {
      whereClause = {
        ...whereClause,
        tourPackageQueryId
      };
    }

    const paymentDetails = await prismadb.paymentDetail.findMany({
      where: whereClause,
      include: {
        supplier: true,
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    return NextResponse.json(paymentDetails);
  } catch (error) {
    console.log('[PAYMENTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
