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
      supplierId,
      customerId,
      paymentType,
      saleReturnId,
      tourPackageQueryId,
      paymentDate,
      amount,
      method,
      transactionId,
      note,
      bankAccountId,
      cashAccountId,
      images
    } = body;

    // Validate required fields
    if (!paymentDate) {
      return new NextResponse("Payment date is required", { status: 400 });
    }

    if (!amount || amount <= 0) {
      return new NextResponse("Valid amount is required", { status: 400 });
    }

    if (!paymentType) {
      return new NextResponse("Payment type is required", { status: 400 });
    }

    // Validate recipient based on payment type
    if (paymentType === "supplier_payment" && !supplierId) {
      return new NextResponse("Supplier is required for supplier payments", { status: 400 });
    }

    if (paymentType === "customer_refund" && !customerId) {
      return new NextResponse("Customer is required for customer refunds", { status: 400 });
    }

    // Ensure either bank or cash account is selected
    if (!bankAccountId && !cashAccountId) {
      return new NextResponse("Either bank or cash account must be selected", { status: 400 });
    }    // Create payment detail
    const paymentDetail = await prismadb.paymentDetail.create({
      data: {
        supplierId: paymentType === "supplier_payment" ? supplierId : null,
        customerId: paymentType === "customer_refund" ? customerId : null,
        paymentType: paymentType || "supplier_payment",
        saleReturnId: saleReturnId || null,
        tourPackageQueryId: tourPackageQueryId || null,
        paymentDate: dateToUtc(paymentDate)!,
        amount: parseFloat(amount.toString()),
        method: method || null,
        transactionId: transactionId || null,
        note: note || null,
        bankAccountId: bankAccountId || null,
        cashAccountId: cashAccountId || null,
      }
    });
    
    // Create images separately if provided
    if (images && images.length > 0) {
      for (const url of images) {
        await prismadb.images.create({
          data: {
            url,
            paymentDetailsId: paymentDetail.id
          }
        });
      }
    }

    // Update account balance
    // For supplier payments and customer refunds, money goes OUT of the account (decrease balance)
    const balanceChange = parseFloat(amount.toString());
    
    if (bankAccountId) {
      const bankAccount = await prismadb.bankAccount.findUnique({
        where: { id: bankAccountId }
      });
      
      if (bankAccount) {
        await prismadb.bankAccount.update({
          where: { id: bankAccountId },
          data: { 
            currentBalance: bankAccount.currentBalance - balanceChange
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
            currentBalance: cashAccount.currentBalance - balanceChange
          }
        });
      }
    }

    return NextResponse.json(paymentDetail);
  } catch (error) {
    console.error('[PAYMENTS_POST]', error);
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
    const supplierId = searchParams.get('supplierId');
    
    let query: any = {};
    
    if (tourPackageQueryId) {
      query.tourPackageQueryId = tourPackageQueryId;
    }
      if (supplierId) {
      query.supplierId = supplierId;
    }
    
    const payments = await prismadb.paymentDetail.findMany({
      where: query,
      include: {
        supplier: true,
        bankAccount: true,
        cashAccount: true,
        images: true
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('[PAYMENTS_GET]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

