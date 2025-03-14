import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CustomerLedgerClient } from "./components/client";

const CustomerLedgerPage = async () => {
  // Get all customers with their sales and receipts
  const customers = await prismadb.customer.findMany({
    include: {
      saleDetails: true,  // Updated relation name from sales to saleDetails
      receiptDetails: true,  // Updated relation name from receipts to receiptDetails
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  // Format customer data with calculated totals
  const formattedCustomers = customers.map(customer => {
    const totalSales = customer.saleDetails.reduce((sum, sale) => sum + sale.salePrice, 0);  // Changed from sale.amount to sale.salePrice
    const totalReceipts = customer.receiptDetails.reduce((sum, receipt) => sum + receipt.amount, 0);  // Updated from receipts to receiptDetails
    const balance = totalSales - totalReceipts;
    
    return {
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      totalSales,
      totalReceipts,
      balance,
    };
  });
  
  // Calculate overall totals
  const totalSales = formattedCustomers.reduce((sum, customer) => sum + customer.totalSales, 0);
  const totalReceipts = formattedCustomers.reduce((sum, customer) => sum + customer.totalReceipts, 0);
  const totalBalance = formattedCustomers.reduce((sum, customer) => sum + customer.balance, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Customer Ledger" 
          description="View customer balances and transactions"
        />
        <Separator />
        
        <CustomerLedgerClient 
          customers={formattedCustomers}
          totalSales={totalSales}
          totalReceipts={totalReceipts}
          totalBalance={totalBalance}
        />
      </div>
    </div>
  );
};

export default CustomerLedgerPage;
