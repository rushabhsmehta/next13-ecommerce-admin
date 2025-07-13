import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';
import { dateToUtc } from '@/lib/timezone-utils';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();    const { 
      customerId,
      supplierId,
      receiptType,
      purchaseReturnId,
      tourPackageQueryId,
      receiptDate,
      amount,
      reference,
      note,
      bankAccountId,
      cashAccountId,
      images
    } = body;

    // Validate required fields
    if (!receiptDate) {
      return new NextResponse("Receipt date is required", { status: 400 });
    }

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!receiptType) {
      return new NextResponse("Receipt type is required", { status: 400 });
    }

    // Validate sender based on receipt type
    if (receiptType === "customer_payment" && !customerId) {
      return new NextResponse("Customer is required for customer payments", { status: 400 });
    }

    if (receiptType === "supplier_refund" && !supplierId) {
      return new NextResponse("Supplier is required for supplier refunds", { status: 400 });
    }

    // Ensure either bank or cash account is selected
    if (!bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected", { status: 400 });
    }    // Create receipt detail with images
    const receiptDetail = await prismadb.receiptDetail.create({
      data: {
        customerId: receiptType === "customer_payment" ? customerId : null,
        supplierId: receiptType === "supplier_refund" ? supplierId : null,
        receiptType: receiptType || "customer_payment",
        purchaseReturnId: purchaseReturnId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        receiptDate: dateToUtc(receiptDate)!,
        amount: parseFloat(amount.toString()),
        reference: reference || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
        // Create images if provided
        ...(images && images.length > 0
          ? {
              images: {
                create: images.map((url: string) => ({ url })),
              },
            }
          : {}),
      },
      include: {
        images: true,
      }
    });
      // Create images separately if provided
    if (images && images.length > 0) {
      for (const url of images) {
        await prismadb.images.create({
          data: {
            url,
            receiptDetailsId: receiptDetail.id
          }
        });
      }
    }

    // Update account balance
    // For customer payments and supplier refunds, money comes INTO the account (increase balance)
    const balanceChange = parseFloat(amount.toString());
    
    if (bankAccountId) {
      const bankAccount = await prismadb.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      
      if (bankAccount) {
        await prismadb.bankAccount.update({
          where: { id: bankAccountId },
          data: { 
            currentBalance: bankAccount.currentBalance + balanceChange
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
            currentBalance: cashAccount.currentBalance + balanceChange
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
    }    const receipts = await prismadb.receiptDetail.findMany({
      where: query,
      include: {
        customer: true,
        bankAccount: true,
        cashAccount: true,
        images: true
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

