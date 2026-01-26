import React from "react";
import prismadb from "@/lib/prismadb";
import { TourPackageQueryAccountingForm } from "./components/accounts-form";

const tourPackageQueryPage = async ({
  params
}: {
  params: { tourPackageQueryId: string }
}) => {
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      purchaseDetails:
      {
        include: {
          supplier: true
        }
      },
      saleDetails:
      {
        include: {
          customer: true,
          items: true,
        }
      },
      paymentDetails:
      {
        include: {
          supplier: true
        }
      },
      receiptDetails:
      {
        include: {
          customer: true,
        }
      },
      expenseDetails: true,
      incomeDetails: true, // Ensures income details are fetched
    }
  });

  const taxSlabs = await prismadb.taxSlab.findMany({
    where: { isActive: true },
    orderBy: { percentage: 'asc' }
  });

  const organization = await prismadb.organization.findFirst();

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackageQueryAccountingForm
            initialData={tourPackageQuery}
            taxSlabs={taxSlabs}
            organization={organization}
          />
        </div>
      </div>
    </>
  );
}

export default tourPackageQueryPage;