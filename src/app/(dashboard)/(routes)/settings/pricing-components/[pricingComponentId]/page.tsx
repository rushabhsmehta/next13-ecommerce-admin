import prismadb from "@/lib/prismadb";
import { PricingComponentForm } from "./components/pricing-component-form";

const PricingComponentPage = async ({
  params
}: {
  params: { pricingComponentId: string }
}) => {
  const pricingComponent = await prismadb.pricingComponent.findUnique({
    where: {
      id: params.pricingComponentId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PricingComponentForm initialData={pricingComponent} />
      </div>
    </div>
  );
}
 
export default PricingComponentPage;
