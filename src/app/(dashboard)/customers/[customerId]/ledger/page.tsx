import prismadb from "@/lib/prismadb";
import { SaleDetail, ReceiptDetail, TourPackageQuery } from "@prisma/client"; // Add TourPackageQuery to imports
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
    },
  });

  // Format transactions for display with proper typing
  const formattedSales = sales.map((sale: SaleDetail) => {
    // Calculate total including GST for each sale
    const gstAmount = sale.gstAmount || 0;
    const totalAmount = sale.salePrice + gstAmount;
    
    return {
      id: sale.id,
      date: sale.saleDate,
      type: "Sale",
      description: `Invoice ${sale.invoiceNumber || '#' + sale.id.substring(0, 8)}`,
      debit: totalAmount,
      credit: 0,
      balance: 0, // Will be calculated later
      status: sale.status,
      isInflow: false,
      amount: totalAmount, // Include GST in the amount
      baseAmount: sale.salePrice,
      gstAmount: gstAmount,
      reference: sale.invoiceNumber || '', // Add the missing reference property
    };
  });

  const formattedReceipts = receipts.map((receipt: ReceiptDetail) => ({
    id: receipt.id,
    date: receipt.receiptDate,
    type: "Receipt",
    description: `Receipt ${receipt.reference || '#' + receipt.id.substring(0, 8)}`,
    debit: 0,
    credit: receipt.amount,
    balance: 0, // Will be calculated later
    status: "completed",
    isInflow: true,
    amount: receipt.amount,
    reference: receipt.reference || '', // Add the missing reference property
  }));

  // Combine transactions and sort by date
  const allTransactions = [...formattedSales, ...formattedReceipts].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate opening balance and running balance
  let runningBalance = 0;
  const transactions = allTransactions.map(transaction => {
    if (transaction.isInflow) {
      runningBalance -= transaction.amount; // Receipts decrease customer balance
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
  const totalReceipts = formattedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const currentBalance = totalSales - totalReceipts;

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
          totalReceipts={totalReceipts}
          currentBalance={currentBalance}
        />
      </div>
    </div>
  );
};

export default CustomerLedgerPage;
