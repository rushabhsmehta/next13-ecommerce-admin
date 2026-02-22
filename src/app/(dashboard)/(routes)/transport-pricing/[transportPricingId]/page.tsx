import { redirect } from "next/navigation";

import prismadb from "@/lib/prismadb";
import { TransportPricingForm } from "./components/transport-pricing-form";

interface TransportPricingPageProps {
  params: {
    transportPricingId: string;
  };
}

const TransportPricingPage: React.FC<TransportPricingPageProps> = async props => {
  const params = await props.params;
  // Fetch the transport pricing entry by ID  
  const transportPricing = await prismadb.transportPricing.findUnique({
    where: {
      id: params.transportPricingId
    }
  });

  // If transport pricing doesn't exist, redirect to transport pricing list
  if (!transportPricing) {
    redirect("/transport-pricing");
  }
  // Fetch all locations for the location dropdown
  const locations = await prismadb.location.findMany({
    orderBy: {
      label: 'asc'
    }
  });

  // Fetch all vehicle types for the vehicle type dropdown
  const vehicleTypes = await prismadb.vehicleType.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TransportPricingForm 
          initialData={transportPricing}
          locations={locations}
          vehicleTypes={vehicleTypes}
        />
      </div>
    </div>
  );
};

export default TransportPricingPage;