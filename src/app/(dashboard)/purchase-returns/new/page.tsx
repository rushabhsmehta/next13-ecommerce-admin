import { getPurchases } from "@/actions/get-purchases";
import { getTaxSlabs } from "@/actions/get-tax-slabs";
import { getUnitsOfMeasure } from "@/actions/get-units";
import { getSuppliers } from "@/actions/get-suppliers";
import { PurchaseReturnForm } from "@/components/forms/purchase-return-form";

export default async function PurchaseReturnCreatePage(
  props: {
    params: Promise<{ purchaseReturnId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }
) {
  const searchParams = await props.searchParams;
  const purchases = await getPurchases();
  const taxSlabs = await getTaxSlabs();
  const units = await getUnitsOfMeasure();
  const suppliers = await getSuppliers();

  // If purchaseId is provided in search params, pre-select that purchase
  const purchaseId = searchParams?.purchaseId as string | undefined;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PurchaseReturnForm
          purchases={purchases}
          taxSlabs={taxSlabs}
          units={units}
          suppliers={suppliers}
          selectedPurchaseId={purchaseId}
        />
      </div>
    </div>
  );
}
