import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SupplierLedgerClient } from "./components/client";

const SupplierLedgerPage = async () => {
  // Get all suppliers with their purchases and payments
  const suppliers = await prismadb.supplier.findMany({
    include: {
      purchases: true,
      payments: true,
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  // Format supplier data with calculated totals
  const formattedSuppliers = suppliers.map(supplier => {
    const totalPurchases = supplier.purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
    const totalPayments = supplier.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const balance = totalPurchases - totalPayments;
    
    return {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact,
      totalPurchases,
      totalPayments,
      balance,
    };
  });
  
  // Calculate overall totals
  const totalPurchases = formattedSuppliers.reduce((sum, supplier) => sum + supplier.totalPurchases, 0);
  const totalPayments = formattedSuppliers.reduce((sum, supplier) => sum + supplier.totalPayments, 0);
  const totalBalance = formattedSuppliers.reduce((sum, supplier) => sum + supplier.balance, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Supplier Ledger" 
          description="View supplier balances and transactions"
        />
        <Separator />
        
        <SupplierLedgerClient 
          suppliers={formattedSuppliers}
          totalPurchases={totalPurchases}
          totalPayments={totalPayments}
          totalBalance={totalBalance}
        />
      </div>
    </div>
  );
};

export default SupplierLedgerPage;
