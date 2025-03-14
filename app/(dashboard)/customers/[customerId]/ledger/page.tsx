import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
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

  // Format transactions for display
  const formattedSales = sales.map(sale => ({
    id: sale.id,
    date: sale.saleDate,
    type: "Sale",
    description: sale.description || sale.tourPackageQuery?.tourPackageQueryName || "Sale",
    amount: sale.salePrice,
    isInflow: false, // Sales are outflows from customer perspective (they owe us)
    reference: sale.id,
    packageId: sale.tourPackageQueryId,
    packageName: sale.tourPackageQuery?.tourPackageQueryName || "-",
  }));

  const formattedReceipts = receipts.map(receipt => ({
    id: receipt.id,
    date: receipt.receiptDate,
    type: "Receipt",
    description: receipt.note || "Receipt",
    amount: receipt.amount,
    isInflow: true, // Receipts are inflows from customer perspective (we receive money)
    reference: receipt.reference || receipt.id,
    paymentMode: receipt.bankAccount ? "Bank" : receipt.cashAccount ? "Cash" : "Unknown",
    accountName: receipt.bankAccount?.accountName || receipt.cashAccount?.accountName || "-",
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

  // Calculate totals
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
