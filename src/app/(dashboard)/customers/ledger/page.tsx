import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CustomerLedgerClient } from "./components/client";
import { Customer, SaleDetail, ReceiptDetail } from "@prisma/client";

const CustomerLedgerPage = async () => {
  // Get all customers with necessary relations
  const customers = await prismadb.customer.findMany({
    include: {
      saleDetails: {
        include: {
          tourPackageQuery: true
        }
      },
      receiptDetails: {
        include: {
          tourPackageQuery: true,
          bankAccount: true,
          cashAccount: true
        }
      },
      associatePartner: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Format customers data
  const formattedCustomers = customers.map((customer) => {
    // Calculate total sales
    const totalSales = customer.saleDetails.reduce((sum, sale) => sum + sale.salePrice, 0);
    
    // Calculate total receipts
    const totalReceipts = customer.receiptDetails.reduce((sum, receipt) => sum + receipt.amount, 0);
    
    // Calculate outstanding amount
    const outstanding = totalSales - totalReceipts;
    
    return {
      id: customer.id,
      name: customer.name,
      contact: customer.contact || "-",
      email: customer.email || "-",
      associatePartner: customer.associatePartner?.name || "-",
      createdAt: format(customer.createdAt, 'MMMM d, yyyy'),
      totalSales: totalSales,
      totalReceipts: totalReceipts,
      outstanding: outstanding
    };
  });

  // Extract unique partner names from formatted customers for filtering
  const uniquePartners = Array.from(
    new Set(formattedCustomers.map(customer => customer.associatePartner).filter(name => name !== "-"))
  );

  // Calculate total metrics
  const totalSales = formattedCustomers.reduce((sum, customer) => sum + customer.totalSales, 0);
  const totalReceipts = formattedCustomers.reduce((sum, customer) => sum + customer.totalReceipts, 0);
  const totalOutstanding = formattedCustomers.reduce((sum, customer) => sum + customer.outstanding, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Statement of Customers Ledger" 
          description="View all customer accounts and transactions"
        />
        <Separator />
        
        <CustomerLedgerClient 
          customers={formattedCustomers}
          associatePartners={uniquePartners}
          totalSales={totalSales}
          totalReceipts={totalReceipts}
          totalOutstanding={totalOutstanding}
        />
      </div>
    </div>
  );
};

export default CustomerLedgerPage;

