import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs";
import prismadb from "@/lib/prismadb";
import ProfitReport from "./components/profit-report";

export default async function ProfitReportPage() {
/*   const { userId } = auth();

  if (!userId) {
    redirect("/sign-in");
  } */

  // Fetch confirmed tour packages with their financial data
  const tourPackages = await prismadb.tourPackageQuery.findMany({
    where: {
      isFeatured: true, // Only fetch confirmed queries
    },
    include: {
      purchaseDetails: true,
      saleDetails: true,
      paymentDetails: true,
      receiptDetails: true,
      expenseDetails: {
        include: {
          expenseCategory: true,
        },
      },
      incomeDetails: {
        include: {
          incomeCategory: true,
        },
      },
      location: {
        select: {
          label: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch general expe`nses not associated with any tour package
  const generalExpenses = await prismadb.expenseDetail.findMany({
    where: {
      tourPackageQueryId: null, // This could be simplified to just: tourPackageQueryId: null
    },
    include: {
      expenseCategory: true,
      bankAccount: true,
      cashAccount: true,
    },
    orderBy: {
      expenseDate: 'desc',
    },
  });
  
  // Fetch general incomes not associated with any tour package
  const generalIncomes = await prismadb.incomeDetail.findMany({
    where: {
      tourPackageQueryId: null, // Only fetch incomes not associated with a tour package
    },
    include: {
      incomeCategory: true,
      bankAccount: true,
      cashAccount: true,
    },
    orderBy: {
      incomeDate: 'desc',
    },
  });

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Organization Profit Report</h2>
        </div>
        <ProfitReport 
          initialData={tourPackages} 
          generalExpenses={generalExpenses}
          generalIncomes={generalIncomes}
        />
      </div>
    </div>
  );
}

