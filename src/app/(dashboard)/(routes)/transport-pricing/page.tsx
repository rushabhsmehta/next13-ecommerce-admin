import { format } from "date-fns";

import prismadb from "@/lib/prismadb";
import { formatPrice } from "@/lib/utils";
import { TransportPricing } from "@prisma/client";

import { TransportPricingClient } from "./components/client";

const TransportPricingPage = async () => {  const transportPricings = await prismadb.transportPricing.findMany({
    include: {
      location: true,
      vehicleType: true
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  const formattedTransportPricings = transportPricings.map((item: TransportPricing & { 
    location: { label: string },
    vehicleType: { name: string } | null
  }) => ({
    id: item.id,
    locationId: item.locationId,
    location: item.location.label,
    vehicleType: item.vehicleType ? item.vehicleType.name : 'N/A',
    transportType: item.transportType,
    price: formatPrice(item.price), // Removed toNumber() as item.price is likely already a number
    startDate: format(item.startDate, 'dd/MM/yyyy'),
    endDate: format(item.endDate, 'dd/MM/yyyy'),
    isActive: item.isActive,
    createdAt: format(item.createdAt, 'dd/MM/yyyy'),
  }));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TransportPricingClient data={formattedTransportPricings} />
      </div>
    </div>
  );
};

export default TransportPricingPage;