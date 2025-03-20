import { PurchaseLedgerClient } from "./components/client";
import { format } from "date-fns";
import prismadb from "@/lib/prismadb";

const PurchasesPage = async () => {
  try {
    // Fetch purchases from database using PurchaseDetail model
    const purchases = await prismadb.purchaseDetail.findMany({
      include: {
        supplier: true,
        tourPackageQuery: true,
        items: {
          include: {
            taxSlab: true,
          }
        }      
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    const suppliers = await prismadb.supplier.findMany({
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        contact: true,
      }
    });

    // Transform data for the table component
    const formattedPurchases = purchases.map((item : any) => ({
      id: item.id,
      date: format(item.purchaseDate, 'MMMM do, yyyy'),
      amount: item.price,
      description: item.description || "",
      packageName: item.tourPackageQuery?.tourPackageQueryName || "",
      supplierName: item.supplier?.name || "",
      supplierContact: item.supplier?.contact || "",
      gstAmount: item.gstAmount || 0,
      gstPercentage: item.gstPercentage || 0,
    }));

    // Transform suppliers to match the expected type (converting null to undefined)
    const formattedSuppliers = suppliers.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact || undefined // Convert null to undefined
    }));

    // Calculate totals
    const totalAmount = purchases.reduce((sum : any, item : any) => sum + item.price, 0);
    const totalGst = purchases.reduce((sum : any , item : any ) => sum + (item.gstAmount || 0), 0);

    return (
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <PurchaseLedgerClient 
            purchases={formattedPurchases}
            suppliers={formattedSuppliers}
            totalAmount={totalAmount}
            totalGst={totalGst}
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in PurchasesPage:", error);
    return (
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <h2 className="text-red-700 text-lg font-medium">Error loading purchase data</h2>
            <p className="text-red-600">Please check the server logs for more information.</p>
          </div>
        </div>
      </div>
    );
  }
};

export default PurchasesPage;

