import { getSaleReturns } from "@/actions/get-sale-returns";
import { Heading } from "@/components/ui/heading";
import { SaleReturnClient } from "./components/client";

export const metadata = {
  title: "Sale Returns",
  description: "Manage sale returns",
};

export default async function SaleReturnsPage() {
  const saleReturns = await getSaleReturns();

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <Heading
          title="Sale Returns"
          description="Manage your sale returns"
        />
        <SaleReturnClient data={saleReturns} />
      </div>
    </div>
  );
}
