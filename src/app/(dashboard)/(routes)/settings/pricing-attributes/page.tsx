import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { PricingAttributesClient } from "./components/client";

const PricingAttributesPage = async () => {
  const pricingAttributes = await prismadb.pricingAttribute.findMany({
    orderBy: {
      sortOrder: 'asc',
    },
  });
  const formattedPricingAttributes = pricingAttributes.map((item) => ({
    id: item.id,
    name: item.name,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    isDefault: item.isDefault,
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <PricingAttributesClient data={formattedPricingAttributes} />
      </div>
    </div>
  );
};

export default PricingAttributesPage;
