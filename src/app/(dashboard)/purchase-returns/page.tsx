import { getPurchaseReturns } from "@/actions/get-purchase-returns";
import { Heading } from "@/components/ui/heading";
import { PurchaseReturnClient } from "./components/client";

export const metadata = {
  title: "Purchase Returns",
  description: "Manage purchase returns",
};

export default async function PurchaseReturnsPage() {
  const purchaseReturns = await getPurchaseReturns();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <Heading
          title="Purchase Returns"
          description="Manage your purchase returns"
        />
        <PurchaseReturnClient data={purchaseReturns} />
      </div>
    </div>
  );
}
