import { format } from "date-fns";
import prismadb from "@/lib/prismadb";
import { CustomerClient } from "./components/client";
import { CustomerColumn } from "./components/columns";
import { Customer } from "@prisma/client";

export default async function CustomersPage() {
  // Include the associatePartner in the query
  const customers = await prismadb.customer.findMany({
    include: {
      associatePartner: true // Make sure we include the associatePartner relation
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const formattedCustomers: CustomerColumn[] = customers.map((item: Customer & { associatePartner?: { name: string } | null }) => ({
    id: item.id,
    name: item.name,
    contact: item.contact || "N/A",
    email: item.email || "N/A",
    associatePartner: item.associatePartner?.name || "None", // Access name through the relation
    createdAt: format(item.createdAt, "MMMM do, yyyy"),
  }));
  
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <CustomerClient data={formattedCustomers} />
      </div>
    </div>
  );
}

