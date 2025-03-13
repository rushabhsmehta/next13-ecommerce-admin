import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import TourPackageQueryDisplay from "./components/fetchaccounts";

interface TourPackageQueryPageProps {
  params: {
    tourPackageQueryId: string;
  };
}

const TourPackageQueryPage: React.FC<TourPackageQueryPageProps> = async ({
  params,
}) => {
  const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch the tour package query with all related data
  const tourPackageQuery = await prismadb.tourPackageQuery.findUnique({
    where: {
      id: params.tourPackageQueryId,
    },
    include: {
      purchaseDetails: {
        include: {
          supplier: true,
        },
        orderBy: {
          purchaseDate: 'desc',
        },
      },
      saleDetails: {
        include: {
          customer: true,
        },
        orderBy: {
          saleDate: 'desc',
        },
      },
      paymentDetails: {
        include: {
          supplier: true,
          bankAccount: true,
          cashAccount: true,
        },
        orderBy: {
          paymentDate: 'desc',
        },
      },
      receiptDetails: {
        include: {
          customer: true,
          bankAccount: true,
          cashAccount: true,
        },
        orderBy: {
          receiptDate: 'desc',
        },
      },
      expenseDetails: {
        include: {
          bankAccount: true,
          cashAccount: true,
          expenseCategory: true, // Include expense category relation
        },
        orderBy: {
          expenseDate: 'desc',
        },
      },
      incomeDetails: {
        include: {
          bankAccount: true,
          cashAccount: true,
          incomeCategory: true, // Include income category relation
        },
        orderBy: {
          incomeDate: 'desc',
        },
      },
    },
  });

  if (!tourPackageQuery) {
    redirect("/inquiries");
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TourPackageQueryDisplay initialData={tourPackageQuery} />
      </div>
    </div>
  );
};

export default TourPackageQueryPage;
