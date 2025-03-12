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
      receiptDate,
      amount,
      reference,
      note,
      customerId,
      tourPackageQueryId,
      accountId,
      accountType 
    } = body;

    if (!receiptDate) {
      return new NextResponse("Receipt date is required", { status: 400 });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!accountId || !accountType) {
      return new NextResponse("Receipt account is required", { status: 400 });
    }

    const receiptDetail = await prismadb.receiptDetail.create({
      data: {
        receiptDate: new Date(receiptDate),
        amount: parseFloat(amount.toString()),
        reference,
        note,
        customerId: customerId || undefined,
        tourPackageQueryId: tourPackageQueryId || undefined,
        bankAccountId: accountType === 'bank' ? accountId : undefined,
        cashAccountId: accountType === 'cash' ? accountId : undefined,
      }
    });

    return NextResponse.json(receiptDetail);
  } catch (error) {
    console.log('[RECEIPT_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const tourPackageQueryId = searchParams.get("tourPackageQueryId");

    let whereClause = {};
    
    if (customerId) {
      whereClause = {
        ...whereClause,
        customerId
      };
    }

    if (tourPackageQueryId) {
      whereClause = {
        ...whereClause,
        tourPackageQueryId
      };
    }

    const receiptDetails = await prismadb.receiptDetail.findMany({
      where: whereClause,
      include: {
        customer: true,
        tourPackageQuery: true,
        bankAccount: true,
        cashAccount: true
      },
      orderBy: {
        receiptDate: 'desc'
      }
    });

    return NextResponse.json(receiptDetails);
  } catch (error) {
    console.log('[RECEIPTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
