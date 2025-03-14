import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SupplierLedgerClient } from "./components/client";

const SupplierLedgerPage = async () => {
  // Get all suppliers with necessary relations
  const suppliers = await prismadb.supplier.findMany({
    include: {
      purchaseDetails: {
        include: {
          tourPackageQuery: true
        }
      },
      paymentDetails: {
        include: {
          tourPackageQuery: true,
          bankAccount: true,
          cashAccount: true
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Format suppliers data
  const formattedSuppliers = suppliers.map(supplier => {
    // Calculate total purchases
    const totalPurchases = supplier.purchaseDetails.reduce((sum, purchase) => sum + purchase.price, 0);
    
    // Calculate total payments
    const totalPayments = supplier.paymentDetails.reduce((sum, payment) => sum + payment.amount, 0);
    
    // Calculate outstanding amount
    const outstanding = totalPurchases - totalPayments;
    
    return {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact || "-",
      email: supplier.email || "-",
      createdAt: format(supplier.createdAt, 'MMMM d, yyyy'),
      totalPurchases: totalPurchases,
      totalPayments: totalPayments,
      outstanding: outstanding,
      balance: outstanding
    };
  });

  // Calculate total metrics
  const totalPurchases = formattedSuppliers.reduce((sum, supplier) => sum + supplier.totalPurchases, 0);
  const totalPayments = formattedSuppliers.reduce((sum, supplier) => sum + supplier.totalPayments, 0);
  const totalOutstanding = formattedSuppliers.reduce((sum, supplier) => sum + supplier.outstanding, 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Supplier Ledger" 
          description="View all supplier accounts and transactions"
        />
        <Separator />
        
        <SupplierLedgerClient 
          suppliers={formattedSuppliers}
          totalPurchases={totalPurchases}
          totalPayments={totalPayments}
          totalOutstanding={totalOutstanding}
        />
      </div>
    </div>
  );
};

export default SupplierLedgerPage;
