import prismadb from "@/lib/prismadb";

import { Turret_Road } from "next/font/google";
import Navbar from "@/components/navbar";
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
    }
  });

  return (
    <>{/*       <Navbar /> */}


      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackageQueryAccountingForm
            initialData={tourPackageQuery}
          />
        </div>

        {/*  <div className="flex-1 space-y-4 p-8 pt-6">
      <TourPackageQueryDisplay
        data={tourPackageQuery}
        locations={locations}
        hotels={hotels}
      //    itineraries={[]}
      />
    </div> */}
      </div>

    </>
  );
}
export default tourPackageQueryPage;