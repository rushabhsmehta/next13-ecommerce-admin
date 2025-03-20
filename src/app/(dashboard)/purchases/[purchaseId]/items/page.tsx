import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import { PurchaseItemsForm } from "../../components/purchase-item-form";

const PurchaseItemsPage = async ({
  params
}: {
  params: { purchaseId: string }
}) => {
  // Get purchase with related details including items
  const purchase = await prismadb.purchaseDetail.findUnique({
    where: {
      id: params.purchaseId,
    },
    include: {
      supplier: true,
      tourPackageQuery: true,
      items: {
        include: {
          unitOfMeasure: true,
          taxSlab: true
        }
      }
    }
  });

  if (!purchase) {
    return notFound();
  }

  // Get tax slabs for the form
  const taxSlabs = await prismadb.taxSlab.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  // Get units of measure for the form
  const units = await prismadb.unitOfMeasure.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading 
          title={purchase.items && purchase.items.length > 0 ? "Edit Purchase Items" : "Add Purchase Items"} 
          description={`Manage items for purchase to ${purchase.supplier?.name || "supplier"}`} 
        />
        <Separator />
        <PurchaseItemsForm 
          initialData={purchase} 
          taxSlabs={taxSlabs}
          units={units}
        />
      </div>
    </div>
  );
}

export default PurchaseItemsPage;
