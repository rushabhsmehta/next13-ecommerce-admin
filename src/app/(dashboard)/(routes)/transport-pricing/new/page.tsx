import { redirect } from "next/navigation";

import prismadb from "@/lib/prismadb";
import { TransportPricingForm } from "./components/transport-pricing-form";

const TransportPricingPage = async () => {
  // Fetch all locations for the location dropdown
  const locations = await prismadb.location.findMany({
    orderBy: {
      label: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TransportPricingForm 
          locations={locations}
        />
      </div>
    </div>
  );
};

export default TransportPricingPage;