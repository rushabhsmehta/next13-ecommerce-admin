import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { dateToUtc } from '@/lib/timezone-utils';
import prismadb from '@/lib/prismadb';

export async function PATCH(req: Request, props: { params: Promise<{ tourPackageQueryId: string }> }) {
  const params = await props.params;
  try {
    const { userId } = await auth();
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
      incomeDetails
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
      await prismadb.purchaseItem.deleteMany({
        where: {
          purchaseDetail: {
            tourPackageQueryId: params.tourPackageQueryId
          }
        }
      });
      
      await prismadb.purchaseDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new purchase details
      for (const purchaseDetail of purchaseDetails) {        const createdPurchaseDetail = await prismadb.purchaseDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            supplierId: purchaseDetail.supplierId || null,            purchaseDate: dateToUtc(purchaseDetail.purchaseDate)!,
            billNumber: purchaseDetail.billNumber || null,
            billDate: dateToUtc(purchaseDetail.billDate),
            dueDate: dateToUtc(purchaseDetail.dueDate),
            stateOfSupply: purchaseDetail.stateOfSupply || null,
            referenceNumber: purchaseDetail.referenceNumber || null,
            price: parseFloat(purchaseDetail.price.toString()),
            gstAmount: purchaseDetail.gstAmount ? parseFloat(purchaseDetail.gstAmount.toString()) : null,
            gstPercentage: purchaseDetail.gstPercentage ? parseFloat(purchaseDetail.gstPercentage.toString()) : null,
            description: purchaseDetail.description || null,
            status: purchaseDetail.status || "pending",
          }
        });
        
        // Create purchase items if they exist
        if (purchaseDetail.items && Array.isArray(purchaseDetail.items)) {
          for (const item of purchaseDetail.items) {
            await prismadb.purchaseItem.create({
              data: {
                purchaseDetailId: createdPurchaseDetail.id,
                productName: item.productName,
                description: item.description || null,
                quantity: parseFloat(item.quantity.toString()),
                unitOfMeasureId: item.unitOfMeasureId || null,
                pricePerUnit: parseFloat(item.pricePerUnit.toString()),
                taxSlabId: item.taxSlabId || null,
                taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
                totalAmount: parseFloat(item.totalAmount.toString()),
              }
            });
          }
        }
      }
    }

    // Process Sale Details
    if (saleDetails && Array.isArray(saleDetails)) {
      // Delete existing sale items for this tour package query
      await prismadb.saleItem.deleteMany({
        where: {
          saleDetail: {
            tourPackageQueryId: params.tourPackageQueryId
          }
        }
      });
      
      // Delete existing sale details for this tour package query
      await prismadb.saleDetail.deleteMany({
        where: {
          tourPackageQueryId: params.tourPackageQueryId
        }
      });

      // Create new sale details
      for (const saleDetail of saleDetails) {        const createdSaleDetail = await prismadb.saleDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            customerId: saleDetail.customerId || null,            saleDate: dateToUtc(saleDetail.saleDate)!,
            invoiceNumber: saleDetail.invoiceNumber || null,
            invoiceDate: dateToUtc(saleDetail.invoiceDate),
            dueDate: dateToUtc(saleDetail.dueDate),
            stateOfSupply: saleDetail.stateOfSupply || null,
            salePrice: parseFloat(saleDetail.salePrice.toString()),
            gstAmount: saleDetail.gstAmount ? parseFloat(saleDetail.gstAmount.toString()) : null,
            gstPercentage: saleDetail.gstPercentage ? parseFloat(saleDetail.gstPercentage.toString()) : null,
            description: saleDetail.description || null,
            status: saleDetail.status || "pending"
          }
        });
        
        // Create sale items if they exist
        if (saleDetail.items && Array.isArray(saleDetail.items)) {
          for (const item of saleDetail.items) {
            await prismadb.saleItem.create({
              data: {
                saleDetailId: createdSaleDetail.id,
                productName: item.productName,
                description: item.description || null,
                quantity: parseFloat(item.quantity.toString()),
                unitOfMeasureId: item.unitOfMeasureId || null,
                pricePerUnit: parseFloat(item.pricePerUnit.toString()),
                taxSlabId: item.taxSlabId || null,
                taxAmount: item.taxAmount ? parseFloat(item.taxAmount.toString()) : null,
                totalAmount: parseFloat(item.totalAmount.toString()),
              }
            });
          }
        }
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
      for (const paymentDetail of paymentDetails) {        await prismadb.paymentDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            supplierId: paymentDetail.supplierId || null,
            paymentDate: dateToUtc(paymentDetail.paymentDate)!,
            amount: parseFloat(paymentDetail.amount.toString()),
            method: paymentDetail.method || null,
            transactionId: paymentDetail.transactionId || null,
            note: paymentDetail.note || null,
            bankAccountId: paymentDetail.bankAccountId || null,
            cashAccountId: paymentDetail.cashAccountId || null,
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
      for (const receiptDetail of receiptDetails) {        await prismadb.receiptDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            customerId: receiptDetail.customerId || null,
            receiptDate: dateToUtc(receiptDetail.receiptDate)!,
            amount: parseFloat(receiptDetail.amount.toString()),
            reference: receiptDetail.reference || null,
            note: receiptDetail.note || null,
            bankAccountId: receiptDetail.bankAccountId || null,
            cashAccountId: receiptDetail.cashAccountId || null,
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
      for (const expenseDetail of expenseDetails) {        await prismadb.expenseDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            expenseDate: dateToUtc(expenseDetail.expenseDate)!,
            amount: parseFloat(expenseDetail.amount.toString()),
            expenseCategoryId: expenseDetail.expenseCategoryId || null,
            description: expenseDetail.description || null,
            bankAccountId: expenseDetail.bankAccountId || null,
            cashAccountId: expenseDetail.cashAccountId || null,
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
      for (const incomeDetail of incomeDetails) {        await prismadb.incomeDetail.create({
          data: {
            tourPackageQueryId: params.tourPackageQueryId,
            incomeDate: dateToUtc(incomeDetail.incomeDate)!,
            amount: parseFloat(incomeDetail.amount.toString()),
            incomeCategoryId: incomeDetail.incomeCategoryId || null,
            description: incomeDetail.description || null,
            bankAccountId: incomeDetail.bankAccountId || null,
            cashAccountId: incomeDetail.cashAccountId || null,
          }
        });
      }
    }

    return NextResponse.json({ message: "Accounting details updated successfully" });

  } catch (error) {
    console.error('[TOUR_PACKAGE_QUERY_ACCOUNTING_PATCH]', error);
    return new NextResponse("Internal error", { status: 500 });
  }
}