import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { PurchaseForm } from "../components/purchase-form"; // Updated to use the new form

const NewPurchasePage = async () => {
  // Get suppliers for the form
  const suppliers = await prismadb.supplier.findMany({
    orderBy: {
      name: 'asc'
    }
  });

  // Get tour package queries for the form (optional)
  const tourPackages = await prismadb.tourPackageQuery.findMany({
    where: {
      isFeatured: true
    },
    orderBy: {
      tourPackageQueryName: 'asc'
    }
  });
  
  // Get tax slabs for the form
  const taxSlabs = await prismadb.taxSlab.findMany({
    orderBy: {
      percentage: 'asc'
    }
  });

  // Get units of measure for the form
  const units = await prismadb.unitOfMeasure.findMany({
    orderBy: {
      name: 'asc'
    }
  });
  
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title="Create New Purchase" 
          description="Record a new purchase transaction"
        />
        <Separator />
        <PurchaseForm 
          initialData={null}
          suppliers={suppliers}
          taxSlabs={taxSlabs}
          units={units}
        />
      </div>
    </div>
  );
};

export default NewPurchasePage;
