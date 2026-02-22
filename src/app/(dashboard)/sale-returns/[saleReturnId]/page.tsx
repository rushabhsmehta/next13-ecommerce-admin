import prismadb from "@/lib/prismadb";
import { getTaxSlabs } from "@/actions/get-tax-slabs";
import { getUnitsOfMeasure } from "@/actions/get-units";
import { getCustomers } from "@/actions/get-customers";
import { SaleReturnForm } from "@/components/forms/sale-return-form";

export default async function SaleReturnPage(
  props: {
    params: Promise<{ saleReturnId: string }>;
  }
) {
  const params = await props.params;
  // Fetch sale return by id
  const saleReturn = await prismadb.saleReturn.findUnique({
    where: {
      id: params.saleReturnId,
    },
    include: {
      saleDetail: {
        include: {
          customer: true
        }
      },
      items: {
        include: {
          taxSlab: true,
          unitOfMeasure: true,
          saleItem: true
        }
      }
    },
  });

  const taxSlabs = await getTaxSlabs();
  const units = await getUnitsOfMeasure();
  const customers = await getCustomers();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SaleReturnForm 
          initialData={saleReturn}
          taxSlabs={taxSlabs}
          units={units}
          customers={customers}
        />
      </div>
    </div>
  );
}
