import { format } from "date-fns";
import prismadb from "@/lib/prismadb";

// Updated imports to use supplier components
import { SupplierColumn } from "./components/columns";
// Assuming a SupplierClient similar to LocationClient exists:
import { SupplierClient } from "./components/client";
import Navbar from "@/components/navbar";

const SuppliersPage = async () => {
  const suppliers = await prismadb.supplier.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  const formattedSuppliers: SupplierColumn[] = suppliers.map((item) => ({
    id: item.id,
    name: item.name,
    contact: item.contact || "",
    email: item.email || "",
    balance: 0,
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <SupplierClient data={formattedSuppliers} />
        </div>
      </div>
    </>
  );
};

export default SuppliersPage;
