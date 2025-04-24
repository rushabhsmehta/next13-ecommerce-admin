import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { PricingComponentsClient } from "./components/client";

// Server component for pricing components page
const PricingComponentsPage = async () => {
  // Fetch all pricing components with their related pricing attributes
  const pricingComponents = await prismadb.pricingComponent.findMany({
    include: {
      pricingAttribute: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Format the data for the client component
  const formattedPricingComponents = pricingComponents.map((item) => ({
    id: item.id,
    pricingAttributeId: item.pricingAttributeId,
    attributeName: item.pricingAttribute?.name || "Unknown",
    price: item.price.toString(),
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PricingComponentsClient data={formattedPricingComponents} />
      </div>
    </div>
  );
};

export default PricingComponentsPage;
