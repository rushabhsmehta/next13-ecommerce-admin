import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { CustomerLedgerClient } from "./components/client";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";

interface CustomerLedgerPageProps {
  params: {
    customerId: string;
  }
}

const CustomerLedgerPage = async ({ params }: CustomerLedgerPageProps) => {
  const customer = await prismadb.customer.findUnique({
    where: {
      id: params.customerId
    }
  });

  if (!customer) {
    return <div>Customer not found</div>;
  }

  // Get sales transactions
  const sales = await prismadb.saleDetail.findMany({
    where: {
      customerId: params.customerId
    },
    include: {
      tourPackageQuery: true
    },
    orderBy: {
      saleDate: 'desc'
    }
  });

  // Get receipt transactions
  const receipts = await prismadb.receiptDetail.findMany({
    where: {
      customerId: params.customerId
    },
    include: {
      tourPackageQuery: true,
      bankAccount: true,
      cashAccount: true
    },
    orderBy: {
      receiptDate: 'desc'
    }
  });

  // Format sales data
  const formattedSales = sales.map(sale => ({
    id: sale.id,
    date: format(sale.saleDate, 'MMMM d, yyyy'),
    amount: sale.salePrice,
    description: sale.description || "Sale",
    packageName: sale.tourPackageQuery?.tourPackageQueryName || "-",
    type: "SALE" as const
  }));

  // Format receipts data
  const formattedReceipts = receipts.map(receipt => ({
    id: receipt.id,
    date: format(receipt.receiptDate, 'MMMM d, yyyy'),
    amount: receipt.amount,
    description: receipt.note || "Receipt",
    packageName: receipt.tourPackageQuery?.tourPackageQueryName || "-",
    reference: receipt.reference || "-",
    paymentMode: receipt.bankAccount ? "Bank" : receipt.cashAccount ? "Cash" : "Unknown",
    account: receipt.bankAccount?.accountName || receipt.cashAccount?.accountName || "-",
    type: "RECEIPT" as const
  }));

  // Calculate totals and balance
  const totalSales = formattedSales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalReceipts = formattedReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const balance = totalSales - totalReceipts;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={`Ledger for ${customer.name}`} 
          description="View all financial transactions for this customer"
        />
        <Separator />
        
        <CustomerLedgerClient 
          customer={customer} 
          sales={formattedSales}
          receipts={formattedReceipts}
          totalSales={totalSales}
          totalReceipts={totalReceipts}
          balance={balance}
        />
      </div>
    </div>
  );
};

export default CustomerLedgerPage;
