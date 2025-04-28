import { SaleLedgerClient } from "./components/client";
import { format } from "date-fns";
import prismadb from "@/lib/prismadb";

const SalesPage = async () => {
  // Fetch sales from database using SaleDetail model
  const sales = await prismadb.saleDetail.findMany({
    include: {
      customer: true,
      tourPackageQuery: true,
      items: {
        include: {
          taxSlab: true,
        }
      }
    },
    orderBy: {
      saleDate: 'desc',
    },
  });

  // Fetch all customers for filtering
  const customers = await prismadb.customer.findMany({
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
    }
  });
  // Transform data for the table component

  const formattedSales = sales.map((item: any) => {
    // Format items if they exist
    let formattedItems = [];
    if (item.items && item.items.length > 0) {
      formattedItems = item.items.map((itemDetail: any) => ({
        productName: itemDetail.productName,
        quantity: itemDetail.quantity,
        pricePerUnit: itemDetail.pricePerUnit,
        totalAmount: itemDetail.totalAmount,
      }));
    }
    
    return {
      id: item.id,
      date: format(item.saleDate, 'MMMM do, yyyy'),
      amount: item.salePrice,
      customerName: item.customer?.name || "Guest Customer",
      customerContact: item.customer?.contact || "N/A",
      packageName: item.tourPackageQuery?.tourPackageQueryName || "",
      description: item.description || "",
      gstAmount: item.gstAmount || 0,
      gstPercentage: item.gstPercentage || 0,
      items: formattedItems,
    };
  });

  // Calculate totals
  const totalSales = sales.reduce((sum: number, item: any) => sum + item.salePrice, 0);
  const totalGst = sales.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SaleLedgerClient 
          sales={formattedSales} 
          customers={customers}
          totalSales={totalSales}
          totalGst={totalGst}
        />
      </div>
    </div>
  );
};

export default SalesPage;

