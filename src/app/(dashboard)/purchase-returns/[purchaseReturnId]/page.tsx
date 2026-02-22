import prismadb from "@/lib/prismadb";
import { getTaxSlabs } from "@/actions/get-tax-slabs";
import { getUnitsOfMeasure } from "@/actions/get-units";
import { getSuppliers } from "@/actions/get-suppliers";
import { PurchaseReturnForm } from "@/components/forms/purchase-return-form";

export default async function PurchaseReturnPage(
  props: {
    params: Promise<{ purchaseReturnId: string }>;
  }
) {
  const params = await props.params;
  // Fetch purchase return by id
  const purchaseReturn = await prismadb.purchaseReturn.findUnique({
    where: {
      id: params.purchaseReturnId,
    },
    include: {
      purchaseDetail: {
        include: {
          supplier: true
        }
      },
      items: {
        include: {
          taxSlab: true,
          unitOfMeasure: true,
          purchaseItem: true
        }
      }
    },
  });

  const taxSlabs = await getTaxSlabs();
  const units = await getUnitsOfMeasure();
  const suppliers = await getSuppliers();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseReturnForm 
          initialData={purchaseReturn}
          taxSlabs={taxSlabs}
          units={units}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
