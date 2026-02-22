import prismadb from "@/lib/prismadb";
import { PricingAttributeForm } from "./components/pricing-attribute-form";

const PricingAttributePage = async (
  props: {
    params: Promise<{ pricingAttributeId: string }>
  }
) => {
  const params = await props.params;
  const pricingAttribute = await prismadb.pricingAttribute.findUnique({
    where: {
      id: params.pricingAttributeId
    }
  });

  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PricingAttributeForm initialData={pricingAttribute} />
      </div>
    </div>
  );
}
 
export default PricingAttributePage;
