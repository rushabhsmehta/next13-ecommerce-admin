import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { TaxSlabClient } from "./components/client";
import { TaxSlabColumn } from "./components/columns";

const TaxSlabsPage = async () => {
  const taxSlabs = await prismadb.taxSlab.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  
  const formattedTaxSlabs: TaxSlabColumn[] = taxSlabs.map((item) => ({
    id: item.id,
    name: item.name,
    percentage: item.percentage,
    description: item.description || "",
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TaxSlabClient data={formattedTaxSlabs} />
      </div>
    </div>
  );
};

export default TaxSlabsPage;

