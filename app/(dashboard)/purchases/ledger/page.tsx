import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { PurchaseLedgerClient } from "./components/client";

const PurchaseLedgerPage = async () => {
  // Get all suppliers
  const suppliers = await prismadb.supplier.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  // Get all purchase transactions with supplier and tour package details
  const purchases = await prismadb.purchaseDetail.findMany({
    include: {
      tourPackageQuery: true,
      supplier: true
    },
    orderBy: {
      purchaseDate: 'desc'
    }
  });

  // Format purchases data
  const formattedPurchases = purchases.map(purchase => ({
    id: purchase.id,
    date: format(purchase.purchaseDate, 'MMMM d, yyyy'),
    amount: purchase.price,
    description: purchase.description || "Purchase",
    packageName: purchase.tourPackageQuery?.tourPackageQueryName || "-",
    supplierName: purchase.supplier?.name || "Unknown Supplier",
    supplierContact: purchase.supplier?.contact || "-"
  }));

  // Calculate total purchases
  const totalPurchases = formattedPurchases.reduce((sum, purchase) => sum + purchase.amount, 0);

  // Format suppliers for dropdown
  const formattedSuppliers = suppliers.map(supplier => ({
    id: supplier.id,
    name: supplier.name
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title="Purchase Ledger" 
          description="View all purchase transactions"
        />
        <Separator />
        
        <PurchaseLedgerClient 
          purchases={formattedPurchases}
          suppliers={formattedSuppliers}
          totalPurchases={totalPurchases}
        />
      </div>
    </div>
  );
};

export default PurchaseLedgerPage;
