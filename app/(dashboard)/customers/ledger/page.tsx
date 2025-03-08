import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { CustomersLedgerClient } from "./components/client";

const CustomersLedgerPage = async () => {
  // Get all customers
  const customers = await prismadb.customer.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // For each customer, calculate sales and receipts
  const customersData = await Promise.all(
    customers.map(async (customer) => {
      // Get sales
      const sales = await prismadb.saleDetail.findMany({
        where: {
          customerId: customer.id
        }
      });

      // Get receipts
      const receipts = await prismadb.receiptDetail.findMany({
        where: {
          customerId: customer.id
        }
      });

      // Calculate totals
      const totalSales = sales.reduce((sum, s) => sum + s.salePrice, 0);
      const totalReceipts = receipts.reduce((sum, r) => sum + r.amount, 0);
      
      return {
        id: customer.id,
        name: customer.name,
        contact: customer.contact || "-",
        totalSales,
        totalReceipts,
        balance: totalSales - totalReceipts,
      };
    })
  );

  // Calculate overall totals
  const overallTotalSales = customersData.reduce((sum, c) => sum + c.totalSales, 0);
  const overallTotalReceipts = customersData.reduce((sum, c) => sum + c.totalReceipts, 0);
  const overallBalance = overallTotalSales - overallTotalReceipts;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Customer Statements" 
          description="View financial summaries for all customers"
        />
        <Separator />
        
        <CustomersLedgerClient 
          customers={customersData}
          totalSales={overallTotalSales}
          totalReceipts={overallTotalReceipts}
          totalBalance={overallBalance}
        />
      </div>
    </div>
  );
};

export default CustomersLedgerPage;
