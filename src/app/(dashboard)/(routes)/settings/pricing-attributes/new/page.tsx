import { PricingAttributeForm } from "../[pricingAttributeId]/components/pricing-attribute-form";

const NewPricingAttributePage = () => {
  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PricingAttributeForm initialData={null} />
      </div>
    </div>
  );
}
 
export default NewPricingAttributePage;
