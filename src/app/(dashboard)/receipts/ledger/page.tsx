import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { ReceiptLedgerClient } from "./components/client";

const ReceiptLedgerPage = async () => {
  // Get all customers
  const customers = await prismadb.customer.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  // Get all receipt transactions with customer and tour package details
  const receipts = await prismadb.receiptDetail.findMany({
    include: {
      tourPackageQuery: true,
      customer: true,
      bankAccount: true,
      cashAccount: true
    },
    orderBy: {
      receiptDate: 'desc'
    }
  });

  
  // Format receipts data
  const formattedReceipts = receipts.map(receipt => ({
    id: receipt.id,
    date: format(receipt.receiptDate, 'MMMM d, yyyy'),
    amount: receipt.amount,
    description: receipt.note || "Receipt",
    packageName: receipt.tourPackageQuery?.tourPackageQueryName || "-",
    customerName: receipt.customer?.name || "Unknown Customer",
    customerContact: receipt.customer?.contact || "-",
    reference: receipt.reference || "-",
    paymentMode: receipt.bankAccount ? "Bank" : receipt.cashAccount ? "Cash" : "Unknown",
    account: receipt.bankAccount?.accountName || receipt.cashAccount?.accountName || "-",
  }));

  // Calculate total receipts
  const totalReceipts = formattedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);

  // Format customers for dropdown
  const formattedCustomers = customers.map(customer => ({
    id: customer.id,
    name: customer.name
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Receipt Ledger" 
          description="View all receipt transactions"
        />
        <Separator />
        
        <ReceiptLedgerClient 
          receipts={formattedReceipts}
          customers={formattedCustomers}
          totalReceipts={totalReceipts}
        />
      </div>
    </div>
  );
};

export default ReceiptLedgerPage;

