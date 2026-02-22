import { getSales } from "@/actions/get-sales";
import { getTaxSlabs } from "@/actions/get-tax-slabs";
import { getUnitsOfMeasure } from "@/actions/get-units";
import { getCustomers } from "@/actions/get-customers";
import { SaleReturnForm } from "@/components/forms/sale-return-form";

export default async function SaleReturnCreatePage(
  props: {
    params: Promise<{ saleReturnId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const sales = await getSales();
  const taxSlabs = await getTaxSlabs();
  const units = await getUnitsOfMeasure();
  const customers = await getCustomers();

  // If saleId is provided in search params, pre-select that sale
  const saleId = searchParams?.saleId as string | undefined;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <SaleReturnForm
          sales={sales}
          taxSlabs={taxSlabs}
          units={units}
          customers={customers}
          selectedSaleId={saleId}
        />
      </div>
    </div>
  );
}
