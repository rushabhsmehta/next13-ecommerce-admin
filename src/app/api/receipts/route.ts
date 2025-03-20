import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
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

    // Validate required fields
    if (!receiptDate) {
      return new NextResponse("Receipt date is required", { status: 400 });
    }

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    // Ensure either bank or cash account is selected
    if (!bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected", { status: 400 });
    }

    // Create receipt detail
    const receiptDetail = await prismadb.receiptDetail.create({
      data: {
        customerId: customerId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        receiptDate: new Date(receiptDate),
        amount: parseFloat(amount.toString()),
        reference: reference || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      }
    });

    // Update account balance
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

    return NextResponse.json(receiptDetail);
  } catch (error) {
    console.error('[RECEIPTS_POST]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tourPackageQueryId = searchParams.get('tourPackageQueryId');
    const customerId = searchParams.get('customerId');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
    
    if (customerId) {
      query.customerId = customerId;
    }

    const receipts = await prismadb.receiptDetail.findMany({
      where: query,
      include: {
        customer: true,
        bankAccount: true,
        cashAccount: true
      },
      orderBy: {
        receiptDate: 'desc'
      }
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error('[RECEIPTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

