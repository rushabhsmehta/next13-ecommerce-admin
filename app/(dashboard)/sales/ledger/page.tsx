import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SaleLedgerClient } from "./components/client";

const SaleLedgerPage = async () => {
  // Get all customers
  const customers = await prismadb.customer.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  // Get all sale transactions with customer and tour package details
  const sales = await prismadb.saleDetail.findMany({
    include: {
      tourPackageQuery: true,
      customer: true
    },
    orderBy: {
      saleDate: 'desc'
    }
  });

  // Format sales data
  const formattedSales = sales.map(sale => ({
    id: sale.id,
    date: format(sale.saleDate, 'MMMM d, yyyy'),
    amount: sale.salePrice,
    description: sale.description || "Sale",
    packageName: sale.tourPackageQuery?.tourPackageQueryName || "-",
    customerName: sale.customer?.name || "Unknown Customer",
    customerContact: sale.customer?.contact || "-"
  }));

  // Calculate total sales
  const totalSales = formattedSales.reduce((sum, sale) => sum + sale.amount, 0);

  // Format customers for dropdown
  const formattedCustomers = customers.map(customer => ({
    id: customer.id,
    name: customer.name
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Sales Ledger" 
          description="View all sales transactions"
        />
        <Separator />
        
        <SaleLedgerClient 
          sales={formattedSales}
          customers={formattedCustomers}
          totalSales={totalSales}
        />
      </div>
    </div>
  );
};

export default SaleLedgerPage;
