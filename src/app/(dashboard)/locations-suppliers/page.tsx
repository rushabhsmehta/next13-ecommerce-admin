import { LocationSupplierClient } from "./components/client";
import prismadb from "@/lib/prismadb";

const LocationSuppliersPage = async () => {
  // Get locations with associated suppliers
  const locations = await prismadb.location.findMany({
    include: {
      suppliers: {
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              contact: true,
              email: true
            }
          }
        }
      }
    },
    orderBy: {
      label: 'asc'  // Changed from 'name' to 'label' to match your schema
    }
  });

  // Get suppliers with associated locations
  const suppliers = await prismadb.supplier.findMany({
    include: {
      locations: {
        include: {
          location: {
            select: {
              id: true,
              label: true  // Changed from 'name' to 'label' to match your schema
            }
          }
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <LocationSupplierClient 
          locations={locations} 
          suppliers={suppliers} 
        />
      </div>
    </div>
  );
};

export default LocationSuppliersPage;
