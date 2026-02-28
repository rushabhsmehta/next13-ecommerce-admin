import prismadb from "@/lib/prismadb";
import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { SaleItemsForm } from "../../components/sale-items-form";
import { notFound } from "next/navigation";

const SaleItemsPage = async (
  props: {
    params: Promise<{ saleId: string }>
  }
) => {
  const params = await props.params;
  // Get sale with related details including items
  const sale = await prismadb.saleDetail.findUnique({
    where: {
      id: params.saleId
    },
    include: {
      customer: true,
      tourPackageQuery: true,
      items: {
        include: {
          unitOfMeasure: true,
          taxSlab: true
        }
      }
    }
  });

  if (!sale) {
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
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading 
          title={sale.items && sale.items.length > 0 ? "Edit Sale Items" : "Add Sale Items"} 
          description={`Manage items for sale to ${sale.customer?.name || "customer"}`} 
        />
        <Separator />
        <SaleItemsForm 
          initialData={sale} 
          taxSlabs={taxSlabs}
          units={units}
        />
      </div>
    </div>
  );
}

export default SaleItemsPage;
