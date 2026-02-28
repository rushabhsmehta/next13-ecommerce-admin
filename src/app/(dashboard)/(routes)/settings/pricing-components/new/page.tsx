import { PricingComponentForm } from "../[pricingComponentId]/components/pricing-component-form";

const NewPricingComponentPage = () => {
  return ( 
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <PricingComponentForm initialData={null} />
      </div>
    </div>
  );
}
 
export default NewPricingComponentPage;
