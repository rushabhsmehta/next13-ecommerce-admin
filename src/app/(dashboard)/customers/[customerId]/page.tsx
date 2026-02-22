import prismadb from "@/lib/prismadb";

import { CustomerForm } from "./components/customer-form";

const CustomerPage = async (
  props: {
    params: Promise<{ customerId: string }>
  }
) => {
  const params = await props.params;
  const customer = await prismadb.customer.findUnique({
    where: {
      id: params.customerId
    }
  });

  // fetch associate partners
  const associatePartners = await prismadb.associatePartner
    .findMany({
      orderBy: {
        name: 'asc'
      }
    });


  return (
    <>
      <div className="flex flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <CustomerForm initialData={customer} associatePartners={associatePartners}  />
        </div>
      </div>

    </>
  );
}

export default CustomerPage;
