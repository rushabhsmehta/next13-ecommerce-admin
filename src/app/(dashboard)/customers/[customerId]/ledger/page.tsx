import prismadb from "@/lib/prismadb";
import { SaleDetail, ReceiptDetail, TourPackageQuery, SaleItem, SaleReturn } from "@prisma/client"; // Add SaleReturn to imports
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CustomerIndividualLedgerClient } from "./components/client";
import { notFound } from "next/navigation";

interface CustomerLedgerPageProps {
  params: {
    customerId: string;
  };
}


const CustomerLedgerPage = async ({ params }: CustomerLedgerPageProps) => {
  // Get customer details
  const customer = await prismadb.customer.findUnique({
    where: {
      id: params.customerId,
    },
  });

  if (!customer) {
    return notFound();
  }
  // Get all sales for this customer
  const sales = await prismadb.saleDetail.findMany({
    where: {
      customerId: params.customerId,
    },
    include: {
      tourPackageQuery: true,
      items: true, // Include items for displaying in transaction history
      saleReturns: {  // Include sale returns for this sale
        include: {
          items: true
        }
      }
    },
    orderBy: {
      saleDate: 'asc',
    },
  });

  // Get all receipts for this customer
  const receipts = await prismadb.receiptDetail.findMany({
    where: {
      customerId: params.customerId,
    },
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true,
    },
    orderBy: {
      receiptDate: 'asc',
    },  });  // Format transactions for display with proper typing
  const formattedSales = sales.map((sale) => {
    // Calculate total including GST for each sale
    const gstAmount = sale.gstAmount || 0;
    const totalAmount = sale.salePrice + gstAmount;
    
    // Format items for display if they exist
    let formattedItems: Array<{
      productName: string;
      quantity: number;
      pricePerUnit: number;
      totalAmount: number;
    }> = [];
    let itemsSummary = "";
    
    if (sale.items && sale.items.length > 0) {
      formattedItems = sale.items.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
        totalAmount: item.totalAmount
      }));
      
      itemsSummary = sale.items.map(item => 
        `${item.productName} (${item.quantity})`
      ).join(", ");
    }
      return {
      id: sale.id,
      date: sale.saleDate,
      type: "Sale",
      description: sale.tourPackageQuery?.tourPackageQueryName 
        ? `Sale for ${sale.tourPackageQuery.tourPackageQueryName}` 
        : `Sale Invoice ${sale.invoiceNumber || '#' + sale.id.substring(0, 8)}`,
      debit: totalAmount,
      credit: 0,
      balance: 0, // Will be calculated later
      status: sale.status,
      isInflow: false,
      amount: totalAmount, // Include GST in the amount
      baseAmount: sale.salePrice,
      gstAmount: gstAmount,
      reference: sale.invoiceNumber || '', // Add the missing reference property 
      packageId: sale.tourPackageQueryId,
      packageName: sale.tourPackageQuery?.tourPackageQueryName || undefined, // Convert null to undefined
      items: formattedItems,
      itemsSummary: itemsSummary
    };
  });

  // Format sale returns as transactions
  const formattedSaleReturns = sales.flatMap((sale) => {
    if (!sale.saleReturns || sale.saleReturns.length === 0) return [];
    
    return sale.saleReturns.map((saleReturn) => {
      const returnGstAmount = saleReturn.gstAmount || 0;
      const totalReturnAmount = saleReturn.amount + returnGstAmount;
      
      // Format return items for display if they exist
      let itemsSummary = "";
      if (saleReturn.items && saleReturn.items.length > 0) {
        itemsSummary = saleReturn.items.map(item => 
          `${item.productName} (${item.quantity})`
        ).join(", ");
      }
        return {
        id: saleReturn.id,
        date: saleReturn.returnDate,
        type: "Sale Return",
        description: sale.tourPackageQuery?.tourPackageQueryName 
          ? `Return for ${sale.tourPackageQuery.tourPackageQueryName}` 
          : `Return ${saleReturn.reference || '#' + saleReturn.id.substring(0, 8)} for Invoice ${sale.invoiceNumber || '#' + sale.id.substring(0, 8)}`,
        debit: 0,
        credit: totalReturnAmount, // Return reduces the customer balance
        balance: 0, // Will be calculated later
        status: saleReturn.status,
        isInflow: true, // Returns decrease customer balance (like receipts)
        amount: totalReturnAmount,
        baseAmount: saleReturn.amount,
        gstAmount: returnGstAmount,
        reference: saleReturn.reference || '', 
        packageId: sale.tourPackageQueryId,
        packageName: sale.tourPackageQuery?.tourPackageQueryName || undefined,
        itemsSummary: itemsSummary
      };
    });
  });
  const formattedReceipts = receipts.map((receipt) => ({
    id: receipt.id,
    date: receipt.receiptDate,
    type: "Receipt",
    description: receipt.tourPackageQuery?.tourPackageQueryName 
      ? `Payment for ${receipt.tourPackageQuery.tourPackageQueryName}` 
      : `Receipt ${receipt.reference || '#' + receipt.id.substring(0, 8)}`,
    debit: 0,
    credit: receipt.amount,
    balance: 0, // Will be calculated later
    status: "completed",
    isInflow: true,
    amount: receipt.amount,
    reference: receipt.reference || '', // Add the missing reference property
    packageId: receipt.tourPackageQueryId,
    packageName: receipt.tourPackageQuery?.tourPackageQueryName || undefined, // Use undefined instead of null
  }));

  // Combine transactions and sort by date
  const allTransactions = [...formattedSales, ...formattedSaleReturns, ...formattedReceipts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate opening balance and running balance
  let runningBalance = 0;
  const transactions = allTransactions.map(transaction => {
    if (transaction.isInflow) {
      runningBalance -= transaction.amount; // Receipts and returns decrease customer balance
    } else {
      runningBalance += transaction.amount; // Sales increase customer balance
    }
    
    return {
      ...transaction,
      balance: runningBalance,
    };
  });

  // Calculate totals (now including GST)
  const totalSales = formattedSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalSaleReturns = formattedSaleReturns.reduce((sum, saleReturn) => sum + saleReturn.amount, 0);
  const totalReceipts = formattedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const currentBalance = totalSales - totalSaleReturns - totalReceipts;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`${customer.name} - Ledger`}
          description={`View transactions and balance for ${customer.name}`}
        />
        <Separator />
        
        <CustomerIndividualLedgerClient 
          customer={customer}
          transactions={transactions}
          totalSales={totalSales}
          totalReturns={totalSaleReturns}
          totalReceipts={totalReceipts}
          currentBalance={currentBalance}
        />
      </div>
    </div>
  );
};

export default CustomerLedgerPage;
