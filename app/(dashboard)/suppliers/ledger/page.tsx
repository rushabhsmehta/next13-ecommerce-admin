import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SuppliersLedgerClient } from "./components/client";

const SuppliersLedgerPage = async () => {
  // Get all suppliers
  const suppliers = await prismadb.supplier.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // For each supplier, calculate purchases and payments
  const suppliersData = await Promise.all(
    suppliers.map(async (supplier) => {
      // Get purchases
      const purchases = await prismadb.purchaseDetail.findMany({
        where: {
          supplierId: supplier.id
        }
      });

      // Get payments
      const payments = await prismadb.paymentDetail.findMany({
        where: {
          supplierId: supplier.id
        }
      });

      // Calculate totals
      const totalPurchases = purchases.reduce((sum, p) => sum + p.price, 0);
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
      
      return {
        id: supplier.id,
        name: supplier.name,
        contact: supplier.contact || "-",
        totalPurchases,
        totalPayments,
        balance: totalPurchases - totalPayments,
      };
    })
  );

  // Calculate overall totals
  const overallTotalPurchases = suppliersData.reduce((sum, s) => sum + s.totalPurchases, 0);
  const overallTotalPayments = suppliersData.reduce((sum, s) => sum + s.totalPayments, 0);
  const overallBalance = overallTotalPurchases - overallTotalPayments;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Supplier Statements" 
          description="View financial summaries for all suppliers"
        />
        <Separator />
        
        <SuppliersLedgerClient 
          suppliers={suppliersData}
          totalPurchases={overallTotalPurchases}
          totalPayments={overallTotalPayments}
          totalBalance={overallBalance}
        />
      </div>
    </div>
  );
};

export default SuppliersLedgerPage;
