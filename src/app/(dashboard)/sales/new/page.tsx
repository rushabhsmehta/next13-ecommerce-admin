import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { NewSaleForm } from "../components/new-sale-form";

const NewSalePage = async () => {
  // Get customers for the form
  const customers = await prismadb.customer.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // Get tour package queries for the form (optional)
  const tourPackageQueries = await prismadb.tourPackageQuery.findMany({
    where: {
      isFeatured : true
    },
    orderBy: {
      tourPackageQueryName: 'asc'
    }
  });
  
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Create New Sale" 
          description="Record a new sale transaction"
        />
        <Separator />
        <NewSaleForm 
          customers={customers}
          tourPackageQueries={tourPackageQueries}
        />
      </div>
    </div>
  );
};

export default NewSalePage;

