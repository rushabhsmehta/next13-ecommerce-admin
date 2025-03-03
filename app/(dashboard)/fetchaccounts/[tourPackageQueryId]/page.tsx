import prismadb from "@/lib/prismadb";

import { TourPackageQueryDisplay } from "./components/fetchaccounts";
import Navbar from "@/components/navbar";

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
      purchaseDetails: {
        include: {
          supplier: true
        }
      },
      saleDetails: {
        include: {
          customer: true
        }
      },
      paymentDetails: {
        include: {
          supplier: true,
          bankAccount: true,
          cashAccount: true
        }
      },
      receiptDetails: {
        include: {
          customer: true,
          bankAccount: true,
          cashAccount: true
        }
      },
      expenseDetails: {
        include: {
          bankAccount: true,
          cashAccount: true
        }
      },
    }
  });

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <TourPackageQueryDisplay
            initialData={tourPackageQuery}
          />
        </div>
      </div>
    </>
  );
}

export default tourPackageQueryPage;
