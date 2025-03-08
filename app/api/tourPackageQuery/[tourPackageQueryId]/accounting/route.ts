import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import prismadb from '@/lib/prismadb';

export async function PATCH(
  req: Request,
  { params }: { params: { tourPackageQueryId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { 
      purchaseDetails, 
      saleDetails, 
      paymentDetails, 
      receiptDetails, 
      expenseDetails,
      incomeDetails  // Add income details handling
    } = body;

    if (!params.tourPackageQueryId) {
      return new NextResponse("Tour Package Query id is required", { status: 400 });
    }

    // Check if tour package query exists
    const existingTourPackageQuery = await prismadb.tourPackageQuery.findUnique({
      where: {
        id: params.tourPackageQueryId
      }
    });

    if (!existingTourPackageQuery) {
      return new NextResponse("Tour Package Query not found", { status: 404 });
    }

    // Process Purchase Details
    if (purchaseDetails && Array.isArray(purchaseDetails)) {
      // Delete existing purchase details for this tour package query
      await prismadb.purchaseDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new purchase details
      for (const purchaseDetail of purchaseDetails) {
        await prismadb.purchaseDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            supplierId: purchaseDetail.supplierId,
            purchaseDate: purchaseDetail.purchaseDate,
            price: purchaseDetail.price,
            description: purchaseDetail.description,
          }
        });
      }
    }

    // Process Sale Details
    if (saleDetails && Array.isArray(saleDetails)) {
      // Delete existing sale details for this tour package query
      await prismadb.saleDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new sale details
      for (const saleDetail of saleDetails) {
        await prismadb.saleDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            customerId: saleDetail.customerId,
            saleDate: saleDetail.saleDate,
            salePrice: saleDetail.salePrice,
            description: saleDetail.description,
          }
        });
      }
    }

    // Process Payment Details
    if (paymentDetails && Array.isArray(paymentDetails)) {
      // Delete existing payment details for this tour package query
      await prismadb.paymentDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new payment details
      for (const paymentDetail of paymentDetails) {
        await prismadb.paymentDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            supplierId: paymentDetail.supplierId || null,
            paymentDate: paymentDetail.paymentDate,
            amount: paymentDetail.amount,
            method: paymentDetail.method || null,
            transactionId: paymentDetail.transactionId || null,
            note: paymentDetail.note || null,
            bankAccountId: paymentDetail.accountType === 'bank' ? paymentDetail.accountId : null,
            cashAccountId: paymentDetail.accountType === 'cash' ? paymentDetail.accountId : null,
          }
        });
      }
    }

    // Process Receipt Details
    if (receiptDetails && Array.isArray(receiptDetails)) {
      // Delete existing receipt details for this tour package query
      await prismadb.receiptDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new receipt details
      for (const receiptDetail of receiptDetails) {
        await prismadb.receiptDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            customerId: receiptDetail.customerId || null,
            receiptDate: receiptDetail.receiptDate,
            amount: receiptDetail.amount,
            note: receiptDetail.note || null,
            bankAccountId: receiptDetail.accountType === 'bank' ? receiptDetail.accountId : null,
            cashAccountId: receiptDetail.accountType === 'cash' ? receiptDetail.accountId : null,
          }
        });
      }
    }

    // Process Expense Details
    if (expenseDetails && Array.isArray(expenseDetails)) {
      // Delete existing expense details for this tour package query
      await prismadb.expenseDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new expense details
      for (const expenseDetail of expenseDetails) {
        await prismadb.expenseDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            expenseDate: expenseDetail.expenseDate,
            amount: expenseDetail.amount,
            expenseCategory: expenseDetail.expenseCategory,
            description: expenseDetail.description || null,
            bankAccountId: expenseDetail.accountType === 'bank' ? expenseDetail.accountId : null,
            cashAccountId: expenseDetail.accountType === 'cash' ? expenseDetail.accountId : null,
          }
        });
      }
    }

    // Process Income Details
    if (incomeDetails && Array.isArray(incomeDetails)) {
      // Delete existing income details for this tour package query
      await prismadb.incomeDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new income details
      for (const incomeDetail of incomeDetails) {
        await prismadb.incomeDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            incomeDate: incomeDetail.incomeDate,
            amount: incomeDetail.amount,
            incomeCategory: incomeDetail.incomeCategory,
            description: incomeDetail.description || null,
            bankAccountId: incomeDetail.accountType === 'bank' ? incomeDetail.accountId : null,
            cashAccountId: incomeDetail.accountType === 'cash' ? incomeDetail.accountId : null,
          }
        });
      }
    }

    return new NextResponse("Accounting details updated", { status: 200 });

  } catch (error) {
    console.log('[TOUR_PACKAGE_QUERY_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}