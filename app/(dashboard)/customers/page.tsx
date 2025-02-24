import { format } from "date-fns";

import prismadb from "@/lib/prismadb";

import { CustomerColumn } from "./components/columns"
import { CustomerClient } from "./components/client";
import Navbar from "@/components/navbar";

const CustomersPage = async () => {
  const customers = await prismadb.customer.findMany({
    include: {
      associatePartner: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedCustomers: CustomerColumn[] = customers.map((item) => ({
    id: item.id,
    name: item.name,
    contact: item.contact || "",
    email: item.email || "",
    associatePartner: item.associatePartner?.name || 'None',
    createdAt: format(item.createdAt, 'MMMM do, yyyy'),
  }));

  return (
    <>
      {/*       <Navbar /> */}
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <CustomerClient data={formattedCustomers} />
        </div>
      </div>
    </>
  );
};

export default CustomersPage;
