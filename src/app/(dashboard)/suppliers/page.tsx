import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { SupplierColumn } from "./components/columns";
import { SupplierClient } from "./components/client";
import Navbar from "@/components/navbar";

const SuppliersPage = async () => {
  // Fetch suppliers with their locations
  const suppliers = await prismadb.supplier.findMany({
    include: {
      locations: {
        include: {
          location: {
            select: {
              id: true,
              label: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Get all locations for the filter dropdown
  const locations = await prismadb.location.findMany({
    orderBy: {
      label: 'asc'
    },
    select: {
      id: true,
      label: true
    }
  });
  
  const formattedSuppliers: SupplierColumn[] = suppliers.map((item) => ({
    id: item.id,
    name: item.name,
    contact: item.contact || "",
    email: item.email || "",
  //  balance: 0,
    locations: item.locations.map(loc => ({
      id: loc.location.id,
      label: loc.location.label
    })),
    createdAt: format(item.createdAt, 'MMMM d, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <SupplierClient data={formattedSuppliers} locations={locations} />
        </div>
      </div>
    </>
  );
};

export default SuppliersPage;

